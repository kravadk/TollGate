// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AgentEscrow
/// @notice Minimal escrow for AgentPay Router agent→provider payments on Arbitrum.
///         The paying agent opens an escrow (native ETH or an ERC-20 like USDC) with a
///         deadline; on delivery the agent calls `release` to pay the provider; if the
///         provider ghosts, the agent calls `refund` after the deadline; the provider
///         can `cancel` at any time to return the funds. Single-claim — an escrow can
///         only be released, refunded, or cancelled once. No owner, no admin, no fees.
/// @dev    Checks-effects-interactions + ReentrancyGuard; SafeERC20 for ERC-20 transfers.
contract AgentEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum State { None, Open, Released, Refunded }

    struct Escrow {
        address payer;    // the agent that funded it
        address payee;    // the provider
        address token;    // address(0) = native ETH, else ERC-20 (e.g. USDC)
        uint256 amount;
        uint64  deadline; // after this, payer may refund (Unix seconds)
        State   state;
        bytes32 ref;      // off-chain reference (x402 challenge / invoice hash); informational
    }

    Escrow[] private _escrows;
    /// Number of escrows currently in the Open state.
    uint256 public openCount;

    event EscrowOpened(uint256 indexed id, address indexed payer, address indexed payee, address token, uint256 amount, uint64 deadline, bytes32 ref);
    event EscrowReleased(uint256 indexed id, address indexed payee, uint256 amount);
    event EscrowRefunded(uint256 indexed id, address indexed payer, uint256 amount);

    error BadPayee();
    error ZeroAmount();
    error DeadlineInPast();
    error NativeValueMismatch(uint256 sent, uint256 expected);
    error UnexpectedNativeValue();
    error NoSuchEscrow(uint256 id);
    error NotOpen(uint256 id);
    error NotPayer();
    error NotPayee();
    error BeforeDeadline(uint64 deadline);
    error NativeTransferFailed();

    /// @notice Open an escrow.
    /// @param payee     the provider to be paid on release
    /// @param token     address(0) for native ETH (send `amount` as msg.value), else the ERC-20
    ///                  token address (msg.value must be 0 and the caller must have approved this
    ///                  contract for `amount`)
    /// @param amount    amount escrowed
    /// @param deadline  Unix seconds; after this the payer may `refund`
    /// @param ref       an off-chain reference (e.g. the x402 challenge hash); stored, not enforced
    /// @return id       the new escrow id
    function open(address payee, address token, uint256 amount, uint64 deadline, bytes32 ref)
        external
        payable
        nonReentrant
        returns (uint256 id)
    {
        if (payee == address(0)) revert BadPayee();
        if (amount == 0) revert ZeroAmount();
        if (deadline <= block.timestamp) revert DeadlineInPast();
        if (token == address(0)) {
            if (msg.value != amount) revert NativeValueMismatch(msg.value, amount);
        } else {
            if (msg.value != 0) revert UnexpectedNativeValue();
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        }
        id = _escrows.length;
        _escrows.push(Escrow({
            payer: msg.sender,
            payee: payee,
            token: token,
            amount: amount,
            deadline: deadline,
            state: State.Open,
            ref: ref
        }));
        unchecked { openCount += 1; }
        emit EscrowOpened(id, msg.sender, payee, token, amount, deadline, ref);
    }

    /// @notice Release the escrowed funds to the payee. Only the payer.
    function release(uint256 id) external nonReentrant {
        Escrow storage e = _escrow(id);
        if (e.state != State.Open) revert NotOpen(id);
        if (msg.sender != e.payer) revert NotPayer();
        e.state = State.Released;
        unchecked { openCount -= 1; }
        _pay(e.token, e.payee, e.amount);
        emit EscrowReleased(id, e.payee, e.amount);
    }

    /// @notice Refund the escrowed funds to the payer. Only the payer, only after the deadline.
    function refund(uint256 id) external nonReentrant {
        Escrow storage e = _escrow(id);
        if (e.state != State.Open) revert NotOpen(id);
        if (msg.sender != e.payer) revert NotPayer();
        if (block.timestamp < e.deadline) revert BeforeDeadline(e.deadline);
        e.state = State.Refunded;
        unchecked { openCount -= 1; }
        _pay(e.token, e.payer, e.amount);
        emit EscrowRefunded(id, e.payer, e.amount);
    }

    /// @notice The payee declines/cancels the job at any time → funds return to the payer.
    function cancel(uint256 id) external nonReentrant {
        Escrow storage e = _escrow(id);
        if (e.state != State.Open) revert NotOpen(id);
        if (msg.sender != e.payee) revert NotPayee();
        e.state = State.Refunded;
        unchecked { openCount -= 1; }
        _pay(e.token, e.payer, e.amount);
        emit EscrowRefunded(id, e.payer, e.amount);
    }

    // ── Views ────────────────────────────────────────────────────────────────
    function total() external view returns (uint256) {
        return _escrows.length;
    }

    function getEscrow(uint256 id) external view returns (Escrow memory) {
        if (id >= _escrows.length) revert NoSuchEscrow(id);
        return _escrows[id];
    }

    // ── Internal ─────────────────────────────────────────────────────────────
    function _escrow(uint256 id) private view returns (Escrow storage) {
        if (id >= _escrows.length) revert NoSuchEscrow(id);
        return _escrows[id];
    }

    function _pay(address token, address to, uint256 amount) private {
        if (token == address(0)) {
            (bool ok, ) = payable(to).call{value: amount}("");
            if (!ok) revert NativeTransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }
}
