# TollGate × Arbitrum — Agent Services

**Hackathon:** Arbitrum Open House / Buildathon
**App route:** `/app/arbitrum`

## What it does

Agents pay USDC for API services on Arbitrum with on-chain spend limits, per-call receipts, and optional escrowed delivery. The escrow contract holds payment until a delivery proof is posted, then releases or refunds automatically — eliminating trust between agent and service provider. Stylus (Rust) contract tab shows how services can be deployed as WASM programs on Arbitrum.

## Tracks entered

| Track | What we built for it |
|---|---|
| Best Agentic Project | Full x402 payment stack on Arbitrum: challenges, USDC settlement, replay protection |
| DeFi / Payments | USDC invoice creation + settlement; per-call stablecoin micro-payments |
| Stylus / Rust | Stylus contract panel showing WASM deployment flow on Arbitrum Nova |
| Overall Prize | Multi-chain reach: Arbitrum + Mantle + Base + 0G from one unified gateway |

## Contracts deployed

| Contract | Network | Address |
|---|---|---|
| `AgentEscrow` | Arbitrum Sepolia | `0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7` |
| `AgentBudgetController` | Arbitrum Sepolia | deployed via `deploy-arbitrum.cjs` |
| `AgentIntentSettler` | Arbitrum Sepolia | deployed via `deploy-arbitrum.cjs` |

## Paid APIs (x402 services)

| Service ID | Name | Price | Description |
|---|---|---|---|
| `svc_arb_invoice` | Stablecoin Invoice API | $0.02 | Issues a USDC invoice on Arbitrum; provider receives stablecoin directly |
| `svc_arb_orbit` | Orbit Chain Monitor | $0.05 | Health + risk metrics for an Orbit chain: sequencer, batch lag, bridge flow |
| `svc_arb_escrow` | Agent Escrow API | $0.04 | Holds payment in escrow until delivery proof is posted; auto-release or refund |
| `svc_arb_bridge` | Orbit Bridge Status API | $0.02 | Per-bridge health: pending withdrawals, claim delay, net flow |
| `svc_arb_usdc` | USDC Settlement API | $0.01 | Builds and tracks a USDC transfer on Arbitrum; returns calldata + receipt |

## UI tabs

1. **Overview** — wallet connect, receipt feed, deployed contract links with Arbiscan links
2. **Agent Marketplace** — browse paid services, pay with USDC via x402
3. **USDC Payments** — direct USDC transfer flow, settlement receipt display
4. **Stylus Contracts** — Rust/WASM contract explainer and deploy command helper
5. **Escrow** — `AgentEscrow.sol` panel: relative deadline display, Mainnet/Testnet toggle
6. **Wallet Protection** — `AgentBudgetController` daily cap + per-request limit display

## x402 flow

```
GET /api/gateway/svc_arb_invoice
→ 402 { challengeId, payTo, amount: "0.02", asset: "USDC", network: "arbitrum-sepolia" }
→ agent sends USDC on-chain → retry with X-PAYMENT header
→ server verifies txHash via Base Sepolia RPC → unlocks response + appends receipt
```
