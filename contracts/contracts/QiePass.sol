// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title QiePass — tiered ERC-721-like membership pass on QIE testnet.
/// Tiers: 0=Bronze (0.03 QIE), 1=Silver (0.15 QIE), 2=Gold (0.5 QIE).
/// Minimal implementation — no transfers or approvals needed for this demo.
contract QiePass {
    uint256 private _nextId;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => uint8) private _tokenTier;

    uint256 public constant BRONZE_PRICE = 0.03 ether;
    uint256 public constant SILVER_PRICE = 0.15 ether;
    uint256 public constant GOLD_PRICE   = 0.50 ether;

    event PassMinted(address indexed to, uint256 indexed tokenId, uint8 tier);

    function mintPass(address to, uint8 tier) external payable returns (uint256 tokenId) {
        require(tier <= 2, "invalid tier");
        uint256 price;
        if (tier == 0) price = BRONZE_PRICE;
        else if (tier == 1) price = SILVER_PRICE;
        else price = GOLD_PRICE;
        require(msg.value >= price, "insufficient payment");

        tokenId = _nextId++;
        _owners[tokenId] = to;
        _balances[to] += 1;
        _tokenTier[tokenId] = tier;
        emit PassMinted(to, tokenId, tier);

        // Return excess payment to caller
        uint256 excess = msg.value - price;
        if (excess > 0) payable(msg.sender).transfer(excess);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "nonexistent token");
        return owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "zero address");
        return _balances[owner];
    }

    function tokenTier(uint256 tokenId) external view returns (uint8) {
        require(_owners[tokenId] != address(0), "nonexistent token");
        return _tokenTier[tokenId];
    }

    /// @return highest tier held by `holder`, or 255 if none.
    function checkTier(address holder) external view returns (uint8) {
        if (_balances[holder] == 0) return 255;
        uint8 best = 255;
        for (uint256 i = 0; i < _nextId; i++) {
            if (_owners[i] == holder) {
                uint8 t = _tokenTier[i];
                if (best == 255 || t > best) best = t;
            }
        }
        return best;
    }

    function isValid(address holder, uint8 minTier) external view returns (bool) {
        if (_balances[holder] == 0) return false;
        for (uint256 i = 0; i < _nextId; i++) {
            if (_owners[i] == holder && _tokenTier[i] >= minTier) return true;
        }
        return false;
    }

    function totalMinted() external view returns (uint256) {
        return _nextId;
    }
}
