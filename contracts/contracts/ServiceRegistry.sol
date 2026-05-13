// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ServiceRegistry
/// @notice Open registry — any developer can list a paid API service on TollGate.
///         TollGate earns a 5% protocol fee on every payment routed through a listed service.
///         A small MNT listing fee deters spam.
contract ServiceRegistry {
    uint256 public constant LISTING_FEE = 0.001 ether; // 0.001 MNT
    uint256 public constant PROTOCOL_FEE_BPS = 500;    // 5%

    struct ServiceDef {
        string   serviceId;
        string   name;
        string   endpointUrl;
        uint96   priceUsdc;      // price in USDC cents (1 USDC = 100)
        address payable provider; // 95% of payments go here
        bool     active;
    }

    mapping(bytes32 => ServiceDef) public services;
    bytes32[] public serviceKeys;

    address payable public immutable protocolTreasury;

    event ServiceRegistered(bytes32 indexed key, string serviceId, address indexed provider, uint96 priceUsdc);
    event ServiceDeregistered(bytes32 indexed key, string serviceId);

    error ListingFeeTooLow();
    error AlreadyRegistered(bytes32 key);
    error NotProvider(bytes32 key);
    error NotFound(bytes32 key);

    constructor(address payable treasury) {
        protocolTreasury = treasury;
    }

    /// @notice Register a new API service. Send >= LISTING_FEE MNT.
    function register(
        string calldata serviceId,
        string calldata name,
        string calldata endpointUrl,
        uint96 priceUsdc,
        address payable provider
    ) external payable {
        if (msg.value < LISTING_FEE) revert ListingFeeTooLow();
        bytes32 key = keccak256(abi.encodePacked(serviceId));
        if (services[key].active) revert AlreadyRegistered(key);
        services[key] = ServiceDef({
            serviceId: serviceId,
            name: name,
            endpointUrl: endpointUrl,
            priceUsdc: priceUsdc,
            provider: provider,
            active: true
        });
        serviceKeys.push(key);
        protocolTreasury.transfer(msg.value);
        emit ServiceRegistered(key, serviceId, provider, priceUsdc);
    }

    /// @notice Deregister a service. Only the registered provider may do this.
    function deregister(bytes32 key) external {
        ServiceDef storage s = services[key];
        if (!s.active) revert NotFound(key);
        if (s.provider != msg.sender) revert NotProvider(key);
        s.active = false;
        emit ServiceDeregistered(key, s.serviceId);
    }

    /// @notice Return all active services for off-chain enumeration.
    function getActiveServices() external view returns (ServiceDef[] memory result) {
        uint256 count;
        for (uint256 i = 0; i < serviceKeys.length; i++) {
            if (services[serviceKeys[i]].active) count++;
        }
        result = new ServiceDef[](count);
        uint256 idx;
        for (uint256 i = 0; i < serviceKeys.length; i++) {
            if (services[serviceKeys[i]].active) {
                result[idx++] = services[serviceKeys[i]];
            }
        }
    }

    /// @notice Total number of keys ever registered (including deregistered).
    function totalKeys() external view returns (uint256) {
        return serviceKeys.length;
    }
}
