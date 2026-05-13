// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ServiceRegistry
/// @notice On-chain service discovery registry where AI service providers register their
///         services and agents autonomously discover and select them. ERC-8004 compatible
///         (agent card URI). Inspired by Fangorn's AgentDataSource registry (won $10K).
contract ServiceRegistry {
    struct Service {
        address provider;      // who registered it
        string  serviceId;     // off-chain ID matching TollGate backend (e.g. "svc_0g_inference")
        string  name;          // human-readable name
        uint256 priceWei;      // price in wei (or smallest token unit)
        string  currency;      // "USDC", "ETH", etc.
        string  network;       // "base-sepolia", "mantle", etc.
        string  endpoint;      // full gateway URL e.g. "https://tollgate-1.onrender.com/api/gateway/svc_0g_inference"
        string  agentCardUri;  // ERC-8004 agent card JSON URI (IPFS or 0G Storage URL)
        bool    active;
        uint64  registeredAt;
        uint64  updatedAt;
    }

    // serviceId hash → Service
    mapping(bytes32 => Service) private _services;
    // ordered list of serviceId hashes for enumeration
    bytes32[] private _ids;
    // provider address → count
    mapping(address => uint256) public providerServiceCount;

    event ServiceRegistered(bytes32 indexed key, string serviceId, address indexed provider, uint256 priceWei);
    event ServiceUpdated(bytes32 indexed key, string serviceId, uint256 newPriceWei);
    event ServiceDeactivated(bytes32 indexed key, string serviceId);

    error ServiceAlreadyExists(bytes32 key);
    error ServiceNotFound(bytes32 key);
    error NotServiceProvider(address caller, address provider);
    error EmptyServiceId();

    function _key(string calldata serviceId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(serviceId));
    }

    /// @notice Register a new service. serviceId must be unique.
    function register(
        string calldata serviceId,
        string calldata name,
        uint256 priceWei,
        string calldata currency,
        string calldata network,
        string calldata endpoint,
        string calldata agentCardUri
    ) external returns (bytes32 key) {
        if (bytes(serviceId).length == 0) revert EmptyServiceId();
        key = _key(serviceId);
        if (_services[key].registeredAt != 0) revert ServiceAlreadyExists(key);

        _services[key] = Service({
            provider: msg.sender,
            serviceId: serviceId,
            name: name,
            priceWei: priceWei,
            currency: currency,
            network: network,
            endpoint: endpoint,
            agentCardUri: agentCardUri,
            active: true,
            registeredAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });
        _ids.push(key);
        unchecked { providerServiceCount[msg.sender] += 1; }

        emit ServiceRegistered(key, serviceId, msg.sender, priceWei);
    }

    /// @notice Update price and/or agentCardUri. Only the provider can call this.
    function update(string calldata serviceId, uint256 newPriceWei, string calldata newAgentCardUri) external {
        bytes32 key = _key(serviceId);
        Service storage s = _services[key];
        if (s.registeredAt == 0) revert ServiceNotFound(key);
        if (s.provider != msg.sender) revert NotServiceProvider(msg.sender, s.provider);
        s.priceWei = newPriceWei;
        if (bytes(newAgentCardUri).length > 0) s.agentCardUri = newAgentCardUri;
        s.updatedAt = uint64(block.timestamp);
        emit ServiceUpdated(key, serviceId, newPriceWei);
    }

    /// @notice Deactivate a service (soft-delete). Only the provider can call.
    function deactivate(string calldata serviceId) external {
        bytes32 key = _key(serviceId);
        Service storage s = _services[key];
        if (s.registeredAt == 0) revert ServiceNotFound(key);
        if (s.provider != msg.sender) revert NotServiceProvider(msg.sender, s.provider);
        s.active = false;
        s.updatedAt = uint64(block.timestamp);
        emit ServiceDeactivated(key, serviceId);
    }

    /// @notice Get a service by serviceId string.
    function getService(string calldata serviceId) external view returns (Service memory) {
        bytes32 key = _key(serviceId);
        Service memory s = _services[key];
        if (s.registeredAt == 0) revert ServiceNotFound(key);
        return s;
    }

    /// @notice Total number of registered services (including inactive).
    function total() external view returns (uint256) { return _ids.length; }

    /// @notice Get service at index (for enumeration).
    function serviceAt(uint256 index) external view returns (Service memory) {
        require(index < _ids.length, "out of range");
        return _services[_ids[index]];
    }
}
