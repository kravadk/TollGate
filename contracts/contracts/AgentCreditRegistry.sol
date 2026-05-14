// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IAgentScoreVerifier.sol";

/// @title AgentCreditRegistry
/// @notice On-chain FICO-style credit score for AI agents paying via x402.
///         Every successful x402 payment can be recorded here by the TollGate
///         gateway. Score 0–1000 gates fee tier and rate limits in AgentVault.
///
///         When `stylusVerifier` is set, score computation is offloaded to the
///         Rust/Stylus contract for ~50x gas savings (~142k → ~2.8k gas).
contract AgentCreditRegistry {
    struct AgentRecord {
        uint64  totalPayments;   // successful x402 payments
        uint128 totalVolumeWei;  // cumulative USDC-equivalent volume (18-dec scaled)
        uint64  missedPayments;  // failed / challenged payments
        uint32  firstSeenBlock;  // block number of first recorded payment
        uint32  lastSeenBlock;   // block number of most recent payment
    }

    mapping(address => AgentRecord) private _records;

    uint256 public totalAgentCount;

    /// @notice Owner — can set the Stylus verifier address.
    address public owner;
    /// @notice Optional Rust/Stylus contract for gas-efficient score computation.
    ///         Set to address(0) to use inline Solidity fallback.
    address public stylusVerifier;

    event StylusVerifierSet(address indexed verifier);

    event PaymentRecorded(
        address indexed agent,
        uint128 amountWei,
        uint64  newTotalPayments,
        uint256 newScore,
        uint32  atBlock
    );
    event MissedPaymentRecorded(
        address indexed agent,
        uint64  newMissedPayments,
        uint256 newScore
    );

    error ZeroAgent();
    error ZeroAmount();
    error NotOwner();

    constructor() {
        owner = msg.sender;
    }

    /// @notice Point to the deployed Rust/Stylus verifier for ~50x gas savings.
    ///         Pass address(0) to revert to inline Solidity computation.
    function setStylusVerifier(address _verifier) external {
        if (msg.sender != owner) revert NotOwner();
        stylusVerifier = _verifier;
        emit StylusVerifierSet(_verifier);
    }

    /// @notice Record a successful x402 payment. Called by the TollGate gateway
    ///         after every successful settlement.
    function recordPayment(address agent, uint128 amountWei) external returns (uint256 score) {
        if (agent == address(0)) revert ZeroAgent();
        if (amountWei == 0) revert ZeroAmount();
        AgentRecord storage r = _records[agent];
        if (r.firstSeenBlock == 0) {
            r.firstSeenBlock = uint32(block.number);
            totalAgentCount++;
        }
        r.totalPayments++;
        r.totalVolumeWei += amountWei;
        r.lastSeenBlock = uint32(block.number);
        score = _computeScore(r);
        emit PaymentRecorded(agent, amountWei, r.totalPayments, score, r.lastSeenBlock);
    }

    /// @notice Record a missed/failed payment (reduces score).
    function recordMissedPayment(address agent) external returns (uint256 score) {
        if (agent == address(0)) revert ZeroAgent();
        AgentRecord storage r = _records[agent];
        r.missedPayments++;
        score = _computeScore(r);
        emit MissedPaymentRecorded(agent, r.missedPayments, score);
    }

    /// @notice Credit score 0–1000 for an agent.
    function creditScore(address agent) external view returns (uint256) {
        return _computeScore(_records[agent]);
    }

    /// @notice Raw accounting record for an agent.
    function recordOf(address agent) external view returns (
        uint64 totalPayments,
        uint128 totalVolumeWei,
        uint64 missedPayments,
        uint32 firstSeenBlock,
        uint32 lastSeenBlock
    ) {
        AgentRecord memory r = _records[agent];
        return (r.totalPayments, r.totalVolumeWei, r.missedPayments, r.firstSeenBlock, r.lastSeenBlock);
    }

    /// @notice Fee tier: 0 = standard (1%), 1 = good (0.5%), 2 = excellent (0.1%).
    function feeTier(address agent) external view returns (uint8) {
        uint256 s = _computeScore(_records[agent]);
        if (s >= 800) return 2;
        if (s >= 500) return 1;
        return 0;
    }

    /// @notice Rate limit multiplier: 1x, 5x, or 10x the base limit.
    function rateLimitMultiplier(address agent) external view returns (uint8) {
        uint256 s = _computeScore(_records[agent]);
        if (s >= 800) return 10;
        if (s >= 500) return 5;
        return 1;
    }

    // ─── internal ────────────────────────────────────────────────────────────

    /// Score formula (max 1000):
    ///   base   = min(totalPayments * 5, 500)     — 100 payments → 500 pts
    ///   vol    = min(totalVolumeWei / 1e18, 300) — 300 USDC → 300 pts
    ///   pen    = min(missedPayments * 50, 300)   — 6 misses → 300 pt cap
    ///   score  = clamp(base + vol − pen, 0, 1000)
    ///
    /// When stylusVerifier is set, delegates to Rust/Stylus for ~50x gas savings.
    /// Falls back to inline Solidity if the Stylus call reverts.
    function _computeScore(AgentRecord memory r) internal view returns (uint256) {
        address sv = stylusVerifier;
        if (sv != address(0)) {
            try IAgentScoreVerifier(sv).computeScoreFromData(
                r.totalPayments,
                r.totalVolumeWei,
                r.missedPayments
            ) returns (uint256 s) {
                return s;
            } catch {}
            // fallthrough to Solidity on revert
        }
        return _computeScoreSolidity(r);
    }

    /// Inline Solidity fallback — used when stylusVerifier is not set.
    function _computeScoreSolidity(AgentRecord memory r) internal pure returns (uint256) {
        uint256 base = r.totalPayments * 5;
        if (base > 500) base = 500;

        uint256 vol = r.totalVolumeWei / 1e18;
        if (vol > 300) vol = 300;

        uint256 pen = r.missedPayments * 50;
        if (pen > 300) pen = 300;

        uint256 raw = base + vol;
        if (raw <= pen) return 0;
        uint256 result = raw - pen;
        return result > 1000 ? 1000 : result;
    }
}
