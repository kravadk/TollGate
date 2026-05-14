/// AgentReputation — on-chain living reputation NFT for AI agents on Sui.
/// Each agent holds a `ReputationNFT` object that tracks:
///   - total_jobs       : total tasks completed
///   - successful_jobs  : verified completions
///   - score            : 0-1000 FICO-style score (updated on each job)
///   - tier             : Common / Uncommon / Rare / Epic / Legendary
///   - last_updated     : epoch of last update
///
/// The registry (shared object) maps agent addresses to NFT object IDs,
/// allowing indexers to enumerate all agents on-chain.
///
/// Deploy:  sui client publish --gas-budget 100000000
/// Network: Sui testnet (or mainnet)

module agent_reputation::agent_reputation {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::table::{Self, Table};
    use sui::event;
    use std::string::{Self, String};

    // ── Errors ────────────────────────────────────────────────────────────────

    const ENotAuthorized: u64 = 1;
    const EAlreadyRegistered: u64 = 2;
    const ENotRegistered: u64 = 3;

    // ── Tiers ─────────────────────────────────────────────────────────────────

    const TIER_COMMON: u8    = 0;
    const TIER_UNCOMMON: u8  = 1;
    const TIER_RARE: u8      = 2;
    const TIER_EPIC: u8      = 3;
    const TIER_LEGENDARY: u8 = 4;

    // Score thresholds for tier upgrades
    const SCORE_UNCOMMON: u64  = 200;
    const SCORE_RARE: u64      = 400;
    const SCORE_EPIC: u64      = 650;
    const SCORE_LEGENDARY: u64 = 850;

    // ── Structs ───────────────────────────────────────────────────────────────

    /// Shared registry: agent_address → NFT object ID
    struct AgentRegistry has key {
        id: UID,
        agents: Table<address, ID>,
        total_agents: u64,
    }

    /// Admin capability — only the deployer can record job completions via the registry.
    struct AdminCap has key, store {
        id: UID,
    }

    /// Living reputation NFT — transferred to the agent's wallet on mint.
    struct ReputationNFT has key, store {
        id: UID,
        agent_address: address,
        name: String,
        total_jobs: u64,
        successful_jobs: u64,
        score: u64,          // 0-1000
        tier: u8,
        last_updated_epoch: u64,
    }

    // ── Events ────────────────────────────────────────────────────────────────

    struct AgentMinted has copy, drop {
        nft_id: ID,
        agent: address,
    }

    struct JobRecorded has copy, drop {
        nft_id: ID,
        agent: address,
        success: bool,
        new_score: u64,
        new_tier: u8,
    }

    struct TierUpgraded has copy, drop {
        nft_id: ID,
        agent: address,
        old_tier: u8,
        new_tier: u8,
    }

    // ── Initializer ───────────────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        let admin = AdminCap { id: object::new(ctx) };
        transfer::transfer(admin, tx_context::sender(ctx));

        let registry = AgentRegistry {
            id: object::new(ctx),
            agents: table::new(ctx),
            total_agents: 0,
        };
        transfer::share_object(registry);
    }

    // ── Public entry functions ─────────────────────────────────────────────────

    /// Mint a fresh ReputationNFT for `agent_address`.
    /// Can be called by anyone (self-registration) or by a protocol contract.
    public entry fun mint(
        registry: &mut AgentRegistry,
        agent_address: address,
        name: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert!(!table::contains(&registry.agents, agent_address), EAlreadyRegistered);

        let nft = ReputationNFT {
            id: object::new(ctx),
            agent_address,
            name: string::utf8(name),
            total_jobs: 0,
            successful_jobs: 0,
            score: 100, // starting score
            tier: TIER_COMMON,
            last_updated_epoch: tx_context::epoch(ctx),
        };
        let nft_id = object::id(&nft);
        table::add(&mut registry.agents, agent_address, nft_id);
        registry.total_agents = registry.total_agents + 1;

        event::emit(AgentMinted { nft_id, agent: agent_address });
        transfer::transfer(nft, agent_address);
    }

    /// Record a completed job and update the reputation score.
    /// Requires AdminCap — the protocol gateway holds this.
    public entry fun record_job(
        _cap: &AdminCap,
        nft: &mut ReputationNFT,
        success: bool,
        ctx: &mut TxContext,
    ) {
        nft.total_jobs = nft.total_jobs + 1;
        nft.last_updated_epoch = tx_context::epoch(ctx);

        if (success) {
            nft.successful_jobs = nft.successful_jobs + 1;
            let delta = if (nft.score < 950) { 10u64 } else { 1u64 };
            nft.score = min_u64(1000, nft.score + delta);
        } else {
            nft.score = if (nft.score >= 20) { nft.score - 20 } else { 0 };
        };

        let old_tier = nft.tier;
        nft.tier = score_to_tier(nft.score);

        let nft_id = object::id(nft);
        if (nft.tier != old_tier) {
            event::emit(TierUpgraded { nft_id, agent: nft.agent_address, old_tier, new_tier: nft.tier });
        };
        event::emit(JobRecorded { nft_id, agent: nft.agent_address, success, new_score: nft.score, new_tier: nft.tier });
    }

    /// Allow the agent to update their display name.
    public entry fun update_name(
        nft: &mut ReputationNFT,
        new_name: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == nft.agent_address, ENotAuthorized);
        nft.name = string::utf8(new_name);
    }

    // ── View helpers (returned by indexers / PTB dry-run) ─────────────────────

    public fun score(nft: &ReputationNFT): u64 { nft.score }
    public fun tier(nft: &ReputationNFT): u8   { nft.tier }
    public fun total_jobs(nft: &ReputationNFT): u64 { nft.total_jobs }
    public fun success_rate_bps(nft: &ReputationNFT): u64 {
        if (nft.total_jobs == 0) { 0 }
        else { nft.successful_jobs * 10000 / nft.total_jobs }
    }
    public fun agent_address(nft: &ReputationNFT): address { nft.agent_address }
    public fun nft_id_for(registry: &AgentRegistry, agent: address): ID {
        assert!(table::contains(&registry.agents, agent), ENotRegistered);
        *table::borrow(&registry.agents, agent)
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    fun score_to_tier(score: u64): u8 {
        if (score >= SCORE_LEGENDARY) { TIER_LEGENDARY }
        else if (score >= SCORE_EPIC)  { TIER_EPIC }
        else if (score >= SCORE_RARE)  { TIER_RARE }
        else if (score >= SCORE_UNCOMMON) { TIER_UNCOMMON }
        else { TIER_COMMON }
    }

    fun min_u64(a: u64, b: u64): u64 { if (a < b) { a } else { b } }
}
