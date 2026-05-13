// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ERC-7683: Cross-Chain Intents Standard (IOriginSettler)
// https://eips.ethereum.org/EIPS/eip-7683
//
// TollGate + ERC-7683: agent signs intent on 0G → solver fills on Arbitrum
// → Stylus verifies score → 6s settlement via Espresso confirmations
//
// Used by: Affogato ($15.7K), Disburse ($10.2K), Coffee Chain ($5K)

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

struct OnchainCrossChainOrder {
    uint32  fillDeadline;
    bytes32 orderDataType;
    bytes   orderData;
}

struct ResolvedCrossChainOrder {
    address user;
    uint256 originChainId;
    uint32  openDeadline;
    uint32  fillDeadline;
    bytes32 orderId;
}

struct TollGateOrderData {
    string  serviceId;       // e.g. "svc_0g_inference"
    uint256 priceUsdcWei;    // USDC amount (6 decimals)
    address usdcToken;       // USDC contract on origin chain
    address filler;          // authorized solver address
    bytes32 agentId;         // bytes32-encoded agentId
}

interface IOriginSettler {
    event Open(bytes32 indexed orderId, ResolvedCrossChainOrder resolvedOrder);
    function open(OnchainCrossChainOrder calldata order) external;
    function resolve(OnchainCrossChainOrder calldata order) external view returns (ResolvedCrossChainOrder memory);
}

/// @title AgentIntentSettler
/// @notice ERC-7683 IOriginSettler for TollGate x402 cross-chain payments.
///         An agent locks USDC on origin chain; solver fills x402 on destination;
///         solver claims USDC. Supports Espresso fast finality (~6s).
contract AgentIntentSettler is IOriginSettler, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ORDER_DATA_TYPE = keccak256("TollGateOrderData");

    enum State { None, Open, Filled, Refunded }

    struct Intent {
        address           user;
        TollGateOrderData data;
        uint32            fillDeadline;
        bytes32           orderId;
        State             state;
    }

    mapping(bytes32 => Intent) private _intents;
    uint256 private _nonce;

    event IntentFilled(bytes32 indexed orderId, address indexed filler, string serviceId, uint256 priceUsdcWei);
    event IntentRefunded(bytes32 indexed orderId, address indexed user);

    error IntentNotOpen(bytes32 orderId);
    error NotFiller(bytes32 orderId);
    error FillDeadlinePassed(bytes32 orderId);
    error RefundTooEarly(bytes32 orderId);
    error UnknownOrderType(bytes32 got);

    // ── IOriginSettler ────────────────────────────────────────────────────────

    /// @notice Lock USDC collateral + emit Open (origin chain). Agent calls this.
    function open(OnchainCrossChainOrder calldata order) external override nonReentrant {
        if (order.orderDataType != ORDER_DATA_TYPE) revert UnknownOrderType(order.orderDataType);
        TollGateOrderData memory d = abi.decode(order.orderData, (TollGateOrderData));

        bytes32 orderId = keccak256(abi.encodePacked(msg.sender, _nonce++, block.chainid, block.timestamp));
        IERC20(d.usdcToken).safeTransferFrom(msg.sender, address(this), d.priceUsdcWei);

        _intents[orderId] = Intent({
            user: msg.sender,
            data: d,
            fillDeadline: order.fillDeadline,
            orderId: orderId,
            state: State.Open
        });

        emit Open(orderId, _resolve(msg.sender, orderId, order.fillDeadline));
    }

    /// @notice Solver calls after filling x402 on destination chain. Claims USDC.
    function fill(bytes32 orderId, bytes32 /*destinationReceiptHash*/) external nonReentrant {
        Intent storage intent = _intents[orderId];
        if (intent.state != State.Open)            revert IntentNotOpen(orderId);
        if (msg.sender != intent.data.filler)      revert NotFiller(orderId);
        if (block.timestamp > intent.fillDeadline) revert FillDeadlinePassed(orderId);

        intent.state = State.Filled;
        IERC20(intent.data.usdcToken).safeTransfer(msg.sender, intent.data.priceUsdcWei);
        emit IntentFilled(orderId, msg.sender, intent.data.serviceId, intent.data.priceUsdcWei);
    }

    /// @notice User refunds if solver didn't fill before deadline.
    function refund(bytes32 orderId) external nonReentrant {
        Intent storage intent = _intents[orderId];
        if (intent.state != State.Open)           revert IntentNotOpen(orderId);
        if (block.timestamp <= intent.fillDeadline) revert RefundTooEarly(orderId);
        intent.state = State.Refunded;
        IERC20(intent.data.usdcToken).safeTransfer(intent.user, intent.data.priceUsdcWei);
        emit IntentRefunded(orderId, intent.user);
    }

    function resolve(OnchainCrossChainOrder calldata order) external view override returns (ResolvedCrossChainOrder memory) {
        bytes32 orderId = keccak256(abi.encodePacked(msg.sender, _nonce, block.chainid, block.timestamp));
        return _resolve(msg.sender, orderId, order.fillDeadline);
    }

    function getIntent(bytes32 orderId) external view returns (Intent memory) {
        return _intents[orderId];
    }

    function _resolve(address user, bytes32 orderId, uint32 fillDeadline) internal view returns (ResolvedCrossChainOrder memory) {
        return ResolvedCrossChainOrder({
            user: user,
            originChainId: block.chainid,
            openDeadline: uint32(block.timestamp),
            fillDeadline: fillDeadline,
            orderId: orderId
        });
    }
}
