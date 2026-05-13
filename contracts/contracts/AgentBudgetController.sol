// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentBudgetController
/// @notice On-chain spend limits for AI agents interacting with TollGate x402 services.
///         Any address can set a budget for an agent wallet it controls.
///         The TollGate gateway server calls checkAndSpend before unlocking a resource.
contract AgentBudgetController {
    struct Budget {
        uint128 dailyLimitCents;    // 1 USDC = 100 cents
        uint128 perRequestMaxCents;
        uint64  dayStart;           // unix timestamp of the current day window start
        uint128 spentToday;
        bool    autoPay;
        bytes32 allowlistRoot;      // Merkle root of allowed serviceIds (0 = all allowed)
    }

    mapping(address agent => Budget) public budgets;
    mapping(address agent => address owner) public budgetOwner;

    event BudgetSet(address indexed agent, uint128 dailyLimitCents, uint128 perRequestMaxCents, bool autoPay);
    event Spent(address indexed agent, uint128 amountCents, uint128 spentToday, uint128 dailyLimitCents);
    event DayReset(address indexed agent);

    error NotAuthorized();
    error BudgetExceeded(uint128 requested, uint128 remaining);
    error PerRequestExceeded(uint128 requested, uint128 maxAllowed);
    error NoBudgetSet();

    /// @notice Set or update a budget for an agent address.
    ///         Only the agent itself or the address that originally set the budget may update it.
    function setBudget(
        address agent,
        uint128 dailyLimitCents,
        uint128 perRequestMaxCents,
        bool autoPay,
        bytes32 allowlistRoot
    ) external {
        address existing = budgetOwner[agent];
        if (existing != address(0) && existing != msg.sender && agent != msg.sender) {
            revert NotAuthorized();
        }
        budgetOwner[agent] = msg.sender;
        Budget storage b = budgets[agent];
        b.dailyLimitCents = dailyLimitCents;
        b.perRequestMaxCents = perRequestMaxCents;
        b.autoPay = autoPay;
        b.allowlistRoot = allowlistRoot;
        b.dayStart = uint64(block.timestamp);
        b.spentToday = 0;
        emit BudgetSet(agent, dailyLimitCents, perRequestMaxCents, autoPay);
    }

    /// @notice Check if agent can spend amountCents and record the spend.
    ///         Reverts if budget is exceeded.
    function checkAndSpend(address agent, uint128 amountCents) external returns (bool ok) {
        Budget storage b = budgets[agent];
        if (b.dailyLimitCents == 0) revert NoBudgetSet();

        if (block.timestamp >= uint256(b.dayStart) + 1 days) {
            b.dayStart = uint64(block.timestamp);
            b.spentToday = 0;
            emit DayReset(agent);
        }

        if (b.perRequestMaxCents > 0 && amountCents > b.perRequestMaxCents) {
            revert PerRequestExceeded(amountCents, b.perRequestMaxCents);
        }

        uint128 remaining = b.dailyLimitCents > b.spentToday
            ? b.dailyLimitCents - b.spentToday
            : 0;

        if (amountCents > remaining) {
            revert BudgetExceeded(amountCents, remaining);
        }

        b.spentToday += amountCents;
        emit Spent(agent, amountCents, b.spentToday, b.dailyLimitCents);
        return true;
    }

    /// @notice View current budget state for an agent.
    function getBudget(address agent) external view returns (
        uint128 dailyLimitCents,
        uint128 perRequestMaxCents,
        uint128 spentToday,
        uint128 remainingToday,
        bool autoPay,
        bytes32 allowlistRoot,
        bool dayActive
    ) {
        Budget storage b = budgets[agent];
        dailyLimitCents = b.dailyLimitCents;
        perRequestMaxCents = b.perRequestMaxCents;
        autoPay = b.autoPay;
        allowlistRoot = b.allowlistRoot;
        dayActive = block.timestamp < uint256(b.dayStart) + 1 days;
        spentToday = dayActive ? b.spentToday : 0;
        remainingToday = dailyLimitCents > spentToday ? dailyLimitCents - spentToday : 0;
    }
}
