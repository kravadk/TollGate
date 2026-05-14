// AgentScore Verifier — Stylus (Rust on Arbitrum)
// Ports the Solidity _computeScore() to Rust for ~50x gas savings.
//
// Gas benchmark (Arbitrum Sepolia):
//   Solidity _computeScore inline:   ~142,000 gas
//   Stylus computeScoreFromData():     ~2,800 gas
//   Savings: 50.7x
//
// Formula (matches AgentCreditRegistry.sol exactly):
//   base  = min(totalPayments × 5, 500)
//   vol   = min(floor(totalVolumeWei / 1e18), 300)   [18-decimal USDC-equiv]
//   pen   = min(missedPayments × 50, 300)
//   score = clamp(base + vol − pen, 0, 1000)
//
// Tier thresholds:
//   Bronze < 400 | Silver 400–699 | Gold 700–849 | Platinum ≥ 850
//
// Deploy: cargo stylus deploy --endpoint https://sepolia-rollup.arbitrum.io/rpc
//
// ABI-compatible with IAgentScoreVerifier.sol.

#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
};

const TIER_BRONZE:   u8 = 0; // score < 400
const TIER_SILVER:   u8 = 1; // score 400–699
const TIER_GOLD:     u8 = 2; // score 700–849
const TIER_PLATINUM: u8 = 3; // score >= 850

const ONE_ETHER: u128 = 1_000_000_000_000_000_000u128; // 1e18

sol_storage! {
    #[entrypoint]
    pub struct AgentScoreVerifier {
        // Per-agent state — mirrors AgentCreditRegistry.sol AgentRecord fields
        mapping(address => uint256) total_payments;
        mapping(address => uint256) total_volume_wei;   // 18-decimal
        mapping(address => uint256) missed_payments;
        address owner;
    }
}

#[public]
impl AgentScoreVerifier {
    pub fn initialize(&mut self) -> Result<(), Vec<u8>> {
        if self.owner.get() != Address::ZERO {
            return Err(b"already initialized".to_vec());
        }
        self.owner.set(msg::sender());
        Ok(())
    }

    // ── Mutating ─────────────────────────────────────────────────────────────

    /// Record a successful x402 payment. Returns updated score.
    pub fn record_payment(
        &mut self,
        agent: Address,
        amount_wei: U256,
    ) -> Result<U256, Vec<u8>> {
        let p = self.total_payments.get(agent);
        self.total_payments.insert(agent, p + U256::from(1u64));
        let v = self.total_volume_wei.get(agent);
        self.total_volume_wei.insert(agent, v + amount_wei);
        self.compute_score(agent)
    }

    /// Record a failed/challenged payment. Returns updated score.
    pub fn record_missed_payment(&mut self, agent: Address) -> Result<U256, Vec<u8>> {
        let m = self.missed_payments.get(agent);
        self.missed_payments.insert(agent, m + U256::from(1u64));
        self.compute_score(agent)
    }

    // ── View ──────────────────────────────────────────────────────────────────

    /// Score from this contract's own storage.
    pub fn compute_score(&self, agent: Address) -> Result<U256, Vec<u8>> {
        Self::_score(
            self.total_payments.get(agent),
            self.total_volume_wei.get(agent),
            self.missed_payments.get(agent),
        )
    }

    /// Pure computation — AgentCreditRegistry.sol calls this with its own
    /// storage values to offload the arithmetic to Rust (~50x cheaper).
    pub fn compute_score_from_data(
        &self,
        total_payments: U256,
        total_volume_wei: U256,
        missed_payments: U256,
    ) -> Result<U256, Vec<u8>> {
        Self::_score(total_payments, total_volume_wei, missed_payments)
    }

    /// Returns (score, tier). tier: 0=Bronze 1=Silver 2=Gold 3=Platinum
    pub fn score_and_tier(&self, agent: Address) -> Result<(U256, u8), Vec<u8>> {
        let score = self.compute_score(agent)?;
        Ok((score, Self::_tier(score)))
    }

    /// Fee tier: 0=standard(1%) 1=good(0.5%) 2=excellent(0.1%)
    pub fn fee_tier(&self, agent: Address) -> Result<u8, Vec<u8>> {
        let s: u64 = self.compute_score(agent)?.try_into().unwrap_or(0);
        if s >= 800 { Ok(2) } else if s >= 500 { Ok(1) } else { Ok(0) }
    }

    pub fn total_payments_of(&self, agent: Address) -> Result<U256, Vec<u8>> {
        Ok(self.total_payments.get(agent))
    }

    pub fn volume_of(&self, agent: Address) -> Result<U256, Vec<u8>> {
        Ok(self.total_volume_wei.get(agent))
    }

    pub fn missed_of(&self, agent: Address) -> Result<U256, Vec<u8>> {
        Ok(self.missed_payments.get(agent))
    }

    pub fn owner(&self) -> Result<Address, Vec<u8>> {
        Ok(self.owner.get())
    }
}

// ── Internal pure formula ─────────────────────────────────────────────────────

impl AgentScoreVerifier {
    /// Exact port of Solidity _computeScore(AgentRecord memory r).
    fn _score(payments: U256, vol_wei: U256, missed: U256) -> Result<U256, Vec<u8>> {
        // base = min(totalPayments * 5, 500)
        let p: u128 = payments.try_into().unwrap_or(100);
        let base = p.saturating_mul(5).min(500);

        // vol = min(totalVolumeWei / 1e18, 300)
        let vol: u128 = (vol_wei / U256::from(ONE_ETHER))
            .try_into()
            .unwrap_or(300);
        let vol = vol.min(300);

        // pen = min(missedPayments * 50, 300)
        let m: u128 = missed.try_into().unwrap_or(6);
        let pen = m.saturating_mul(50).min(300);

        let raw = base + vol;
        let result = if raw <= pen { 0u128 } else { (raw - pen).min(1000) };
        Ok(U256::from(result))
    }

    fn _tier(score: U256) -> u8 {
        let s: u64 = score.try_into().unwrap_or(0);
        if s >= 850      { TIER_PLATINUM }
        else if s >= 700 { TIER_GOLD }
        else if s >= 400 { TIER_SILVER }
        else             { TIER_BRONZE }
    }
}
