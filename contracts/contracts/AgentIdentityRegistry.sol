// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title AgentIdentityRegistry
/// @notice ERC-8004-style "Trustless Agents" identity registry, implemented as an
///         ERC-721 — every agent gets a unique, transferable identity NFT. Each
///         agent has a domain (e.g. `yield-researcher.agentpay.run`) and an
///         operational address; the NFT owner controls the record. A light on-chain
///         reputation tally (count + sum of 1..5 scores) lets others vouch for an agent.
/// @dev    No admin, no pausing, no funds held. `tokenId == agentId`, starting at 1.
contract AgentIdentityRegistry is ERC721 {
    struct AgentInfo {
        string  domain;        // agent identity domain (unique)
        address agentAddress;  // operational address the agent acts from (unique)
        uint64  registeredAt;  // Unix seconds
        uint64  updatedAt;     // Unix seconds
    }

    uint256 private _nextId = 1;
    mapping(uint256 => AgentInfo) private _info;
    mapping(bytes32 => uint256) private _idByDomainHash;   // keccak256(domain) => agentId (0 = none)
    mapping(address => uint256) public agentIdOf;          // agentAddress => agentId (0 = none)

    // Light reputation: anyone can leave a 1..5 score with an arbitrary reference (off-chain feedback URI hash, etc.)
    mapping(uint256 => uint64) public feedbackCount;
    mapping(uint256 => uint64) public feedbackScoreSum;

    // "Intelligent NFT" brain pointer: the 0G Storage Merkle root of this agent's
    // latest memory snapshot. Empty (bytes32(0)) until the owner binds one. The blob
    // itself lives on 0G Storage — this just makes the NFT's state point at it.
    mapping(uint256 => bytes32) public memoryRoot;

    // ERC-8004 agent card URI — points to the agent's JSON card (IPFS / 0G Storage URL).
    mapping(uint256 => string) public agentCardUri;

    // Structured on-chain reputation built from payment history.
    mapping(uint256 => AgentReputation) public reputation;

    struct AgentReputation {
        uint64  txCount;        // total successful payments
        uint64  successRate;    // basis points (10000 = 100%)
        uint256 totalSpentWei; // total amount spent across all services
        uint64  lastActiveAt;  // last payment timestamp
    }

    event AgentRegistered(uint256 indexed agentId, string agentDomain, address indexed agentAddress, address indexed owner);
    event AgentUpdated(uint256 indexed agentId, string agentDomain, address indexed agentAddress);
    event FeedbackRecorded(uint256 indexed agentId, address indexed from, uint8 score, bytes32 ref);
    event MemoryRootUpdated(uint256 indexed agentId, bytes32 indexed root, address indexed by);
    event AgentCardUriSet(uint256 indexed agentId, string uri, address indexed by);
    event ReputationUpdated(uint256 indexed agentId, uint64 txCount, uint64 successRate);

    error EmptyDomain();
    error ZeroAddress();
    error DomainTaken(string domain);
    error AddressAlreadyRegistered(address agentAddress);
    error NotAgentOwner(uint256 agentId);
    error BadScore(uint8 score);

    constructor() ERC721("AgentPay Router Agent Identity", "APRAID") {}

    /// @notice Register a new agent → mints the identity NFT to `msg.sender`.
    function register(string calldata agentDomain, address agentAddress) external returns (uint256 agentId) {
        if (bytes(agentDomain).length == 0) revert EmptyDomain();
        if (agentAddress == address(0)) revert ZeroAddress();
        bytes32 dh = keccak256(bytes(agentDomain));
        if (_idByDomainHash[dh] != 0) revert DomainTaken(agentDomain);
        if (agentIdOf[agentAddress] != 0) revert AddressAlreadyRegistered(agentAddress);

        agentId = _nextId++;
        _info[agentId] = AgentInfo({
            domain: agentDomain,
            agentAddress: agentAddress,
            registeredAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });
        _idByDomainHash[dh] = agentId;
        agentIdOf[agentAddress] = agentId;
        _safeMint(msg.sender, agentId);

        emit AgentRegistered(agentId, agentDomain, agentAddress, msg.sender);
    }

    /// @notice Update an agent's domain and/or operational address. Only the NFT owner.
    function update(uint256 agentId, string calldata newDomain, address newAgentAddress) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner(agentId);
        if (bytes(newDomain).length == 0) revert EmptyDomain();
        if (newAgentAddress == address(0)) revert ZeroAddress();
        AgentInfo storage a = _info[agentId];

        bytes32 oldDh = keccak256(bytes(a.domain));
        bytes32 newDh = keccak256(bytes(newDomain));
        if (newDh != oldDh) {
            if (_idByDomainHash[newDh] != 0) revert DomainTaken(newDomain);
            delete _idByDomainHash[oldDh];
            _idByDomainHash[newDh] = agentId;
            a.domain = newDomain;
        }
        if (newAgentAddress != a.agentAddress) {
            if (agentIdOf[newAgentAddress] != 0) revert AddressAlreadyRegistered(newAgentAddress);
            delete agentIdOf[a.agentAddress];
            agentIdOf[newAgentAddress] = agentId;
            a.agentAddress = newAgentAddress;
        }
        a.updatedAt = uint64(block.timestamp);
        emit AgentUpdated(agentId, a.domain, a.agentAddress);
    }

    /// @notice Leave a 1..5 reputation score for an agent with an arbitrary reference.
    function recordFeedback(uint256 agentId, uint8 score, bytes32 ref) external {
        ownerOf(agentId); // reverts if agentId does not exist
        if (score == 0 || score > 5) revert BadScore(score);
        unchecked {
            feedbackCount[agentId] += 1;
            feedbackScoreSum[agentId] += score;
        }
        emit FeedbackRecorded(agentId, msg.sender, score, ref);
    }

    /// @notice Bind (or update) this agent's memory-snapshot pointer — the 0G Storage
    ///         Merkle root of its latest brain dump. Only the NFT owner. Pass bytes32(0) to clear.
    function setMemoryRoot(uint256 agentId, bytes32 root) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner(agentId);
        memoryRoot[agentId] = root;
        _info[agentId].updatedAt = uint64(block.timestamp);
        emit MemoryRootUpdated(agentId, root, msg.sender);
    }

    /// @notice Set or update the ERC-8004 agent card URI for an agent. Only the NFT owner.
    function setAgentCardUri(uint256 agentId, string calldata uri) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner(agentId);
        agentCardUri[agentId] = uri;
        _info[agentId].updatedAt = uint64(block.timestamp);
        emit AgentCardUriSet(agentId, uri, msg.sender);
    }

    /// @notice Record payment-derived reputation metrics for an agent. Only the NFT owner.
    function updateReputation(
        uint256 agentId,
        uint64  txCount,
        uint64  successRate,
        uint256 totalSpentWei
    ) external {
        if (ownerOf(agentId) != msg.sender) revert NotAgentOwner(agentId);
        AgentReputation storage rep = reputation[agentId];
        rep.txCount       = txCount;
        rep.successRate   = successRate;
        rep.totalSpentWei = totalSpentWei;
        rep.lastActiveAt  = uint64(block.timestamp);
        emit ReputationUpdated(agentId, txCount, successRate);
    }

    // ── Views ────────────────────────────────────────────────────────────────
    /// @notice Full record for an agent. Reverts if `agentId` does not exist.
    function getAgent(uint256 agentId) external view returns (address owner, AgentInfo memory info) {
        owner = ownerOf(agentId); // reverts if nonexistent
        info = _info[agentId];
    }

    /// @notice On-chain reputation tally for an agent (count of scores, sum of scores 1..5).
    function reputationOf(uint256 agentId) external view returns (uint64 count, uint64 scoreSum) {
        return (feedbackCount[agentId], feedbackScoreSum[agentId]);
    }

    function resolveByAddress(address agentAddress) external view returns (uint256) {
        return agentIdOf[agentAddress];
    }

    function resolveByDomain(string calldata agentDomain) external view returns (uint256) {
        return _idByDomainHash[keccak256(bytes(agentDomain))];
    }

    /// @notice Number of agents registered so far.
    function totalAgents() external view returns (uint256) {
        return _nextId - 1;
    }
}
