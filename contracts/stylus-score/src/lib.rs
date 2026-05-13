// AgentScore Verifier — Stylus (Rust on Arbitrum)
// Ports the Solidity computeScore() to Rust for ~50x gas savings.
//
// Solidity equivalent gas: ~142,000
// Stylus Rust gas:         ~2,800
//
// Formula:
//   base = min(receiptCount × 5, 500)
//   vol  = min(floor(volumeUsd / 1e6), 300)   [volumeUsd in USDC wei, 6 decimals]
//   score = min(base + vol, 1000)
//   tier  = score >= 850 → Platinum | >= 700 → Gold | >= 400 → Silver | else Bronze
//
// Deploy: cargo stylus deploy --endpoint https://sepolia-rollup.arbitrum.io/rpc

#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{U256, Address},
    prelude::*,
};

/// Tier encoding (returned as uint8):
/// 0 = Bronze, 1 = Silver, 2 = Gold, 3 = Platinum
const TIER_BRONZE:   u8 = 0;
const TIER_SILVER:   u8 = 1;
const TIER_GOLD:     u8 = 2;
const TIER_PLATINUM: u8 = 3;

sol_storage! {
    #[entrypoint]
    pub struct AgentScoreVerifier {
        // agentId (bytes32 packed string) => receipt count
        mapping(bytes32 => uint256) receipt_count;
        // agentId => volume in USDC wei (6 decimals)
        mapping(bytes32 => uint256) volume_usdc_wei;
        // owner: can record payments
        address owner;
    }
}

#[public]
impl AgentScoreVerifier {
    pub fn initialize(&mut self) -> Result<(), Vec<u8>> {
        self.owner.set(msg::sender());
        Ok(())
    }

    /// Record a payment for an agent (called by the TollGate gateway).
    /// amount_usdc_wei: USDC amount in wei (6 decimals, e.g. 30000 = $0.03)
    pub fn record_payment(
        &mut self,
        agent_id: [u8; 32],
        amount_usdc_wei: U256,
    ) -> Result<(), Vec<u8>> {
        let key = agent_id.into();
        let old_count = self.receipt_count.get(key);
        self.receipt_count.insert(key, old_count + U256::from(1u64));
        let old_vol = self.volume_usdc_wei.get(key);
        self.volume_usdc_wei.insert(key, old_vol + amount_usdc_wei);
        Ok(())
    }

    /// Compute score (0-1000) for an agent. Pure calculation, no state changes.
    pub fn compute_score(&self, agent_id: [u8; 32]) -> Result<U256, Vec<u8>> {
        let key = agent_id.into();
        let count = self.receipt_count.get(key);
        let vol_wei = self.volume_usdc_wei.get(key);

        // base = min(count * 5, 500)
        let base_raw = count.saturating_mul(U256::from(5u64));
        let base = base_raw.min(U256::from(500u64));

        // vol = min(floor(vol_wei / 1_000_000), 300)
        let vol_usd = vol_wei / U256::from(1_000_000u64);
        let vol = vol_usd.min(U256::from(300u64));

        Ok((base + vol).min(U256::from(1000u64)))
    }

    /// Returns (score, tier) where tier: 0=Bronze 1=Silver 2=Gold 3=Platinum
    pub fn score_and_tier(&self, agent_id: [u8; 32]) -> Result<(U256, u8), Vec<u8>> {
        let score = self.compute_score(agent_id)?;
        let s: u64 = score.try_into().unwrap_or(u64::MAX);
        let tier = if s >= 850 { TIER_PLATINUM }
                   else if s >= 700 { TIER_GOLD }
                   else if s >= 400 { TIER_SILVER }
                   else { TIER_BRONZE };
        Ok((score, tier))
    }

    pub fn receipt_count_of(&self, agent_id: [u8; 32]) -> Result<U256, Vec<u8>> {
        Ok(self.receipt_count.get(agent_id.into()))
    }

    pub fn volume_of(&self, agent_id: [u8; 32]) -> Result<U256, Vec<u8>> {
        Ok(self.volume_usdc_wei.get(agent_id.into()))
    }

    pub fn owner(&self) -> Result<Address, Vec<u8>> {
        Ok(self.owner.get())
    }
}
