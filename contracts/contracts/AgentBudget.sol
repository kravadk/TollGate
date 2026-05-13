// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentBudget
/// @notice Per-agent on-chain spending policy: daily limits, per-tx caps, allowlists, pause.
///         The gateway calls `checkAndSpend` before processing each payment; if it reverts the
///         payment is blocked. Owner = the entity that deployed or was assigned ownership.
///         Inspired by EqualFi's Agent Wallet Core (won $25K) and AegisPay-Agent pattern.
contract AgentBudget {
    struct Policy {
        uint256 dailyLimitWei;    // max spend per 24h window (0 = unlimited)
        uint256 maxPerTxWei;      // max per single payment (0 = unlimited)
        bool    paused;           // emergency stop
        bool    exists;
        uint64  windowStart;      // Unix timestamp when current 24h window began
        uint256 spentThisWindow;  // accumulated spend in current window
    }

    address public owner;
    // agentId (bytes32 hash of string) => policy
    mapping(bytes32 => Policy) private _policies;

    event PolicySet(bytes32 indexed agentKey, uint256 dailyLimitWei, uint256 maxPerTxWei);
    event Paused(bytes32 indexed agentKey);
    event Unpaused(bytes32 indexed agentKey);
    event SpendRecorded(bytes32 indexed agentKey, uint256 amount, uint256 spentThisWindow);

    error NotOwner();
    error AgentPaused(bytes32 agentKey);
    error ExceedsMaxPerTx(uint256 amount, uint256 maxPerTxWei);
    error ExceedsDailyLimit(uint256 amount, uint256 remaining);
    error PolicyNotFound(bytes32 agentKey);

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }

    constructor() { owner = msg.sender; }

    function _agentKey(string calldata agentId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(agentId));
    }

    /// @notice Set or update a policy for an agent. Only owner.
    function setPolicy(string calldata agentId, uint256 dailyLimitWei, uint256 maxPerTxWei) external onlyOwner {
        bytes32 key = _agentKey(agentId);
        Policy storage p = _policies[key];
        p.dailyLimitWei = dailyLimitWei;
        p.maxPerTxWei = maxPerTxWei;
        p.exists = true;
        if (p.windowStart == 0) p.windowStart = uint64(block.timestamp);
        emit PolicySet(key, dailyLimitWei, maxPerTxWei);
    }

    /// @notice Pause an agent. Reverts all payments until unpaused.
    function pause(string calldata agentId) external onlyOwner {
        bytes32 key = _agentKey(agentId);
        _policies[key].paused = true;
        emit Paused(key);
    }

    /// @notice Unpause an agent.
    function unpause(string calldata agentId) external onlyOwner {
        bytes32 key = _agentKey(agentId);
        _policies[key].paused = false;
        emit Unpaused(key);
    }

    /// @notice Check policy and record spend. Reverts if any limit is violated.
    ///         Called by gateway/relayer before each payment.
    function checkAndSpend(string calldata agentId, uint256 amountWei) external {
        bytes32 key = _agentKey(agentId);
        Policy storage p = _policies[key];
        // No policy = allow (open by default)
        if (!p.exists) return;
        if (p.paused) revert AgentPaused(key);
        if (p.maxPerTxWei > 0 && amountWei > p.maxPerTxWei) revert ExceedsMaxPerTx(amountWei, p.maxPerTxWei);

        // Reset window if 24h has elapsed
        if (block.timestamp >= p.windowStart + 1 days) {
            p.windowStart = uint64(block.timestamp);
            p.spentThisWindow = 0;
        }

        if (p.dailyLimitWei > 0) {
            uint256 remaining = p.dailyLimitWei - p.spentThisWindow;
            if (amountWei > remaining) revert ExceedsDailyLimit(amountWei, remaining);
        }

        unchecked { p.spentThisWindow += amountWei; }
        emit SpendRecorded(key, amountWei, p.spentThisWindow);
    }

    /// @notice Read current policy + spend state.
    function getPolicy(string calldata agentId) external view returns (
        uint256 dailyLimitWei,
        uint256 maxPerTxWei,
        bool paused,
        bool exists,
        uint256 spentThisWindow,
        uint256 remainingToday
    ) {
        bytes32 key = _agentKey(agentId);
        Policy memory p = _policies[key];
        uint256 spent = (block.timestamp >= p.windowStart + 1 days) ? 0 : p.spentThisWindow;
        uint256 rem = (p.dailyLimitWei > 0 && p.dailyLimitWei > spent) ? p.dailyLimitWei - spent : type(uint256).max;
        return (p.dailyLimitWei, p.maxPerTxWei, p.paused, p.exists, spent, rem);
    }
}
