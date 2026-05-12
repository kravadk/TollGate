// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentReceiptRegistry
/// @notice Append-only, permissionless registry of x402 payment receipts.
///         Every agent payment in AgentPay Router produces a receipt; calling
///         `record` anchors that receipt's content hash on the 0G chain so the
///         settlement can be verified independently of the app.
/// @dev    No owner, no admin, no upgrade path, no funds held — it is a public
///         notary. The only state transition is "a new receipt hash was seen".
contract AgentReceiptRegistry {
    struct Entry {
        address payer;       // who anchored it (msg.sender)
        bytes32 receiptHash; // SHA-256 of the receipt envelope
        bytes32 payloadHash; // SHA-256 of the receipt payload (job result / pinned blob / ...)
        uint64  timestamp;   // block timestamp (Unix seconds)
    }

    /// All receipts in insertion order.
    Entry[] private _entries;

    /// receiptHash => 1-based index into `_entries` (0 = not recorded).
    mapping(bytes32 => uint256) private _indexOf;

    /// Per-payer count, for cheap "how many receipts has this agent anchored" reads.
    mapping(address => uint256) public recordedBy;

    event ReceiptRecorded(
        address indexed payer,
        bytes32 indexed receiptHash,
        bytes32 payloadHash,
        uint256 index,
        uint64  timestamp
    );

    error ReceiptAlreadyRecorded(bytes32 receiptHash, uint256 index);
    error ZeroReceiptHash();

    /// @notice Anchor a receipt hash on-chain. Reverts if already present.
    /// @param receiptHash  non-zero SHA-256 of the receipt envelope
    /// @param payloadHash  SHA-256 of the receipt payload (may be zero)
    /// @return index       0-based position of the new entry
    function record(bytes32 receiptHash, bytes32 payloadHash) external returns (uint256 index) {
        if (receiptHash == bytes32(0)) revert ZeroReceiptHash();
        uint256 existing = _indexOf[receiptHash];
        if (existing != 0) revert ReceiptAlreadyRecorded(receiptHash, existing - 1);

        index = _entries.length;
        _entries.push(Entry({
            payer: msg.sender,
            receiptHash: receiptHash,
            payloadHash: payloadHash,
            timestamp: uint64(block.timestamp)
        }));
        _indexOf[receiptHash] = index + 1;
        unchecked { recordedBy[msg.sender] += 1; }

        emit ReceiptRecorded(msg.sender, receiptHash, payloadHash, index, uint64(block.timestamp));
    }

    /// @notice Total number of receipts anchored.
    function total() external view returns (uint256) {
        return _entries.length;
    }

    /// @notice True if `receiptHash` has been anchored.
    function isRecorded(bytes32 receiptHash) external view returns (bool) {
        return _indexOf[receiptHash] != 0;
    }

    /// @notice Read one entry by index. Reverts if out of range.
    function entryAt(uint256 index) external view returns (Entry memory) {
        require(index < _entries.length, "index out of range");
        return _entries[index];
    }

    /// @notice Look up the entry that anchored `receiptHash`. Reverts if absent.
    function entryFor(bytes32 receiptHash) external view returns (uint256 index, Entry memory entry) {
        uint256 oneBased = _indexOf[receiptHash];
        require(oneBased != 0, "not recorded");
        index = oneBased - 1;
        entry = _entries[index];
    }
}
