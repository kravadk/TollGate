// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DeliveryVerifier
/// @notice Anchor and verify cryptographic proof that an x402 service delivered its result.
///         Provider signs: keccak256("\x19Ethereum Signed Message:\n32" + responseHash)
///         Anyone can call `verify` to check the signature; `anchor` records it on-chain.
///         Inspired by Fangorn's settlement tracker (won $10K).
contract DeliveryVerifier {
    struct Delivery {
        bytes32 requestHash;   // hash of the original request/serviceId/receiptId
        bytes32 responseHash;  // hash of the delivered response body
        address provider;      // recovered signer address
        bytes   signature;     // raw EIP-191 signature (65 bytes)
        uint64  timestamp;
    }

    // requestHash => Delivery (one delivery per request)
    mapping(bytes32 => Delivery) private _deliveries;

    event DeliveryAnchored(
        bytes32 indexed requestHash,
        bytes32 indexed responseHash,
        address indexed provider,
        uint64  timestamp
    );

    error AlreadyAnchored(bytes32 requestHash);
    error InvalidSignature();
    error ZeroHash();

    /// @notice Recover signer from EIP-191 personal_sign over a bytes32.
    function _recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "bad sig length");
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        if (v < 27) v += 27;
        bytes32 prefixed = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        return ecrecover(prefixed, v, r, s);
    }

    /// @notice Verify that `signature` over `responseHash` was produced by `expectedProvider`.
    function verify(bytes32 responseHash, bytes calldata signature, address expectedProvider) external pure returns (bool) {
        if (responseHash == bytes32(0)) revert ZeroHash();
        address recovered = _recover(responseHash, signature);
        return recovered == expectedProvider;
    }

    /// @notice Anchor a delivery proof on-chain. Reverts if already anchored for this requestHash.
    function anchor(
        bytes32 requestHash,
        bytes32 responseHash,
        bytes calldata signature
    ) external returns (address provider) {
        if (requestHash == bytes32(0) || responseHash == bytes32(0)) revert ZeroHash();
        if (_deliveries[requestHash].timestamp != 0) revert AlreadyAnchored(requestHash);

        provider = _recover(responseHash, signature);
        if (provider == address(0)) revert InvalidSignature();

        _deliveries[requestHash] = Delivery({
            requestHash: requestHash,
            responseHash: responseHash,
            provider: provider,
            signature: signature,
            timestamp: uint64(block.timestamp)
        });

        emit DeliveryAnchored(requestHash, responseHash, provider, uint64(block.timestamp));
    }

    /// @notice Check if a delivery was anchored.
    function isAnchored(bytes32 requestHash) external view returns (bool) {
        return _deliveries[requestHash].timestamp != 0;
    }

    /// @notice Get full delivery record. Reverts if not found.
    function getDelivery(bytes32 requestHash) external view returns (Delivery memory) {
        Delivery memory d = _deliveries[requestHash];
        require(d.timestamp != 0, "not anchored");
        return d;
    }
}
