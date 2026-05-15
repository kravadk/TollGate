# Arbitrum Agent Services

**App route:** `/app/arbitrum`

## What it does

Agents pay USDC for API services on Arbitrum with on-chain spend limits, per-call receipts, and optional escrowed delivery. The escrow contract holds payment until a delivery proof is posted, then releases or refunds automatically — eliminating trust between agent and service provider.

## Features

| Feature | Description |
|---|---|
| x402 USDC payments | Single-use challenge, replay-safe, stablecoin settlement on Arbitrum |
| `AgentEscrow.sol` | Holds payment until delivery proof; auto-release or refund |
| Orbit chain monitor | Sequencer health, batch lag, bridge net flow per Orbit chain |
| USDC invoice API | Issue + track stablecoin invoices; provider receives directly |
| Stylus (Rust) panel | WASM contract deploy flow for Arbitrum Nova |
| Budget controller | `AgentBudgetController`: daily cap + per-request limit enforced on-chain |

## Contracts deployed

| Contract | Network | Address |
|---|---|---|
| `AgentEscrow` | Arbitrum Sepolia | `0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7` |
| `AgentBudgetController` | Arbitrum Sepolia | via `deploy-arbitrum.cjs` |
| `AgentIntentSettler` | Arbitrum Sepolia | via `deploy-arbitrum.cjs` |

## Paid APIs (x402 services)

| Service ID | Name | Price | Description |
|---|---|---|---|
| `svc_arb_invoice` | Stablecoin Invoice API | $0.02 | Issues a USDC invoice on Arbitrum; provider receives stablecoin directly |
| `svc_arb_orbit` | Orbit Chain Monitor | $0.05 | Health + risk metrics for an Orbit chain: sequencer, batch lag, bridge flow |
| `svc_arb_escrow` | Agent Escrow API | $0.04 | Holds payment in escrow until delivery proof is posted; auto-release or refund |
| `svc_arb_bridge` | Orbit Bridge Status API | $0.02 | Per-bridge health: pending withdrawals, claim delay, net flow |
| `svc_arb_usdc` | USDC Settlement API | $0.01 | Builds and tracks a USDC transfer on Arbitrum; returns calldata + receipt |

## UI tabs

1. **Overview** — wallet connect, receipt feed, deployed contract links with Arbiscan
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
→ server verifies txHash → unlocks response + appends receipt
```
