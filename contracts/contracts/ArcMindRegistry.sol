// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ArcMindRegistry
/// @notice ERC-8004 compliant onchain AI agent identity + decision log for ArcMind.
///         Agents register a canonical bytes32 builderId (cross-venue attribution),
///         record immutable decision hashes, and accumulate a reputation score.
///
///         Deployed on Arc L1 testnet (chainId 5042002).
///         USDC is the native gas token on Arc — each write costs ~$0.01.
contract ArcMindRegistry {

    // ── Types ──────────────────────────────────────────────────────────────────

    struct AgentInfo {
        address owner;        // wallet that registered this agent
        bytes32 builderId;    // canonical cross-venue builder code (bytes32)
        string  metadata;     // IPFS URI or JSON with name/description/version
        uint64  registeredAt; // block.timestamp at registration
        uint256 decisions;    // total decisions recorded
        uint256 reputation;   // cumulative score (incremented per verified decision)
    }

    struct Decision {
        bytes32 agentId;       // which agent made this decision
        bytes32 decisionHash;  // keccak256 of the decision payload (off-chain blob)
        bytes32 outcomeHash;   // keccak256 of the outcome (filled post-resolution)
        uint64  timestamp;
        bool    resolved;
    }

    // ── State ──────────────────────────────────────────────────────────────────

    mapping(bytes32 => AgentInfo) private _agents;
    Decision[] private _decisions;
    mapping(bytes32 => uint256[]) private _agentDecisions;
    mapping(bytes32 => bytes32) private _builderToAgent;

    // ── Events ─────────────────────────────────────────────────────────────────

    event AgentRegistered(
        bytes32 indexed agentId,
        bytes32 indexed builderId,
        address indexed owner,
        string  metadata
    );

    event DecisionRecorded(
        bytes32 indexed agentId,
        uint256 indexed decisionIndex,
        bytes32 decisionHash
    );

    event DecisionResolved(
        bytes32 indexed agentId,
        uint256 indexed decisionIndex,
        bytes32 outcomeHash,
        uint256 newReputation
    );

    // ── Errors ─────────────────────────────────────────────────────────────────

    error BuilderIdAlreadyRegistered(bytes32 builderId);
    error AgentNotFound(bytes32 agentId);
    error NotAgentOwner(bytes32 agentId, address caller);
    error DecisionNotFound(uint256 index);
    error AlreadyResolved(uint256 index);
    error ZeroBuilderId();

    // ── Registration ───────────────────────────────────────────────────────────

    /// @notice Register a new AI agent with a canonical cross-venue builder ID.
    /// @param builderId  bytes32 builder code — same ID used on Polymarket, Hyperliquid, etc.
    /// @param metadata   Off-chain metadata URI or JSON string
    /// @return agentId   keccak256(builderId) — primary key for this agent
    function registerAgent(bytes32 builderId, string calldata metadata)
        external
        returns (bytes32 agentId)
    {
        if (builderId == bytes32(0)) revert ZeroBuilderId();
        if (_builderToAgent[builderId] != bytes32(0)) {
            revert BuilderIdAlreadyRegistered(builderId);
        }

        agentId = keccak256(abi.encodePacked(builderId));

        _agents[agentId] = AgentInfo({
            owner:        msg.sender,
            builderId:    builderId,
            metadata:     metadata,
            registeredAt: uint64(block.timestamp),
            decisions:    0,
            reputation:   0
        });

        _builderToAgent[builderId] = agentId;
        emit AgentRegistered(agentId, builderId, msg.sender, metadata);
    }

    // ── Decision Log ───────────────────────────────────────────────────────────

    /// @notice Record a decision made by the agent. Only the agent owner can call.
    /// @param agentId       keccak256(builderId) returned from registerAgent
    /// @param decisionHash  keccak256 of the full decision JSON
    /// @return index        0-based position in the global decision array
    function recordDecision(bytes32 agentId, bytes32 decisionHash)
        external
        returns (uint256 index)
    {
        AgentInfo storage agent = _agents[agentId];
        if (agent.owner == address(0)) revert AgentNotFound(agentId);
        if (agent.owner != msg.sender) revert NotAgentOwner(agentId, msg.sender);

        index = _decisions.length;
        _decisions.push(Decision({
            agentId:      agentId,
            decisionHash: decisionHash,
            outcomeHash:  bytes32(0),
            timestamp:    uint64(block.timestamp),
            resolved:     false
        }));

        _agentDecisions[agentId].push(index);
        agent.decisions += 1;

        emit DecisionRecorded(agentId, index, decisionHash);
    }

    /// @notice Resolve a decision by posting the outcome hash. Increases reputation by 10.
    function resolveDecision(uint256 index, bytes32 outcomeHash) external {
        if (index >= _decisions.length) revert DecisionNotFound(index);
        Decision storage d = _decisions[index];
        if (d.resolved) revert AlreadyResolved(index);

        AgentInfo storage agent = _agents[d.agentId];
        if (agent.owner != msg.sender) revert NotAgentOwner(d.agentId, msg.sender);

        d.outcomeHash = outcomeHash;
        d.resolved    = true;
        agent.reputation += 10;

        emit DecisionResolved(d.agentId, index, outcomeHash, agent.reputation);
    }

    // ── Views ──────────────────────────────────────────────────────────────────

    function getAgent(bytes32 agentId) external view returns (AgentInfo memory) {
        return _agents[agentId];
    }

    function getReputation(bytes32 agentId) external view returns (uint256) {
        return _agents[agentId].reputation;
    }

    function getDecisionCount() external view returns (uint256) {
        return _decisions.length;
    }

    function getDecision(uint256 index) external view returns (Decision memory) {
        if (index >= _decisions.length) revert DecisionNotFound(index);
        return _decisions[index];
    }

    function getAgentDecisions(bytes32 agentId) external view returns (uint256[] memory) {
        return _agentDecisions[agentId];
    }

    function agentIdForBuilder(bytes32 builderId) external view returns (bytes32) {
        return _builderToAgent[builderId];
    }
}
