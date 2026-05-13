// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title ReceiptNFT
/// @notice Every verified x402 payment mints an ERC-721 receipt NFT.
///         tokenURI points to a 0G Storage JSON blob with payment metadata.
///         Only the gateway address (set at deploy time) may mint.
contract ReceiptNFT is ERC721URIStorage {
    address public immutable gateway;
    uint256 private _nextTokenId;

    event ReceiptMinted(uint256 indexed tokenId, address indexed to, string receiptId);

    error OnlyGateway();

    modifier onlyGateway() {
        if (msg.sender != gateway) revert OnlyGateway();
        _;
    }

    constructor(address _gateway) ERC721("TollGate Receipt", "TGRCPT") {
        gateway = _gateway;
    }

    /// @notice Mint a receipt NFT. Called by the server after payment is verified.
    /// @param to      Payer address that receives the NFT.
    /// @param uri     Metadata URI (JSON on 0G Storage) with receiptId, serviceId, amount, etc.
    /// @param receiptId  Off-chain receipt ID for the emitted event (indexing).
    function mint(
        address to,
        string calldata uri,
        string calldata receiptId
    ) external onlyGateway returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit ReceiptMinted(tokenId, to, receiptId);
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }
}
