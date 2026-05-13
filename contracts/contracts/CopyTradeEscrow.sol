// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title CopyTradeEscrow
/// @notice ERC-8183 compliant copy-trading escrow for ArcMind.
///         Copy-traders stake USDC; ArcMind allocates capital and settles PnL.
///         An autonomous kill switch closes all positions if drawdown exceeds the threshold.
///
///         Deployed on Arc L1 testnet (chainId 5042002).
///         USDC is the native gas token and settlement currency on Arc.
contract CopyTradeEscrow {

    struct Position {
        address trader;
        uint256 stakeUsdc;   // initial stake in USDC (6 decimals)
        uint256 entryTs;     // block.timestamp when position opened
        uint256 peakUsdc;    // highest value reached (for drawdown calc)
        bool    paused;      // true after kill switch fires for this position
    }

    struct SettlementRecord {
        address trader;
        uint256 stakeUsdc;
        int256  pnlUsdc;     // positive = profit, negative = loss
        uint256 returnedUsdc;
        uint256 settledAt;
    }

    address public immutable operator;  // ArcMind wallet — can settle and trigger kill switch
    address public immutable usdc;      // USDC contract on Arc L1
    uint16  public killThresholdBps;    // default 1500 = 15%
    uint16  public performanceFeeBps;   // default 500 = 5%

    mapping(address => Position)     private _positions;
    SettlementRecord[]               private _settlements;
    uint256 public totalStaked;
    uint256 public totalSettled;
    bool    public globalKillSwitch;

    event Staked(address indexed trader, uint256 amount, uint256 ts);
    event Settled(address indexed trader, int256 pnl, uint256 returned, uint256 fee);
    event KillSwitchTriggered(address indexed trader, uint256 drawdownBps, uint256 ts);
    event GlobalKillSwitch(uint256 ts, string reason);

    error AlreadyStaked(address trader);
    error NoPosition(address trader);
    error NotOperator(address caller);
    error AlreadyPaused(address trader);
    error GlobalHalt();
    error InsufficientAmount();
    error TransferFailed();

    constructor(address _usdc, uint16 _killThresholdBps, uint16 _performanceFeeBps) {
        operator          = msg.sender;
        usdc              = _usdc;
        killThresholdBps  = _killThresholdBps == 0 ? 1500 : _killThresholdBps;
        performanceFeeBps = _performanceFeeBps == 0 ? 500  : _performanceFeeBps;
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator(msg.sender);
        _;
    }

    modifier notHalted() {
        if (globalKillSwitch) revert GlobalHalt();
        _;
    }

    /// @notice Open a copy-trade position. Caller must approve USDC first.
    function stake(uint256 amount) external notHalted {
        if (amount == 0) revert InsufficientAmount();
        if (_positions[msg.sender].stakeUsdc != 0) revert AlreadyStaked(msg.sender);

        bool ok = IERC20(usdc).transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        _positions[msg.sender] = Position({
            trader:    msg.sender,
            stakeUsdc: amount,
            entryTs:   block.timestamp,
            peakUsdc:  amount,
            paused:    false
        });

        totalStaked += amount;
        emit Staked(msg.sender, amount, block.timestamp);
    }

    /// @notice Settle a position with realised PnL. Only operator (ArcMind) can call.
    function settle(address trader, int256 pnlUsdc) external onlyOperator {
        Position storage pos = _positions[trader];
        if (pos.stakeUsdc == 0) revert NoPosition(trader);

        uint256 gross;
        uint256 fee = 0;

        if (pnlUsdc >= 0) {
            uint256 profit = uint256(pnlUsdc);
            fee   = (profit * performanceFeeBps) / 10_000;
            gross = pos.stakeUsdc + profit - fee;
        } else {
            uint256 loss = uint256(-pnlUsdc);
            gross = pos.stakeUsdc > loss ? pos.stakeUsdc - loss : 0;
        }

        if (gross > 0) {
            bool ok = IERC20(usdc).transfer(trader, gross);
            if (!ok) revert TransferFailed();
        }
        if (fee > 0) {
            bool ok2 = IERC20(usdc).transfer(operator, fee);
            if (!ok2) revert TransferFailed();
        }

        _settlements.push(SettlementRecord({
            trader:       trader,
            stakeUsdc:    pos.stakeUsdc,
            pnlUsdc:      pnlUsdc,
            returnedUsdc: gross,
            settledAt:    block.timestamp
        }));

        totalSettled += gross;
        delete _positions[trader];
        emit Settled(trader, pnlUsdc, gross, fee);
    }

    /// @notice Kill switch for a single trader — returns remaining capital immediately.
    function killSwitch(address trader, uint256 drawdownBps) external onlyOperator {
        Position storage pos = _positions[trader];
        if (pos.stakeUsdc == 0) revert NoPosition(trader);
        if (pos.paused) revert AlreadyPaused(trader);

        pos.paused = true;
        uint256 loss      = pos.stakeUsdc * drawdownBps / 10_000;
        uint256 remaining = pos.stakeUsdc > loss ? pos.stakeUsdc - loss : 0;

        if (remaining > 0) {
            bool ok = IERC20(usdc).transfer(trader, remaining);
            if (!ok) revert TransferFailed();
        }

        delete _positions[trader];
        emit KillSwitchTriggered(trader, drawdownBps, block.timestamp);
    }

    /// @notice Halt all new stakes globally.
    function triggerGlobalKillSwitch(string calldata reason) external onlyOperator {
        globalKillSwitch = true;
        emit GlobalKillSwitch(block.timestamp, reason);
    }

    function getPosition(address trader) external view returns (Position memory) {
        return _positions[trader];
    }

    function getSettlementCount() external view returns (uint256) {
        return _settlements.length;
    }

    function getSettlement(uint256 index) external view returns (SettlementRecord memory) {
        return _settlements[index];
    }
}
