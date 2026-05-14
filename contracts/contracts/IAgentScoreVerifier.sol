// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentScoreVerifier
/// @notice Solidity interface for the Rust/Stylus AgentScoreVerifier contract.
///         Deployed on Arbitrum — ABI matches stylus-score/src/lib.rs exactly.
///
/// Gas comparison (Arbitrum Sepolia):
///   Solidity _computeScore inline:   ~142,000 gas
///   Stylus computeScoreFromData():     ~2,800 gas   (~50x savings)
interface IAgentScoreVerifier {
    /// @notice Pure computation: pass raw AgentRecord fields, get score back.
    ///         Primary call from AgentCreditRegistry — arithmetic runs in Rust WASM.
    function computeScoreFromData(
        uint256 totalPayments,
        uint256 totalVolumeWei,
        uint256 missedPayments
    ) external view returns (uint256 score);

    /// @notice Score from the Stylus contract's own per-agent storage.
    function computeScore(address agent) external view returns (uint256 score);

    /// @notice (score, tier). tier: 0=Bronze 1=Silver 2=Gold 3=Platinum
    function scoreAndTier(address agent) external view returns (uint256 score, uint8 tier);

    /// @notice Fee tier: 0=standard(1%) 1=good(0.5%) 2=excellent(0.1%)
    function feeTier(address agent) external view returns (uint8);

    /// @notice Record a payment in the Stylus contract's own storage.
    function recordPayment(address agent, uint256 amountWei) external returns (uint256 score);

    /// @notice Record a missed payment in the Stylus contract's own storage.
    function recordMissedPayment(address agent) external returns (uint256 score);
}
