// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// TollGate publishes per-service demand data on-chain after each batch of receipts.
// Other QIE dApps (e.g. prediction bots) can consume these oracle feeds.
contract QieOracleFeed {
    address public owner;

    struct Feed {
        uint256 callCount;   // total calls settled for this service
        uint256 priceUsd18;  // price in USD * 1e18
        uint256 updatedAt;
    }

    mapping(bytes32 => Feed) public feeds;
    bytes32[] public serviceIds;

    event FeedUpdated(bytes32 indexed serviceId, uint256 callCount, uint256 priceUsd18);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }
    constructor() { owner = msg.sender; }

    function updateFeed(bytes32 serviceId, uint256 callCount, uint256 priceUsd18) external onlyOwner {
        if (feeds[serviceId].updatedAt == 0) serviceIds.push(serviceId);
        feeds[serviceId] = Feed({ callCount: callCount, priceUsd18: priceUsd18, updatedAt: block.timestamp });
        emit FeedUpdated(serviceId, callCount, priceUsd18);
    }

    function updateFeeds(bytes32[] calldata ids, uint256[] calldata counts, uint256[] calldata prices) external onlyOwner {
        require(ids.length == counts.length && ids.length == prices.length, "length mismatch");
        for (uint256 i = 0; i < ids.length; i++) {
            if (feeds[ids[i]].updatedAt == 0) serviceIds.push(ids[i]);
            feeds[ids[i]] = Feed({ callCount: counts[i], priceUsd18: prices[i], updatedAt: block.timestamp });
            emit FeedUpdated(ids[i], counts[i], prices[i]);
        }
    }

    function getFeed(bytes32 serviceId) external view returns (uint256 callCount, uint256 priceUsd18, uint256 updatedAt) {
        Feed storage f = feeds[serviceId];
        return (f.callCount, f.priceUsd18, f.updatedAt);
    }

    function serviceCount() external view returns (uint256) { return serviceIds.length; }
}
