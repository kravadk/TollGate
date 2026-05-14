// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentVault
/// @notice A minimal, AI-callable vault on Mantle for the AgentPay Router "agent
///         economy loop". An agent parks its x402 surplus here (`deposit`), and an
///         AI agent can call `deployToYield(amount, strategyRef)` to mark capital as
///         allocated to a yield strategy (mETH on Mantle mainnet) — and `unwind` to
///         pull it back. `recordDecision` anchors every agent decision on-chain
///         (on-chain benchmarking), and `withdraw` returns idle balance to the agent.
/// @dev    No owner, no admin, no pausing. On Mantle mainnet `yieldToken` is set to
///         mETH; in the demo build it is the zero address and `deployToYield` is
///         intent + accounting only (no external swap), which keeps the contract
///         self-contained. Native balance held == sum(balanceOf) + sum(deployedOf).
contract AgentVault {
    /// The yield token this vault routes into (mETH on Mantle mainnet, or zero in the demo).
    address public immutable yieldToken;

    /// Idle native balance per agent (deposited, not yet deployed).
    mapping(address => uint256) public balanceOf;
    /// Native amount per agent currently marked as deployed into the yield strategy.
    mapping(address => uint256) public deployedOf;

    uint256 public totalDeployed;
    uint256 public decisionCount;

    event Deposited(address indexed agent, uint256 amount, uint256 idleBalance);
    event Withdrawn(address indexed agent, uint256 amount, uint256 idleBalance);
    event DeployedToYield(address indexed agent, uint256 amount, bytes32 strategyRef, address yieldToken, uint256 deployedBalance);
    event Unwound(address indexed agent, uint256 amount, bytes32 strategyRef, uint256 deployedBalance);
    event DecisionRecorded(address indexed agent, uint256 indexed seq, bytes32 decisionHash, bytes32 contextHash, uint64 timestamp);

    error ZeroAmount();
    error InsufficientIdle(uint256 requested, uint256 available);
    error InsufficientDeployed(uint256 requested, uint256 available);
    error EmptyDecisionHash();
    error TransferFailed();

    constructor(address yieldToken_) {
        yieldToken = yieldToken_; // may be address(0) in the demo build
    }

    /// @notice Deposit native MNT into the vault as the caller agent's idle balance.
    function deposit() external payable {
        _credit(msg.sender, msg.value);
    }

    /// @notice AI-callable: mark `amount` of the caller agent's idle balance as deployed
    ///         into the yield strategy, tagged with `strategyRef` (e.g. a strategy hash).
    function deployToYield(uint256 amount, bytes32 strategyRef) external {
        uint256 idle = balanceOf[msg.sender];
        if (amount == 0) revert ZeroAmount();
        if (amount > idle) revert InsufficientIdle(amount, idle);
        balanceOf[msg.sender] = idle - amount;
        uint256 dep = deployedOf[msg.sender] + amount;
        deployedOf[msg.sender] = dep;
        totalDeployed += amount;
        if (_firstDeployBlock[msg.sender] == 0) _firstDeployBlock[msg.sender] = uint32(block.number);
        emit DeployedToYield(msg.sender, amount, strategyRef, yieldToken, dep);
    }

    /// @notice Pull `amount` back from the yield strategy into idle balance.
    function unwind(uint256 amount, bytes32 strategyRef) external {
        uint256 dep = deployedOf[msg.sender];
        if (amount == 0) revert ZeroAmount();
        if (amount > dep) revert InsufficientDeployed(amount, dep);
        deployedOf[msg.sender] = dep - amount;
        totalDeployed -= amount;
        balanceOf[msg.sender] += amount;
        emit Unwound(msg.sender, amount, strategyRef, dep - amount);
    }

    /// @notice Withdraw `amount` of idle native balance back to the caller agent.
    function withdraw(uint256 amount) external {
        uint256 idle = balanceOf[msg.sender];
        if (amount == 0) revert ZeroAmount();
        if (amount > idle) revert InsufficientIdle(amount, idle);
        balanceOf[msg.sender] = idle - amount;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount, idle - amount);
    }

    /// @notice On-chain benchmarking: anchor an agent decision (hash of the decision
    ///         and of its context). Returns the global sequence number.
    function recordDecision(bytes32 decisionHash, bytes32 contextHash) external returns (uint256 seq) {
        if (decisionHash == bytes32(0)) revert EmptyDecisionHash();
        seq = ++decisionCount;
        emit DecisionRecorded(msg.sender, seq, decisionHash, contextHash, uint64(block.timestamp));
    }

    /// @notice Idle + deployed for an agent.
    function positionOf(address agent) external view returns (uint256 idle, uint256 deployed) {
        return (balanceOf[agent], deployedOf[agent]);
    }

    // #19 Approximate yield earned: 3.9% APY on deployed balance since first deploy block.
    //     Informational only — no settlement or minting.
    uint256 private constant BLOCKS_PER_YEAR = 2_628_000; // ~12s average block time

    mapping(address => uint32) private _firstDeployBlock;

    function earnedYield(address agent) external view returns (uint256) {
        uint256 dep = deployedOf[agent];
        if (dep == 0) return 0;
        uint256 startBlock = _firstDeployBlock[agent];
        if (startBlock == 0 || block.number <= startBlock) return 0;
        uint256 blocksElapsed = block.number - startBlock;
        return dep * 39 * blocksElapsed / (1000 * BLOCKS_PER_YEAR);
    }

    receive() external payable {
        _credit(msg.sender, msg.value);
    }

    function _credit(address agent, uint256 amount) private {
        if (amount == 0) revert ZeroAmount();
        uint256 bal = balanceOf[agent] + amount;
        balanceOf[agent] = bal;
        emit Deposited(agent, amount, bal);
    }
}
