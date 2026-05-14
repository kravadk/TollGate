module agent_reputation::agent_reputation {
    use sui::object::{Self, UID, ID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::table::{Self, Table};
    use sui::event;
    use std::string::{Self, String};

    const ENotAuthorized: u64 = 1;
    const EAlreadyRegistered: u64 = 2;
    const ENotRegistered: u64 = 3;

    const TIER_COMMON: u8    = 0;
    const TIER_UNCOMMON: u8  = 1;
    const TIER_RARE: u8      = 2;
    const TIER_EPIC: u8      = 3;
    const TIER_LEGENDARY: u8 = 4;

    const SCORE_UNCOMMON: u64  = 200;
    const SCORE_RARE: u64      = 400;
    const SCORE_EPIC: u64      = 650;
    const SCORE_LEGENDARY: u64 = 850;

    public struct AgentRegistry has key {
        id: UID,
        agents: Table<address, ID>,
        total_agents: u64,
    }

    public struct AdminCap has key, store {
        id: UID,
    }

    public struct ReputationNFT has key, store {
        id: UID,
        agent_address: address,
        name: String,
        total_jobs: u64,
        successful_jobs: u64,
        score: u64,
        tier: u8,
        last_updated_epoch: u64,
    }

    public struct AgentMinted has copy, drop {
        nft_id: ID,
        agent: address,
    }

    public struct JobRecorded has copy, drop {
        nft_id: ID,
        agent: address,
        success: bool,
        new_score: u64,
        new_tier: u8,
    }

    public struct TierUpgraded has copy, drop {
        nft_id: ID,
        agent: address,
        old_tier: u8,
        new_tier: u8,
    }

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
            score: 100,
            tier: TIER_COMMON,
            last_updated_epoch: tx_context::epoch(ctx),
        };
        let nft_id = object::id(&nft);
        table::add(&mut registry.agents, agent_address, nft_id);
        registry.total_agents = registry.total_agents + 1;
        event::emit(AgentMinted { nft_id, agent: agent_address });
        transfer::transfer(nft, agent_address);
    }

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

    public entry fun update_name(
        nft: &mut ReputationNFT,
        new_name: vector<u8>,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == nft.agent_address, ENotAuthorized);
        nft.name = string::utf8(new_name);
    }

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

    fun score_to_tier(score: u64): u8 {
        if (score >= SCORE_LEGENDARY) { TIER_LEGENDARY }
        else if (score >= SCORE_EPIC)  { TIER_EPIC }
        else if (score >= SCORE_RARE)  { TIER_RARE }
        else if (score >= SCORE_UNCOMMON) { TIER_UNCOMMON }
        else { TIER_COMMON }
    }

    fun min_u64(a: u64, b: u64): u64 { if (a < b) { a } else { b } }
}
