# TollGate

> **The payment rails the agent economy runs on. Stripe gave humans payments. Visa gave merchants reputation. TollGate gives AI agents both — HTTP 402 for autonomous payments + AgentScore credit reputation, bound to ERC-8004 identity.**

**[Live demo](https://toll-gatee.vercel.app/)** · **[API server](https://tollgate-1.onrender.com)** · **[0G mainnet contract](https://chainscan.0g.ai/address/0xF4BFd93061B160Fa376c7F66De207a00225B4e70)** · **[GitHub](https://github.com/kravadk/TollGate)**

Turn any API, data feed, inference job, storage write, or analytics endpoint into a **paid AI-agent service** using HTTP `402`, stablecoin settlement, agent budgets, and verifiable receipts. One core gateway, eight hackathon workspaces.

**Stripe / API gateway for AI agents** — agents call an endpoint, get `402 Payment Required`, pay with a stablecoin / x402 proof, retry, and the data unlocks. No accounts, no API keys, no manual checkout.

## Problem

**AI agents will execute over $10 trillion in autonomous economic decisions by 2030** (Ark Invest Big Ideas 2024). Today they have zero native payment infrastructure: no discovery, no per-request billing, no spending limits, no proof of delivery, no credit history. Every agent still relies on human-in-the-loop approval to pay an API.

HTTP `402 Payment Required` was reserved in the HTTP spec for exactly this case in 1997. TollGate makes it real for the agentic era: autonomous discovery → micropayment → verifiable receipt → on-chain reputation — no accounts, no API keys, no human approval loop.

> **Early design partner: [Fetch.ai](https://fetch.ai)** — their autonomous economic agents (AEAs) are integrating TollGate's x402 gateway to pay for 0G inference and Mantle yield data feeds without human intervention.

## Solution

```
Provider creates a paid endpoint
  → Agent calls it
  → Gateway returns 402 + payment challenge (amount, network, payTo, requestHash, expiry)
  → Agent pays (stablecoin / x402 facilitator)
  → Agent retries with payment proof
  → Gateway verifies (recipient, amount, network, challenge binding, replay)
  → Protected data unlocks + receipt is written
  → Dashboard updates usage / revenue / receipts
```

Every paid call leaves a verifiable receipt. Agents have budgets (`maxPerRequestUsd`, `dailyLimitUsd`, allowlist, auto-pay). Challenges are single-use, bound to a request hash, and expire — replays are rejected.

## How it works (two parts)

| Part | Path | What it is |
|---|---|---|
| **Frontend** | `src/` | React 19 + Vite 7 + Tailwind v4. Workspace selector → per-workspace dashboard (Overview, paid-API tabs, Agents, Receipts, x402 Gateway). Includes a `PaymentModal` that simulates the 402 → hold-to-pay → verify → approved → receipt moment, and a **Live Gateway** panel on the x402 Gateway tab that calls the real server. |
| **Server** | `server/` | Express + TypeScript. Real `402` gateway middleware (`withX402`), service registry, agent-policy reads, receipts ledger, `/api/v1/x402-spec` discovery, `/api/status/activity` tracker, and an **MCP server** (`POST /mcp`, JSON-RPC 2.0) exposing services as tools. Ported from [`kravadk/XSight-`](https://github.com/kravadk/XSight-) and generalized. See [`server/README.md`](server/README.md). |

The frontend works standalone (simulation). When `server/` is running, the x402 Gateway tab's Live Gateway panel performs a real `GET /api/gateway/<serviceId>` → `402` → pay (`X-PAYMENT: dev-bypass` in dev, or a signed base64 proof in prod) → unlocked data + receipt, and mirrors the server receipt into the in-app ledger.

## Hackathon workspaces & track mapping

Every workspace is the **same core** with a different reskin, demo data, network adapter, and distinctive paid endpoints + widgets.

| Workspace | Route | Hackathon | Primary track claim | Distinctive surfaces |
|---|---|---|---|---|
| **0G** | `/app/0g` | 0G APAC | Agentic Economy & Autonomous Applications | InferenceJobRunner, StoragePinWidget (real SHA-256), ProofVerifier |
| **Liquify** | `/app/liquify` | Liquify (DoraHacks) | Next-Gen Trading Tool with x402 Integration | WalletRiskAnalyzer, TaxExport (CSV), x402 Gateway page |
| **QIE** | `/app/qie` | QIE Hackathon | DeFi & Payments | CheckoutLinkBuilder, QIE Pass verify, QIEDEX data |
| **Arbitrum** | `/app/arbitrum` | Arbitrum Open House / Buildathon | Best Agentic Project | UsdcTransferWidget (real ERC-20 transfer), InteractiveEscrow, OrbitMonitorPanel |
| **Mantle** | `/app/mantle` | Mantle Turing Test | Agentic Wallets & Economy + AI Trading & Strategy | BacktestRunner, AlphaFeed, YieldBoard (mETH/USDY rotation) |
| **Eazo** | `/app/eazo` | Eazo AI Hackathon | AI Companion + Life OS | EazoSubManager, budget tracker, approvals |
| **Berkeley AI** | `/app/berkeley` | Berkeley AI Hackathon | Ddoski's Toolbox + Ddoski's Playground | PaidToolsGrid, PlaygroundInspector, AgentDebuggerPanel, TxExplainerPanel |
| **DeepSurge** | `/app/deepsurge` | DeepSurge EVE Frontier 2026 | Utility + Technical Implementation + Live Frontier Integration | FrontierIntelQuery, RouteRiskScorer |

> A detailed per-track gap analysis and build plan is in [`TRACK-PLAN.md`](TRACK-PLAN.md). The product spec is in [`PROJECT-PLAYBOOK.md`](PROJECT-PLAYBOOK.md); the umbrella spec in [`agent-payments-x402-universal-tz-uk.md`](agent-payments-x402-universal-tz-uk.md).

## 0G APAC Hackathon — Integration Proof

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Agent                                       │
│  calls paid API  →  gets HTTP 402  →  pays  →  retries  →  unlocked │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ x402 payment protocol
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   TollGate Gateway (server/)                   │
│  POST /api/gateway/:serviceId                                         │
│  ├─ Issues: 402 + challenge (amount, payTo, requestHash, expiry)      │
│  ├─ Verifies: X-PAYMENT proof (single-use, replay-protected)          │
│  └─ Returns: unlocked data + receipt                                  │
└───────┬───────────────────────────────────────────┬─────────────────┘
        │                                           │
        ▼                                           ▼
┌───────────────┐                        ┌──────────────────────────┐
│  0G Storage   │                        │  0G Chain (mainnet)      │
│  Agent memory │                        │  AgentReceiptRegistry    │
│  blobs pinned │                        │  record(hash, payload)   │
│  as Merkle-   │                        │  ReceiptRecorded event   │
│  rooted data  │                        │  (no owner, no admin)    │
└───────────────┘                        └──────────────────────────┘
```

### 0G Components Used

| Component | How it's used | Real / demo |
|---|---|---|
| **0G Chain (mainnet)** | `AgentReceiptRegistry.record(receiptHash, payloadHash)` anchors x402 receipts on-chain — a real ethers tx from the connected wallet. Deployed & live at [`0xF4BFd93061B160Fa376c7F66De207a00225B4e70`](https://chainscan.0g.ai/address/0xF4BFd93061B160Fa376c7F66De207a00225B4e70). | ✅ **real** |
| **0G Storage** | Agent memory blobs (snapshots, checkpoints, bulk pins) go through the server endpoint `POST /api/og/upload`, which uses `@0glabs/0g-ts-sdk` to compute a genuine 0G **Merkle root** and submit to the `FixedPriceFlow` contract. Falls back to a SHA-256 content hash if `OG_PRIVATE_KEY` isn't set. | ✅ **real** (with key) |
| **0G Compute** | Inference jobs run on the **0G Compute Network** via `POST /api/og/compute` → the serving broker (`createZGComputeNetworkBroker`) picks a provider from `compute-marketplace.0g.ai`, fetches single-use request headers, calls the provider's OpenAI-compatible endpoint, then `processResponse()` settles & verifies on 0G. The `InferenceJobRunner` widget shows a `🟢 Live · 0G Compute` badge + provider/chatID/verified when `OG_COMPUTE_PRIVATE_KEY` is set; otherwise a `🟡 Demo` deterministic fallback so the UI never breaks. | ✅ **real** (with key) |
| **0G Compute in A2A loop** | The `A2AMarketplaceWidget` (Agents tab) uses `runOgInference()` in step 5 — Provider delivers the sentiment analysis response **directly from the 0G Compute Network**, showing real model/provider/cost. Self-funding counter displays: Earned (x402 payment) / Spent on 0G Compute / Net profit. | ✅ **real** (with key) |
| **0G Compute Sealed/TEE** | The A2A demo has a "Sealed Inference" toggle: when enabled, the inference is routed to the 0G TEE endpoint (Intel TDX), and the response is TEE-attested. Shows a 🔒 badge in the step detail. | ✅ code-ready |
| **0G Storage (A2A memory)** | After each A2A Marketplace run, the full conversation log (request, response, sig, receipt ID) is uploaded to 0G Storage via `uploadToOgStorage()`. The Merkle root is displayed with a storagescan link. When `OG_PRIVATE_KEY` is set, the root is committed on-chain via `FixedPriceFlow`. | ✅ **real** (with key) |
| **x402 gateway** | `server/src/x402.ts` issues single-use, 5-min-expiry payment challenges and verifies the `X-PAYMENT` proof (challengeId, payTo, amount, asset, network) before unlocking — replay-safe. *Note: txHash in the proof is informational; on-chain settlement verification is a documented next step.* | ✅ challenge/proof real |
| **MCP server** | `server/src/mcp.ts` exposes `list_services / get_service / pay_for_service / list_receipts / get_agent_policy` over JSON-RPC 2.0 at `POST /mcp` — any Claude-powered agent can use TollGate as a paid-API tool. | ✅ **real** |
| **OpenClaw** | The `OpenClawSkillConsole` registers skill manifests and orchestrates inference jobs; "Sealed Inference" templates and the SGX/TDX attestation verdict are **demo** (deterministic, no real Intel IAS/PCCS round-trip — clearly labelled in-UI). | 🟡 demo |
| **Agent ID** | `AgentIdentityRegistry` (ERC-8004 "Trustless Agents", ERC-721) is deployed on Mantle mainnet; `setMemoryRoot(agentId, merkleRoot)` binds 0G Storage roots to agent identity. | ✅ contract real |
| **0G Integration Status** | New `OgIntegrationStatus` widget (Agents tab) shows live status of all four 0G components simultaneously — Chain (contract addresses + explorer links), Storage (indexer status), Compute (live ping), TEE (code-ready badge). Directly answers judging criterion #1: Technical Integration Depth. | ✅ **live** |

### 0G Feature Spotlight

A deep dive into each widget in the 0G workspace — what it does, why it wins, and the wow moment.

---

#### 🌟 A2A Marketplace — The Self-Funding Agent Loop ⭐⭐⭐
**Path:** `/app/0g` → Agents tab → **"Live A2A Marketplace"** widget

The first hackathon project where an agent **earns USDC from x402 payments and immediately spends those earnings on 0G Compute inference** — closing the autonomous economic loop with zero human-in-the-loop. The widget runs a 6-step on-chain choreography: Provider registers a $0.02 service → Consumer discovers cheapest match → AgentBudget approves → x402 settles → Provider delivers via real `runOgInference()` to 0G Compute → conversation log uploaded to 0G Storage as Merkle root → receipt anchored on mainnet.

**What's unique:**
- Real `runOgInference()` call (not mocked) when `OG_COMPUTE_PRIVATE_KEY` is set
- Real `uploadToOgStorage()` returns genuine 0G Storage Merkle root (with storagescan link)
- Self-funding ticker: **"Earned $0.020 | Spent on 0G Compute $0.001 | Net $0.019"**
- Sealed Inference toggle routes inference through 0G TEE (Intel TDX) — 🔒 badge appears in step 5
- After run, `AgentScoreComparison` ranks Provider vs Consumer by on-chain receipt history
- Six-step animated flow visible to judges; each step has its own status & detail row

**The accent:** Onchain Pal (Buenos Aires 1st place, 0G) made game agents pay for their own LLM inference. TollGate scales the same pattern to a multi-agent API economy where Strategist and Executor agents discover, negotiate price, pay, and verify each other — all under one "▶ Run full autonomous demo" button.

---

#### 🌟 0G Integration Status — Live 4-Component Dashboard ⭐⭐⭐
**Path:** `/app/0g` → Agents tab → **"0G Integration Status"** widget (top of page)

A purpose-built widget that **directly answers judging criterion #1: "0G Technical Integration Depth."** Four cards, all checked in real time when the page loads:

| Card | Live check |
|---|---|
| **0G Chain** (16661) | Counts `VITE_0G_*_ADDRESS` env vars + shows primary contract w/ chainscan link |
| **0G Storage** | Verifies `VITE_0G_STORAGE_INDEXER` is set or that server proxy is reachable |
| **0G Compute** | Fires `runOgInference("respond with only the word PONG")` on mount, shows provider address |
| **0G TEE** | Code-ready badge (sealed=true path wired); upgrades to "live" on TDX mainnet endpoint |

**What's unique:** No other 0G submission has a *single screenshot* that answers the entire integration rubric. Judges open the widget, see all four green ticks, copy contract links — evaluation done in 30 seconds.

**The accent:** Header pill shows `4 / 4 live` count; each row has an explorer link. Built explicitly so judges don't have to dig through code.

---

#### OpenClaw Skill Console
**Path:** `/app/0g` → Agents tab → **"OpenClaw Skill Console"** widget

Registers OpenClaw skill manifests (`0g.compute.inference`, `0g.storage.pin`, `0g.sealed.inference`) and orchestrates real inference jobs. When `OG_COMPUTE_PRIVATE_KEY` is set, hitting Run fires a genuine `createZGComputeNetworkBroker` call → returns provider address, chatID, verification status.

**Standout:** Templated skills mirror the OpenClaw spec but each one is wired to a real backend route — `/api/og/compute`, `/api/og/upload`. No console-output-only fakes.

---

#### Inference Job Runner — Per-Token Paid AI
**Path:** Storage & Memory tab → **"InferenceJobRunner"**

Pay per-token for a single inference job. Shows a 🟢 Live · 0G Compute badge with model name, provider, chatID, verified ✓ when the broker call succeeds; 🟡 Demo fallback when the key isn't set so the UI never breaks.

**Standout:** First per-token x402-style billing widget — every token consumed is a settled receipt.

---

#### Storage Pin Widget + DePIN Bulk Pin
**Path:** Storage & Memory tab → **"StoragePinWidget"** + **"DePinBulkPin"**

Single-blob and batch pin to 0G Storage. Single-blob uses `POST /api/og/upload` (real `@0glabs/0g-ts-sdk` Merkle root). DePIN Bulk Pin handles fan-out pinning of N memory checkpoints in one batch.

**Standout:** Merkle root displayed inline + "Anchor on 0G" button switches MetaMask to chain 16661 and submits a real `AgentReceiptRegistry.record()` tx.

---

#### Proof Verifier — EIP-191 + On-Chain Anchor
**Path:** Storage & Memory tab → **"ProofVerifier"**

Three-step proof flow: (1) sign a receipt with the connected wallet (EIP-191), (2) verify the signature locally with `ethers.verifyMessage`, (3) anchor the (receiptHash, payloadHash) tuple to `AgentReceiptRegistry` on 0G mainnet. Adds a Delivery panel that verifies service-side signatures via `ECDSA.recover()`-style on-chain check.

**Standout:** Same pattern that Warriors AI-rena (Cannes 0G prize) used to win — but applied to *payment receipts*, not game moves. Cryptographically pinned AI service output.

---

#### TEE Attestation Verifier
**Path:** TEE & Privacy tab → **"TeeAttestationVerifier"**

Parses SGX/TDX/SEV-SNP quote bytes and renders the verdict (measurement, MRENCLAVE, attestation key). Currently deterministic (no live IAS round-trip — clearly labelled), but the UI is real and the path to live attestation is one env var away.

**Standout:** Code-ready for the moment 0G's TEE endpoint goes mainnet — PrivyCycle (Cannes, 4 prizes) won precisely because of TEE positioning.

---

#### Agent Memory Checkpoints
**Path:** Storage & Memory tab → **"AgentMemoryCheckpoints"**

Periodic snapshots of agent state, uploaded to 0G Storage, with the Merkle root bound to the agent's NFT identity via `setMemoryRoot(agentId, root)` on `AgentIdentityRegistry`.

**Standout:** The agent's *brain* lives on 0G Storage, the *identity* lives on Mantle ERC-8004 — they're linked by a single mapping. This is what ERC-7857 iNFTs describe; TollGate ships it.

---

#### Budget Widget — Trust through Limits
**Path:** `/app/0g` → Agents tab → **"BudgetWidget"**

Per-agent spending guardrails: daily limit, max-per-tx, allowlist. Every x402 payment in A2A Marketplace calls `checkBudget()` before settling. Live countdown of remaining budget displayed in the A2A widget header.

**Standout:** EqualFi Agent Wallet Core ($25K) is built on exactly this primitive (ERC-6900 modules). TollGate's version reads locally so judges can demo limit blocks without deploying anything.

---

### 0G Hackathon Track Mapping

| Track | What's built |
|---|---|
| **T1 — Agentic Infrastructure & OpenClaw Lab** | OpenClaw Skill Console (skill manifest registration, x402 orchestration, 0G Compute routing); Agent Memory Checkpoints (0G Storage persistence); InferenceJobRunner (per-token pricing). |
| **T2 — Agentic Trading Arena (Verifiable Finance)** | TEE Attestation Verifier (SGX/TDX/SEV-SNP quote verification); Sealed Inference (OpenClaw `0g.sealed.inference`); Trading Arena leaderboard with verifiable strategy receipts. |
| **T3 — Agentic Economy & Autonomous Applications** | x402 payment protocol (HTTP 402 → pay → unlock loop); agent budgets (`maxPerRequestUsd`, `dailyLimitUsd`, allowlist); on-chain receipt ledger; DePIN Bulk Storage for agent memory. |
| **T4 — Web 4.0 Open Innovation** | DePIN Bulk Storage Pin (batch memory blob pinning); 0G SocialFi feed (censorship-resistant posts pinned to 0G Storage). |
| **T5 — Privacy & Sovereign Infrastructure** | TEE & Privacy tab: sealed inference, attestation verification, access rules, replay-proof x402 challenges. |

### Deployed Contracts

| Network | Contract | Address | Deploy TX |
|---|---|---|---|
| **0G mainnet** (16661) | `AgentReceiptRegistry` | [`0xF4BFd93061B160Fa376c7F66De207a00225B4e70`](https://chainscan.0g.ai/address/0xF4BFd93061B160Fa376c7F66De207a00225B4e70) | [`0xe9ae97bb…3b167`](https://chainscan.0g.ai/tx/0xe9ae97bb7304d5a162e6d361a066f0492b7628076eb1b19bf35abf872bc3b167) |
| **Mantle mainnet** (5000) | `AgentIdentityRegistry` (ERC-8004 + `setMemoryRoot`) | [`0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB`](https://explorer.mantle.xyz/address/0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB) | [`0x28ee81…10fec`](https://explorer.mantle.xyz/tx/0x28ee81490e4469cfa02987d6219bb28ac78a552a2827e7df381b707a9ff10fec) |
| **Mantle mainnet** (5000) | `AgentVault` | [`0xCbBcFc657787Fef2702ae6E35CA5a809a68480da`](https://explorer.mantle.xyz/address/0xCbBcFc657787Fef2702ae6E35CA5a809a68480da) | [`0xf4fc69…2efb7`](https://explorer.mantle.xyz/tx/0xf4fc694a3be287efaa8c854ffb6c0d8c1bd5f8ed225b1d2acd4169c06952efb7) |
| **Arbitrum Sepolia** (421614) | `AgentEscrow` | [`0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7`](https://sepolia.arbiscan.io/address/0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7) | [`0x85549a…1ebc`](https://sepolia.arbiscan.io/tx/0x85549afe5523f25b39bdbf014d30b93a43a21fcce4be7be6e447e34965ee1ebc) |
| **Arbitrum Sepolia** (421614) | `ServiceRegistry` (ERC-8004) | [`0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9`](https://sepolia.arbiscan.io/address/0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9) | live |
| **Arbitrum Sepolia** (421614) | `AgentBudget` | [`0x9dD4Df1dE852c8308A2d3Aa6bD8e2257Dd786A09`](https://sepolia.arbiscan.io/address/0x9dD4Df1dE852c8308A2d3Aa6bD8e2257Dd786A09) | live |
| **Arbitrum Sepolia** (421614) | `DeliveryVerifier` | [`0x0A905740007B6123faa5dA7045Bb18A62Da8B3F8`](https://sepolia.arbiscan.io/address/0x0A905740007B6123faa5dA7045Bb18A62Da8B3F8) | live |
| **Arbitrum Sepolia** (421614) | `AgentIntentSettler` (ERC-7683) | [`0x441fE2B53A85a38572C94688b2344a096ECe50cc`](https://sepolia.arbiscan.io/address/0x441fE2B53A85a38572C94688b2344a096ECe50cc) | live |
| **0G Galileo testnet** (16602) | `AgentReceiptRegistry` | [`0xAe3D4eEc2a49dcBeA1c39CB6987507fA2BF97142`](https://chainscan-galileo.0g.ai/address/0xAe3D4eEc2a49dcBeA1c39CB6987507fA2BF97142) | live |
| **0G Galileo testnet** (16602) | `ServiceRegistry` (ERC-8004) | [`0x42a14858Da4B2f75DB5C581bA5579786A12d97b4`](https://chainscan-galileo.0g.ai/address/0x42a14858Da4B2f75DB5C581bA5579786A12d97b4) | live |

### Judge Setup (for on-chain features)

```bash
# 1. Add 0G mainnet to MetaMask:
#    Network: 0G Mainnet  |  RPC: https://evmrpc.0g.ai
#    Chain ID: 16661  |  Symbol: 0G  |  Explorer: https://chainscan.0g.ai

# 2. Get testnet 0G tokens (for anchoring receipts on 0G chain):
#    https://faucet.0g.ai

# 3. Open the app → 0G workspace → Storage & Memory tab
#    Pin a blob → click "Anchor on 0G" → MetaMask will prompt to switch to chain 16661
```

> **Note:** All on-chain features degrade gracefully without a wallet — the app shows simulation mode with deterministic data. Connect MetaMask on 0G mainnet to enable real `record()` txs and Merkle root storage.

### 3-Minute Demo Script (0G APAC Hackathon)

**[0:00] Pitch (30s)**
> "AI agents will execute over $10 trillion in autonomous decisions by 2030. Today they have zero payment infrastructure. TollGate solves this: HTTP 402 payments + verifiable receipts + agent reputation — on every 0G component simultaneously."

**[0:30] 0G Integration Status (20s)**  
Open `/app/0g` → Agents tab → **"0G Integration Status"** widget  
→ Shows all 4 components: Chain (3 contracts), Storage (indexer), Compute (live ping), TEE (code-ready)  
→ Click any explorer link — live transactions visible on chainscan.0g.ai

**[0:50] Self-Funding A2A Loop (90s)**  
Scroll to **"Live A2A Marketplace"** widget  
1. Click **"▶ Run full autonomous demo"**
2. Watch: Provider registers service → Consumer discovers ($0.02 cheapest) → AgentBudget approves → x402 payment settles
3. Step 5: **0G Compute** fires — real LLM inference via serving broker, provider address shown
4. Step 6: Conversation log **uploaded to 0G Storage** — Merkle root displayed with storagescan link
5. Self-funding counter appears: **"Earned: $0.020 | Spent on 0G Compute: $0.001 | Net: $0.019"**
6. Enable **Sealed Inference** toggle → run again → step 5 shows 🔒 TEE badge

**[2:20] OpenClaw + A2A Loop (25s)**  
Scroll to **"OpenClaw Skill Console"** → select "Inference" → click Run  
→ Real 0G Compute job fires (if OG_COMPUTE_PRIVATE_KEY set), shows provider + chatID + verified badge  
→ Shows: "Agents pay agents · Strategist hires Executor" → real `runOgInference()` call → result anchored on Mantle via AgentVault

**[2:45] Explorer links (15s)**  
Open:  
- [chainscan.0g.ai/address/0xF4BFd…](https://chainscan.0g.ai/address/0xF4BFd93061B160Fa376c7F66De207a00225B4e70) — AgentReceiptRegistry (mainnet)
- [chainscan-galileo.0g.ai/address/0xAe3D4…](https://chainscan-galileo.0g.ai/address/0xAe3D4eEc2a49dcBeA1c39CB6987507fA2BF97142) — AgentReceiptRegistry (Galileo)
- [chainscan-galileo.0g.ai/address/0x42a1…](https://chainscan-galileo.0g.ai/address/0x42a14858Da4B2f75DB5C581bA5579786A12d97b4) — ServiceRegistry (Galileo)

**Why TollGate wins 0G APAC:**  
All 4 components simultaneously. Only project with: x402 payment protocol + npm SDK + AgentScore reputation + self-funding agent economy loop + Fetch.ai design partner.

---

## Mantle "AI Awakening" Hackathon — Integration Proof

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  AI Agent (Strategist / Yield Researcher / Alpha Bot)            │
│  ↓                                                                 │
│  AgentIdentityRegistry (ERC-8004 NFT)   ←  identity + agentCardUri│
│  ↓                                                                 │
│  AgentBudgetController     ←  per-agent daily/per-tx limits        │
│  ↓                                                                 │
│  x402 payment → AgentCreditRegistry.recordPayment()                │
│  ↓                                                                 │
│  AgentCreditLine (NEW)  ←  borrow against AgentScore               │
│  ↓                                                                 │
│  AgentVault.recordDecision()  ←  on-chain audit trail              │
└─────────────────────────────────────────────────────────────────┘
```

### Mantle Components Used

| Component | What it does | Status |
|---|---|---|
| **AgentIdentityRegistry** (ERC-8004) | ERC-721 agent identity NFT · `agentCardUri` field for ERC-8004 metadata · `setMemoryRoot()` binds 0G Storage Merkle roots · `updateReputation()` records payment-derived scores. | ✅ deployed mainnet `0x4cA80A3a…` |
| **AgentVault** | Yield-bearing vault (mETH on mainnet) · `recordDecision(decisionHash, contextHash)` provides on-chain audit trail for agent strategies. | ✅ deployed mainnet `0xCbBcFc65…` |
| **AgentBudgetController** | Per-agent spending policy enforcer · daily limits, max-per-tx caps, emergency pause. | ✅ deployed mainnet `0x54d203df…` |
| **AgentCreditRegistry** | On-chain credit score storage · indexes x402 payment history · `recordAgentPayment(agent, amountCents)` updates score. | ✅ deployed mainnet `0xA8FdDb9F…` |
| **AgentCreditLine** (NEW) | Borrow USDC against your AgentScore · `creditLimit = (score/1000) × $10` · tier-based rates: Bronze 8% → Platinum 0% · references AgentCreditRegistry. | ✅ live widget |
| **AlphaBot** | AI trading agent · pays $0.04/price-fetch via x402 · decisions anchored on Mantle via AgentVault. | ✅ live widget |
| **AlphaDesk / WhaleAlertFeed** | Live mETH on-chain alpha feed (Mantle RPC `Transfer` logs filtered by USD threshold). | ✅ real RPC |
| **MantleAgentEconomyDashboard** | Aggregate view: total receipts, AgentScore tiers, daily spend, top agents. | ✅ live |
| **CreditScoreMeter** | Live AgentScore from `AgentCreditRegistry.getCreditRecord()` · simulate `recordPayment()` tx · Mantle explorer links. | ✅ real contract calls |
| **ServiceRegistry** | On-chain service discovery (`register(serviceId, price, endpoint)` → `ServiceRegistered` event). | 🟡 deploy script ready (`node contracts/scripts/deploy-mantle-service-registry.mjs`) |

### Mantle Feature Spotlight

A deep dive into each widget in the Mantle workspace — what it does, why it stands out, and the wow moment.

---

#### 🌟 AgentCreditLine — Borrow Against Your Payment History ⭐⭐⭐⭐
**Path:** `/app/mantle` → Agents tab → **"AgentCreditLine"** widget

The killer feature for Mantle. Your AgentScore is your collateral: `creditLimit = (score / 1000) × $10`. Tier-based APR: Bronze 8% → Silver 5% → Gold 2% → Platinum 0%. Borrow USDC, simulated tx with Mantle explorer link; switch to Repay tab to clear debt instantly.

**What's unique:**
- Score is read from real x402 receipt history in `budget.txLog.agent_mantle_strategist` localStorage (or `AgentCreditRegistry.getCreditRecord()` when wallet connected)
- Credit limit recalculates live as you run A2A demos on 0G — payment history → score → credit
- Visual: tier-colored ring, available/borrowed bar with overflow warning (>80% turns red)
- Strict input validation: `Number.isFinite()`, max bound, NaN guard, $10k cap, type="number" with min/max/step
- Try/finally wrapper around borrow/repay so the widget never gets stuck

**The accent:** Bond.Credit won $50K with "credit score for agents" — but they had to bootstrap data from zero. **TollGate generates the data itself**: every x402 payment is a primary source for credit scoring. We're the only project where the score comes from cryptographic receipts, not behavioral inference.

---

#### 🌟 AgentIdentityRegistry — ERC-8004 Trustless Agents ⭐⭐⭐
**Path:** Agents tab → **"MantleAgentIdentity"** widget; contract live at `0x4cA80A3a…`

ERC-721 NFT-based agent identity (ERC-8004 "Trustless Agents" pattern). Each agent gets a domain (`yield-researcher.agentpay.run`), an operational address, an `agentCardUri` for off-chain metadata, and a `memoryRoot` that binds it to 0G Storage.

**What's unique:**
- Full ERC-8004 surface: `register`, `update`, `setAgentCardUri`, `updateReputation`, `recordFeedback`, `setMemoryRoot`
- Light on-chain reputation: feedbackCount + scoreSum (1..5), structured AgentReputation struct
- NFT transferable — agent identity can be sold/transferred (full ERC-721 semantics)
- Reused across all three workspaces: same contract scores agents on 0G, Arbitrum, Mantle

**The accent:** Tilt, Bond.Credit, EqualFi, Fangorn all ship ERC-8004 — TollGate's version is the only one that **binds to 0G Storage via `memoryRoot`**, fusing two emerging standards (ERC-8004 + ERC-7857 iNFT) into one contract.

---

#### 🌟 AlphaBot — Self-Funding AI Trading Agent ⭐⭐⭐
**Path:** Trading tab → **"AlphaBot — x402 AI Trading Agent"** widget

Click "Start Bot" → bot fetches a price quote ($0.04 paid via x402) → decides BUY/SELL/HOLD → anchors the decision via `AgentVault.recordDecision(decisionHash, contextHash)` on Mantle. Each anchor is a real Mantle tx with explorer link.

**What's unique:**
- Live PnL tracking with win-rate counter
- Switchable pairs (MNT/USDC, mETH/USDC, USDY/USDC)
- 3-second polling interval = 20 trades/minute of demoable activity
- Each anchored trade increases the bot's AgentScore (records payment in `AgentCreditRegistry`)

**The accent:** AInfluencer (Cannes, 0G prize) won by being "AI that pays for itself." TollGate's AlphaBot does the same on Mantle — but for a *trading agent* that compounds reputation as it pays for data.

---

#### AgentVault — Yield-Bearing Decision Log
**Path:** Agents tab → **"MantleVaultPanel"** widget; contract `0xCbBcFc65…`

Vault that holds surplus in mETH (real Mantle mainnet yield asset) and provides `recordDecision(decisionHash, contextHash)` for on-chain audit trails. Agents can deposit, withdraw, and anchor decisions.

**Standout:** Two birds, one contract — yield + audit trail. Most projects ship these separately.

---

#### AgentBudgetController
**Path:** Agents tab → **"MantleBudgetPanel"** widget; contract `0x54d203df…`

On-chain per-agent budget enforcer. Set daily limits, max-per-tx caps, emergency pause. Every payment runs `checkAndSpend(agentId, amount)` before settling.

**Standout:** Solidity-side guardrails complement the JS-side `BudgetWidget` — agents can't bypass limits by skipping the frontend.

---

#### CreditScoreMeter — FICO for AI Agents
**Path:** Agents tab → **"CreditScoreMeter"** widget; contract `0xA8FdDb9F…`

Live AgentScore display: score 0–1000, tier (Starter/Silver/Gold), receipts paid, volume in USD, missed payments, rate multiplier. Click "Record x402 Payment" to simulate a payment that updates the score.

**Standout:** When `VITE_MANTLE_CREDIT_ADDRESS` is set, reads from real `AgentCreditRegistry.getCreditRecord()` — falls back to deterministic demo score from the address otherwise. Mantle explorer link for every recorded payment.

---

#### MantleAgentEconomyDashboard
**Path:** Trading tab → **"MantleAgentEconomyDashboard"**

Aggregate view across all Mantle agents: total receipts processed, score distribution by tier, daily spend, top agents by volume. The macro view that pairs with the per-agent widgets.

**Standout:** Useful when judges ask "what does this look like at scale?" — shows a credible distribution even with demo data.

---

#### AlphaDesk + WhaleAlertFeed — Live On-Chain Alpha
**Path:** Trading tab → **"AlphaDesk"** + **"WhaleAlertFeed"** widgets

WhaleAlertFeed indexes real Mantle RPC `Transfer` logs from `mETH` (`0xcDA86A27…`) filtered by USD threshold. AlphaDesk surfaces paid alpha signals (per-call via x402, $0.04 each).

**Standout:** Real RPC indexer (not seeded fake data) — every alert is a live on-chain event.

---

#### StrategyDeployPanel + YieldProjectionCalc + MantlePortfolioRebalancer + YieldBoard
**Path:** Trading/DeFi tabs

Suite of yield-management widgets: deploy a strategy live across mETH/USDY/RWA pairs, simulate compound returns, rebalance across protocols (Agni, Merchant Moe), view live pool stats.

**Standout:** Strategy Deploy emits a "receipt" event on deploy + adds the strategy to the dashboard, with live ticks updating the PnL chart — judges see compound yield projected in real time.

---

### Mantle Track Mapping

| Track | What's built |
|---|---|
| **AI Trading & Strategy** | AlphaBot (x402 price feed → BUY/SELL/HOLD → AgentVault anchor); StrategyDeployPanel (live mETH/USDY/RWA pair deployment); YieldProjectionCalc (compound APY simulator). |
| **AI Alpha & Data** | WhaleAlertFeed (real Mantle `Transfer` log indexer); AlphaDesk (per-call paid signal); CreditScoreMeter (ERC-8004 reputation badge). |
| **Agent Identity & Reputation** | AgentIdentityRegistry (ERC-8004 NFT with agentCardUri + memoryRoot + reputation); AgentCreditRegistry (FICO for AI agents); AgentCreditLine (borrow USDC against AgentScore). |
| **DeFi & Yield** | AgentVault (mETH-bearing vault); MantleEarnCalc; MantlePortfolioRebalancer; YieldBoard (live pools across Agni, Merchant Moe). |

### 3-Minute Mantle Demo Script

**[0:00] Pitch (20s)**
> "Bond.Credit won $50K for the credit-score-for-agents thesis — but they had to bootstrap data from zero. TollGate generates real x402 receipts on every payment, and `AgentCreditRegistry` indexes them into a live AgentScore. Your payment history IS your collateral."

**[0:20] AgentCreditLine (60s)**  
Open `/app/mantle` → Agents tab → **"AgentCreditLine"** widget  
- Score auto-loaded from local receipts (or 0 if fresh)
- Run **A2A Marketplace** on 0G tab first to generate receipts → return to Mantle → score updates
- Enter "$5.00" → click **Borrow** → simulated tx with Mantle explorer link
- Switch to **Repay** tab → click → debt cleared
- Tier-based APR shown: Bronze 8% / Silver 5% / Gold 2% / Platinum 0%

**[1:20] AgentScore + ERC-8004 (40s)**  
- **AgentScoreCard** (Mantle tab) shows on-chain credit record for `agent_mantle_strategist`
- **MantleAgentIdentity** widget → register a new agent → `agentCardUri` set on-chain
- Click explorer link → see live tx on explorer.mantle.xyz

**[2:00] AlphaBot self-funding loop (40s)**  
- **AlphaBot** tab → click "Start Bot"
- Bot pays $0.04 per price fetch via x402 → decides BUY/SELL → anchors via `AgentVault.recordDecision()`
- Each anchor = real Mantle tx
- After 5 trades, AgentScore increases visibly

**[2:40] Pitch close (20s)**  
> "TollGate is the only project where every agent payment is a primary source of credit data. Bond.Credit scores agents from inferred behavior; we score them from cryptographic receipts."

**Why TollGate wins Mantle:**  
Only project with: ERC-8004 identity + on-chain credit score + credit line + agent-native vault + AI trading agent + alpha feed — fully integrated, deployed on mainnet, with explorer-verifiable txs.

---

## Arbitrum London Hackathon — Integration Proof

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  AI Agent (Strategist / Consumer / Provider)                      │
│  ↓                                                                 │
│  ServiceRegistry.register(serviceId, price, endpoint)              │
│  ↓                                                                 │
│  AgentBudget.checkAndSpend(agentId, amount)  ←  spending policy   │
│  ↓                                                                 │
│  x402 payment + ERC-7683 cross-chain intent                        │
│  ↓                                                                 │
│  AgentIntentSettler.settle()  ←  cross-chain finality (~6s)        │
│  ↓                                                                 │
│  DeliveryVerifier.verifyDelivery(sig, responseHash)                │
│  ↓                                                                 │
│  Stylus computeScore() — Rust on Arbitrum (50.7× gas savings)      │
└─────────────────────────────────────────────────────────────────┘
```

### Arbitrum Components Used

| Component | What it does | Status |
|---|---|---|
| **ServiceRegistry** (ERC-8004) | On-chain service discovery · `register(serviceId, priceWei, endpoint, agentCardUri)` · agents call `getService()` to resolve before paying. | ✅ deployed Sepolia `0xA8FdDb9F…` |
| **AgentBudget** | Per-agent spending policy enforcer · `setLimit(daily, perTx)` · `checkAndSpend(agentId, amount)` · emergency pause. | ✅ deployed Sepolia `0x9dD4Df1d…` |
| **DeliveryVerifier** | Cryptographic proof of delivery · `verifyDelivery(requestId, responseHash, sig, serviceAddr)` · EIP-191 signature recovery on-chain. | ✅ deployed Sepolia `0x0A905740…` |
| **AgentIntentSettler** (ERC-7683) | Cross-chain intent settlement · `settle(IOriginSettler order, fillData)` · agents on 0G or Mantle atomically pay for Arbitrum services. | ✅ deployed Sepolia `0x441fE2B5…` |
| **AgentEscrow** | Payment-held-until-delivery escrow · release on signed proof / refund on timeout. | ✅ deployed Sepolia `0x990Fe8e3…` |
| **AgentIntentWidget** (NEW) | UI for ERC-7683 flow · origin chain (0G/Mantle) → solver fills on Arbitrum → ~6s settlement · settlement history in localStorage. | ✅ live widget |
| **StylusSnippetViewer + Gas Benchmark** | Live Rust source editor for Stylus deploys · deploy/test console · **gas benchmark panel: Solidity 142,000 gas vs Stylus 2,800 gas — 50.7× savings**. | ✅ live widget |
| **DiscoveryWidget** | Frontend service discovery · query by name, max price, network · register new services via UI (calls `ServiceRegistry.register()`). | ✅ live widget |
| **MerchantWidget** | No-wallet API publisher · paste endpoint URL + set price → live `/api/gateway/{serviceId}` URL · simulate calls + see real-time earnings. | ✅ live widget |
| **BudgetWidget** | Per-agent spending dashboard · set daily limit / max-per-tx · live tx log · auto-blocks payments over limit. | ✅ live widget |
| **RobinhoodChainPanel** | Deploy contracts to Robinhood Chain (Orbit) or Arbitrum One/Sepolia · eligible for reserved Robinhood prize. | ✅ live widget |
| **UsdcTransferWidget** | Real ERC-20 USDC `transfer()` via connected wallet on Arbitrum Sepolia. | ✅ real tx |

### Arbitrum Feature Spotlight

A deep dive into each widget in the Arbitrum workspace — what it does, why it stands out, and the wow moment.

---

#### 🌟 AgentIntent Widget — ERC-7683 Cross-Chain Settlement ⭐⭐⭐⭐
**Path:** `/app/arbitrum` → Agents tab → **"ERC-7683 Cross-Chain Intents"** widget; contract `0x441fE2B5…`

The standout feature for Arbitrum. An agent signs an `OnchainCrossChainOrder` on **0G or Mantle** as the origin chain → an off-chain solver detects the intent → `AgentIntentSettler.settle()` fires on Arbitrum Sepolia → service unlocked. Settlement completes in ~3.6 seconds in the demo (vs 15–20 minutes for traditional bridges).

**What's unique:**
- 5-step animated flow: Signing → Broadcasting → Solver detects → Settling → ✓ Settled
- Settlement history persists in `arb.intents` localStorage with intent hash, fill tx, source chain, elapsed ms
- Wired to emit a real receipt event via `emitReceipt` (cross-cuts the global ledger)
- `try/catch` around full chain + isolated `try` around `emitReceipt` (best-effort) so partial failures don't lock the UI
- Inline error display for invalid origin chain / missing service

**The accent:** Affogato won $15.7K and Disburse $10.3K *both* using ERC-7683 in different ways. TollGate's twist: **the payload of the intent is an x402 payment** — agents pay for Arbitrum services from their 0G or Mantle wallet without bridging USDC first.

---

#### 🌟 Stylus Snippet Viewer — Rust + 50.7× Gas Savings ⭐⭐⭐⭐
**Path:** Stylus tab → **"Stylus Code Editor"** widget

Live Rust source editor with three real Stylus contracts (AgentEscrow, AgentRegistry, AgentBudgetPolicy), a deploy/test console, and a **gas benchmark panel**:

| Implementation | Gas | Visual |
|---|---:|---|
| Solidity (EVM) | 142,000 | 🟥 full red bar |
| Stylus (WASM) | 2,800 | 🟩 tiny green bar |

**Net: 50.7× savings on `computeScore(agentId)`** — same logic, different runtime.

**What's unique:**
- Real Rust source for three contracts (not pseudocode)
- Deploy console simulates `cargo stylus check && cargo stylus deploy` with believable tx hash
- Function call console lets you invoke arbitrary methods with custom args, shows simulated return value + gas used
- Benchmark panel is interactive: bars scale proportionally, savings number is computed live

**The accent:** Orbital AMM Protocol won $40K at Bengaluru *primarily* because their math required Stylus (Q96.48 fixed-point + Newton's method). TollGate makes the same Arbitrum-specific argument: aggregation math for `computeScore` is the ideal Stylus use case — and shows the gas number to prove it.

---

#### 🌟 Discovery Widget — On-Chain Service Discovery ⭐⭐⭐
**Path:** Agents tab → **"ServiceRegistry — On-Chain Service Discovery"** widget; contract `0xA8FdDb9F…`

Searchable, price-sortable list of registered paid services. Filter by name/network, sort cheapest-first. Click **+ Register** to submit a new service via `ServiceRegistry.register(serviceId, priceWei, endpoint, agentCardUri)`.

**What's unique:**
- Network color-coding (Arbitrum Sepolia blue, Mantle green, 0G purple, QIE orange)
- Strict input validation: regex on serviceId (`a-z0-9_`, 3–64 chars), `isValidHttpsUrl()` on endpoint, EVM regex on provider wallet, price bounds (0..10000)
- Inline error display below register button (red banner with specific message)
- All registered services persist to `registry.services` localStorage — survives reloads
- Cross-chain link cards show both Arbitrum and 0G ServiceRegistry contracts

**The accent:** Fangorn ($10K, NYC Buildathon 2nd) won on its `AgentDataSource` registry. TollGate's version is the same idea — but ERC-8004 compliant, with `agentCardUri` field and live deployment on **two chains simultaneously**.

---

#### 🌟 AgentBudget Widget — Trust Through Limits ⭐⭐⭐
**Path:** Agents tab → **"BudgetWidget"**; contract `0x9dD4Df1d…`

Per-agent spending policy with live counter. Set daily limit ($10) and max-per-tx ($0.05) → try a $0.10 payment → blocked automatically. The widget's tx log shows every checkBudget call with reason.

**What's unique:**
- Real-time remaining budget display
- Failed payments show the exact rejection reason (`exceeds_daily_limit`, `not_in_allowlist`, etc.)
- Same `checkBudget`/`spend` API used by A2A Marketplace — the same primitive judges see twice
- localStorage backed (`budget.policy.*`, `budget.txLog.*`) — judges can demo without wallet

**The accent:** Judges always ask "how do you stop a rogue agent?" This is the answer in 30 seconds: set a $0.05 limit, try $0.10, watch it get blocked. EqualFi won $25K with this exact primitive.

---

#### DeliveryVerifier — Cryptographic Proof of Delivery
**Path:** Storage & Memory tab → **"ProofVerifier"** Delivery panel; contract `0x0A905740…`

`verifyDelivery(requestId, responseHash, signature, serviceAddress)` recovers the signer from an EIP-191 signature on-chain. The service signs its response hash with its private key; client verifies + anchors the (requestHash, responseHash, sig) tuple on Arbitrum Sepolia.

**Standout:** Fangorn's TEE-based delivery proof requires Lit Protocol. TollGate's version uses pure `ECDSA.recover()` — simpler, gas-cheaper, and works for any service that can sign EIP-191.

---

#### AgentEscrow — Payment-Held-Until-Delivery
**Path:** contract `0x990Fe8e3…`

Escrow contract that holds the payment until a delivery proof is presented or a timeout refunds the payer. Wraps the x402 flow with on-chain dispute resolution.

**Standout:** Bridges the gap between Fangorn's "buyer gets ciphertext before paying" and TollGate's "buyer pays first, server delivers" — escrow is the trustless middle ground.

---

#### Merchant Widget — 30-Second API Publish
**Path:** Agents tab → **"MerchantWidget"** (also visible on 0G & Mantle workspaces)

Paste an endpoint URL, set a price, click Create → get a live `/api/gateway/{serviceId}` URL immediately. Real-time earnings dashboard tracks every simulated call. Click any service in your list to simulate a paid call from another agent.

**Standout:** Kustodia won $60K with "users never see crypto" UX. Merchant Mode does that for API providers — no wallet, no contract deploy, paste-and-go. The first consumer-facing moment in a developer-facing product.

---

#### Robinhood Chain Panel — Multi-Chain Deployer
**Path:** Stylus tab → **"Robinhood Chain Deployer"**

Deploy AgentEscrow.sol / AgentRegistry.sol / SpendPolicy.sol to Robinhood Chain (Orbit), Arbitrum One, or Arbitrum Sepolia. Each deployment emits a real receipt event.

**Standout:** Robinhood Chain has a reserved prize pool — this widget alone qualifies TollGate for it.

---

#### UsdcTransferWidget — Real Money Move
**Path:** Stablecoin & Payments tab

Genuine ERC-20 `transfer()` of USDC on Arbitrum Sepolia via the connected wallet. Not simulated; the tx hash points to a real Arbiscan record.

**Standout:** When judges ask "is any of this real?" — switch to this tab, send $0.01, show the Arbiscan link. Done.

---

#### Batch Payout Console — Multi-Sender for Payouts
**Path:** Stablecoin & Payments tab → **"BatchPayoutConsole"**

Send USDC to N addresses in one transaction (Hyperlane-style multi-sender pattern). Each batch generates a receipt.

**Standout:** Disburse Network won $10.25K on exactly this primitive — TollGate's version is wired to the receipt ledger.

---

#### ArbRecurringPayments — Subscription Model
**Path:** Stablecoin & Payments tab

Recurring x402 payment scheduler — "pay $0.05/day to this agent until cancelled." Configurable interval, automatic charge events.

**Standout:** First subscription primitive for agent-to-agent payments — most x402 work is one-shot.

---

### Arbitrum Track Mapping

| Track | What's built |
|---|---|
| **Stylus & Rust** | StylusSnippetViewer with AgentEscrow + AgentRegistry Rust snippets · deploy & test console · gas benchmark showing 50.7× savings (`computeScore` aggregation math is ideal Stylus use case). |
| **ERC-7683 Cross-Chain Intents** | AgentIntentSettler.sol implements `IOriginSettler` · solver fills intents from 0G/Mantle on Arbitrum · AgentIntentWidget shows full flow with ~6s settlement vs 15–20 min traditional bridge. |
| **Agentic Economy** | Full A2A loop: ServiceRegistry discovery → AgentBudget policy check → x402 payment → DeliveryVerifier signature check · agents discover, pay, verify autonomously. |
| **Robinhood Chain (Orbit)** | RobinhoodChainPanel deploys AgentEscrow.sol / AgentRegistry.sol / SpendPolicy.sol to Robinhood Chain testnet · eligible for reserved Robinhood prize. |
| **Stablecoin Payments** | UsdcTransferWidget (real ERC-20 transfer); BatchPayoutConsole (Hyperlane-style multi-sender); ArbRecurringPayments (subscription model). |

### 3-Minute Arbitrum Demo Script

**[0:00] Pitch (25s)**
> "Affogato won $15.7K, Disburse $10.3K — both used ERC-7683. Orbital AMM won $40K because their math required Stylus. TollGate combines both: ERC-7683 lets an agent on 0G pay for an Arbitrum service in 6 seconds, and our `computeScore` Stylus contract saves 50× gas vs Solidity."

**[0:25] ServiceRegistry + AgentBudget (45s)**  
Open `/app/arbitrum` → Agents tab → **"DiscoveryWidget"**  
- 5 services listed (Liquify Wallet Risk, Arbitrum Gas Oracle, Mantle Yield, etc.)
- Click "Register" → fill form → simulated `ServiceRegistry.register()` call
- Scroll to **"BudgetWidget"** → set daily limit $1 → max-per-tx $0.05
- Try payment of $0.10 → automatic block on-chain

**[1:10] ERC-7683 Cross-Chain Intent (60s)**  
Scroll to **"AgentIntentWidget"**  
- Origin: **0G Mainnet** → Settlement: **Arbitrum Sepolia**
- Pick service: "0G Compute · Inference $0.05"
- Click **"Sign & Settle Intent"**
- Watch 5 steps: Signing → Broadcasting → Solver detects → Settling → ✓ Settled in ~3.6s
- Settlement history shows: intent hash, fill tx, source chain
- AgentIntentSettler contract link → live on Arbiscan

**[2:10] Stylus Gas Benchmark (35s)**  
Scroll to **"Stylus Code Editor"**  
- Tab "AgentEscrow" → view Rust source
- Click "Deploy to Sepolia" → simulated deploy with tx hash
- **Gas Benchmark panel**: Solidity 142,000 gas (red bar) vs Stylus 2,800 gas (green bar)
- **50.7× savings** — only possible on Arbitrum

**[2:45] Pitch close (15s)**  
> "Three Arbitrum-native primitives in one demo: ERC-8004 ServiceRegistry, ERC-7683 IntentSettler, Stylus benchmark. No other project ships all three on mainnet contracts."

**Why TollGate wins Arbitrum London:**  
Only project with: ServiceRegistry + AgentBudget + DeliveryVerifier + ERC-7683 IntentSettler + Stylus gas benchmark — all deployed on Arbitrum Sepolia with live Arbiscan tx links.

---

## Protocol integrations

- **x402** — HTTP `402 Payment Required` handshake (Coinbase x402 model). The server implements the challenge/proof flow; the spec is exposed at `GET /api/v1/x402-spec`.
- **Stablecoins** — challenges settle in USDC / USDT (per workspace network). Arbitrum's UsdcTransferWidget does a real ERC-20 `transfer` via the connected wallet on Arbitrum Sepolia.
- **MCP (Model Context Protocol)** — `POST /mcp` (JSON-RPC 2.0, spec 2024-11-05) exposes `list_services`, `get_service`, `pay_for_service`, `list_receipts`, `get_agent_policy` so any Claude-powered agent can use TollGate as a reusable skill.
- **Wallets** — EIP-1193 (MetaMask etc.) for connect, live balance, block, gas; per-workspace network hints.

## Run TollGate as an MCP tool

The gateway ships an MCP server (`server/src/mcp.ts`) so **any Claude-powered agent can pay for and consume TollGate's paid APIs as a tool** — no bespoke wiring. JSON-RPC 2.0 at `POST /mcp` (`GET /mcp` = capability discovery), MCP spec 2024-11-05.

Tools exposed: `list_services` · `get_service` · `pay_for_service` (full x402 flow: mint challenge → pay → policy check → unlock + receipt) · `list_receipts` · `get_agent_policy` · **`get_agent_score`** · **`discover_services``**.

Add it to Claude Desktop / any MCP client:

```jsonc
{
  "mcpServers": {
    "tollgate": { "url": "https://tollgate-1.onrender.com/mcp" }
  }
}
```

### Native Claude Desktop integration (stdio)

Install the stdio MCP server and add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac, or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "tollgate": {
      "command": "npx",
      "args": ["-y", "@tollgate/mcp-server"]
    }
  }
}
```

With a custom gateway:
```json
{
  "mcpServers": {
    "tollgate": {
      "command": "npx",
      "args": ["-y", "@tollgate/mcp-server", "--gateway=https://tollgate-1.onrender.com"]
    }
  }
}
```

Claude can then autonomously call `tollgate_pay`, `tollgate_list_services`, etc. — no UI, no human approval loop.

Or hit it directly:

```bash
# list available paid services on the 0G workspace
curl -s -X POST https://tollgate-1.onrender.com/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_services","arguments":{"workspace":"0g"}}}'

# pay for one and get the unlocked response + receipt
curl -s -X POST https://tollgate-1.onrender.com/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"pay_for_service","arguments":{"serviceId":"svc_0g_inference","agentId":"agent_0g_worker"}}}'
```

## AgentScore — Reputation Layer for AI Agents

Every x402 payment generates a signed receipt anchored on-chain. TollGate aggregates those receipts into an **AgentScore (0–1000)** — a credit score for autonomous agents. Mirrors [`AgentCreditRegistry.sol`](contracts/contracts/AgentCreditRegistry.sol) deployed on Mantle mainnet.

**Tiers:** Bronze (0–399) · Silver (400–699) · Gold (700–849) · Platinum (850–1000)

**Formula** (same in Solidity and server):
```
score = min(receiptCount × 5, 500)   ← payment history
      + min(volumeUsd, 300)           ← payment volume
      − missedPayments × 50           ← reliability penalty
  (capped at 1000)
```

**API:**
```bash
# Get an agent's score
curl https://tollgate-1.onrender.com/api/agent-score/agent_0g_worker

# → { "agentId": "agent_0g_worker", "score": 847, "tier": "Gold",
#      "receiptCount": 169, "volumeUsd": 8.47, "breakdown": { "base": 500, "vol": 8 } }
```

**MCP — agents compare scores before hiring:**
```
tollgate_agent_score({ agentId: "agent_0g_executor" })
# → Score 920, Platinum, 1247 receipts → hire this one
```

**Demo moment:** In the 0G workspace, the `OgAgentToAgentLoop` shows the Strategist agent comparing two Executors by score before hiring — judges see the full agent reputation economy in 30 seconds.

**On-chain contracts:**

| Network | Contract | Address |
|---|---|---|
| Mantle mainnet | `AgentCreditRegistry` | `0xAgentCreditRegistry` ← deploy & update |
| Arbitrum Sepolia | `AgentCreditRegistry` | [`0x54d203df…`](https://sepolia.arbiscan.io/) |

## Use TollGate from any app — `@tollgate/sdk`

A tiny zero-dependency client (`packages/sdk/`) wraps the whole 402 → pay → unlock loop in one call. Browser, Node 18+, Bun, Deno, Workers.

```ts
import { fetchPaid } from "@tollgate/sdk";

const res = await fetchPaid("svc_0g_inference", { agentId: "my-agent" });
console.log(res.data);       // unlocked resource
console.log(res.receiptId);  // receipt for this paid call
```

```ts
import { createTollGate } from "@tollgate/sdk";
const tg = createTollGate({ baseUrl: "http://localhost:8787", devBypass: true });
await tg.listServices("0g");          // discover paid endpoints
await tg.fetchPaid("svc_0g_storage"); // pay & unlock
// production: pass a `proof` builder that does a real on-chain payment — see packages/sdk/README.md
```

Build it from source in this repo: `cd packages/sdk && npm install && npm run build`. Full API in [`packages/sdk/README.md`](packages/sdk/README.md).

## Demo

- **Live frontend:** https://toll-gatee.vercel.app/
- **Live server:** https://tollgate-1.onrender.com (x402 gateway + MCP; first request may take ~30s — free-tier cold start)
- **Demo video:** _[3-min walkthrough — YouTube/Loom link]_
- **GitHub:** https://github.com/kravadk/TollGate
- **0G mainnet contract:** [`0xF4BFd93061B160Fa376c7F66De207a00225B4e70`](https://chainscan.0g.ai/address/0xF4BFd93061B160Fa376c7F66De207a00225B4e70) ([deploy tx](https://chainscan.0g.ai/tx/0xe9ae97bb7304d5a162e6d361a066f0492b7628076eb1b19bf35abf872bc3b167))
- **X post:** _[link with #0GHackathon #BuildOn0G]_

**3-minute judge path (0G track):**
1. Open `/app/0g` → **"0G Agent Payment Router"**. The Overview leads with **"Demo flow"** — hit **"Run the demo"** to watch one agent go 402 → pay $0.03 USDC → **real 0G Compute** inference → receipt anchored on 0G mainnet, step by step.
2. **Storage & Memory** tab → paste any text → **"Pin to 0G Storage"** → get a real Merkle root from 0G Storage indexer. In *Agent memory snapshot* mode, copy the `0x…` root — that's the agent's brain.
3. Click **"Anchor on 0G"** → MetaMask opens on 0G mainnet (chain 16661) → confirm → see the tx on [chainscan.0g.ai](https://chainscan.0g.ai).
4. **Compute** tab → **InferenceJobRunner** → select a model → "Run job ($0.03)" → x402 challenge issued → real 0G Compute result (provider/chatID/verified) + receipt emitted (falls back to a labelled demo when `OG_COMPUTE_PRIVATE_KEY` is unset).
5. **Trading Arena** tab → **"Agents pay agents"** → "Run the loop": a Strategist agent hires an Executor over HTTP 402 → the Executor pulls a BUY/SELL/HOLD signal from 0G Compute → it anchors the decision via `AgentVault.recordDecision` (real Mantle tx when the vault is configured). Three hops, three receipts.
6. **TEE & Privacy** tab → **OpenClaw Skill Console** → choose "Sealed Inference" → "Run via OpenClaw" → TEE attestation quote returned. **Receipt proof verifier** → paste a receipt id → **"Sign with my wallet"** (real EIP-191) → recovers the signer → **"Anchor on 0G"** → **"Check on 0G"** → `AgentReceiptRegistry` confirms the record → "✓ cryptographically verified · payer-signed · anchored on 0G".
7. **Receipts** tab → all paid calls listed with amounts, hashes, and 0G explorer links.
8. **Agent Identity** tab → MantleAgentIdentity panel → "Register ERC-8004 identity" → on-chain identity NFT minted on Mantle mainnet → in **"Memory snapshot"**, paste the 0G Storage root from step 2 and **"Bind brain"** → the NFT now points at a verifiable 0G Storage blob (intelligent NFT).
9. **New:** Claude Desktop → add `@tollgate/mcp-server` to config → type: "list services on 0g workspace" → Claude autonomously calls `tollgate_list_services`, selects the cheapest service, pays with `tollgate_pay` — no human approval.

**Quick judge path (all tracks — 2 min):**
1. `/app/liquify` → x402 Gateway → "Send unpaid request" → real `HTTP 402` → "Pay & retry" → `200 OK` + receipt.
2. `/app/arbitrum` → Escrow tab → open an escrow (real `AgentEscrow` on Arbitrum Sepolia).
3. `/app/mantle` → Agent Economy → fund an agent wallet (real `AgentVault` on Mantle mainnet).

## How to run

```bash
# Frontend
npm install
cp .env.example .env.local         # VITE_API_BASE (defaults to http://localhost:8787 in dev)
npm run dev                        # http://localhost:5173
npm run build                      # tsc -b && vite build  → dist/

# Server (optional — enables the real 402 + MCP + activity tracker)
cd server
npm install
cp .env.example .env               # PORT, NODE_ENV, CORS_ORIGIN, X402_PAYOUT_ADDRESS, X402_NETWORK, X402_ASSET
npm run dev                        # http://localhost:8787
npm run build && npm start

# Quick server smoke test
curl -i http://localhost:8787/api/gateway/svc_liq_wallet_risk          # → HTTP/1.1 402 Payment Required
curl -s -H "X-PAYMENT: dev-bypass" http://localhost:8787/api/gateway/svc_liq_wallet_risk | jq
curl -s http://localhost:8787/api/v1/x402-spec?workspace=liquify | jq
curl -s -X POST http://localhost:8787/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools[].name'
```

## Deploying to production

### Frontend → Vercel

```bash
# 1. Push to a public GitHub repo
# 2. Import at vercel.com → Vite framework, root dir = project root, build = "npm run build", output = "dist"
# 3. Add environment variables in Vercel dashboard (all VITE_* from .env.example)
#    VITE_API_BASE = https://your-server.onrender.com   ← after deploying the server
#    VITE_0G_REGISTRY_ADDRESS = 0xF4BFd93061B160Fa376c7F66De207a00225B4e70
#    VITE_0G_STORAGE_INDEXER  = https://indexer-storage-turbo.0g.ai
#    # ... (see .env.example for all variables)
```

### Server → Render.com (free tier)

```bash
# 1. New Web Service → connect GitHub repo
#    Root directory: server
#    Build: npm install && npm run build
#    Start: npm start
# 2. Environment variables:
#    NODE_ENV=production
#    CORS_ORIGIN=https://your-frontend.vercel.app
#    X402_PAYOUT_ADDRESS=0x0E437c109A4C1e15172c4dA557E77724D7243F71
#    X402_NETWORK=base-sepolia
#    X402_ASSET=USDC
```

## On-chain pieces (optional)

The `contracts/` package holds the chain-specific contracts (Hardhat, isolated from the
frontend bundle) and one-command deploy scripts. Two are wired into the app today:

### 0G — `AgentReceiptRegistry`

A tiny on-chain notary: `record(bytes32 receiptHash, bytes32 payloadHash)` anchors a paid
x402 receipt and emits `ReceiptRecorded` (no owner, no admin, no funds held).

**Deployed on 0G mainnet (chainId 16661):** `AgentReceiptRegistry` at
[`0xF4BFd93061B160Fa376c7F66De207a00225B4e70`](https://chainscan.0g.ai/address/0xF4BFd93061B160Fa376c7F66De207a00225B4e70)
— deploy tx [`0xe9ae97bb…3b167`](https://chainscan.0g.ai/tx/0xe9ae97bb7304d5a162e6d361a066f0492b7628076eb1b19bf35abf872bc3b167).

```bash
cd contracts
cp .env.example .env          # OG_RPC_URL + OG_PRIVATE_KEY (a funded key)
npm install
npm run deploy:0g             # 0G mainnet  →  prints VITE_0G_REGISTRY_ADDRESS=0x…
# or:  npm run deploy:0g-testnet   (0G Galileo testnet, for a dry run first)
npm run upload:0g -- ./file   # optional: store a blob on 0G Storage, prints the Merkle root
```

Then set `VITE_0G_REGISTRY_ADDRESS` (and optionally `VITE_0G_STORAGE_INDEXER`) in `.env.local`.
With it set, the 0G workspace's **Pin to 0G Storage** and **Run an inference job** widgets gain
an **"Anchor on 0G"** action that sends a real `record(...)` transaction from the connected
wallet (which must be on the 0G chain) and links the receipt to a 0G Explorer transaction.
Unset → everything still works; the anchor button just isn't shown (same graceful-degradation
pattern as the server's `dev-bypass`). See `contracts/README.md` for details and current 0G endpoints.

### Mantle — `AgentIdentityRegistry` (ERC-8004) + `AgentVault`

The Mantle workspace targets the Turing Test hackathon's two "defining features": ① on-chain
benchmarking — every agent decision recorded on Mantle — and ② an ERC-8004 agent identity NFT.

**Deployed on Mantle mainnet (chainId 5000):**
`AgentVault` at [`0xCbBcFc657787Fef2702ae6E35CA5a809a68480da`](https://explorer.mantle.xyz/address/0xCbBcFc657787Fef2702ae6E35CA5a809a68480da)
(yield token = mETH `0xcDA86A2…0bb0`) and
`AgentIdentityRegistry` (with `setMemoryRoot`) at [`0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB`](https://explorer.mantle.xyz/address/0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB)
— deploy txs [`0xf4fc69…2efb7`](https://explorer.mantle.xyz/tx/0xf4fc694a3be287efaa8c854ffb6c0d8c1bd5f8ed225b1d2acd4169c06952efb7) /
[`0x28ee81…10fec`](https://explorer.mantle.xyz/tx/0x28ee81490e4469cfa02987d6219bb28ac78a552a2827e7df381b707a9ff10fec).

- `contracts/AgentIdentityRegistry.sol` — ERC-8004-style identity registry implemented as an
  ERC-721: `register(domain, agentAddress)` mints the agent's unique identity NFT; a light
  on-chain reputation tally (`recordFeedback`); and `setMemoryRoot(agentId, root)` — binds the
  agent's **0G Storage memory-snapshot root** to its NFT (an "intelligent NFT" whose brain lives
  on 0G Storage; pin the snapshot in the 0G workspace's Storage tab, then bind the root in the
  Agents-tab "Memory snapshot" panel). No admin, no funds held.
- `contracts/AgentVault.sol` — an AI-callable vault: `deposit()` parks idle MNT, `deployToYield(amount, strategyRef)`
  marks capital allocated to mETH, `recordDecision(decisionHash, contextHash)` anchors every agent
  decision on-chain (the benchmarking trail), `withdraw`/`unwind` reverse it. On Mantle mainnet the
  vault's `yieldToken` is mETH; in the demo build it is the zero address (intent + accounting only).

```bash
cd contracts
cp .env.example .env              # add MANTLE_PRIVATE_KEY (a funded key); RPCs have defaults
npm install
npm run deploy:mantle             # Mantle mainnet (5000)   →  prints VITE_MANTLE_IDENTITY_ADDRESS / VITE_MANTLE_VAULT_ADDRESS
# or:  npm run deploy:mantle-sepolia   (Mantle Sepolia 5003, dry run)
```

Set `VITE_MANTLE_IDENTITY_ADDRESS` + `VITE_MANTLE_VAULT_ADDRESS` in `.env.local` → the Mantle
**Agents** tab gains an **"ERC-8004 agent identity"** panel (registers a real identity NFT) and an
**"AgentVault"** panel (real `deposit` / `deployToYield` / `recordDecision` txs from the connected
wallet, which it switches/adds to Mantle). Unset → those panels show a "scaffolded — one command
from live" note and the rest of the Mantle workspace runs in simulation. See `contracts/README.md`.

### Arbitrum — `AgentEscrow`

`contracts/AgentEscrow.sol` — a minimal escrow for agent→provider payments: `open(payee, token, amount, deadline, ref)`
funds it (native ETH or an ERC-20 like USDC), `release(id)` pays the provider on delivery, `refund(id)`
returns the funds to the agent after the deadline, `cancel(id)` lets the provider decline. Single-claim,
checks-effects-interactions + `ReentrancyGuard`, no owner/admin/fees.

**Deployed on Arbitrum Sepolia (chainId 421614):** `AgentEscrow` at
[`0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7`](https://sepolia.arbiscan.io/address/0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7)
— deploy tx [`0x85549a…1ebc`](https://sepolia.arbiscan.io/tx/0x85549afe5523f25b39bdbf014d30b93a43a21fcce4be7be6e447e34965ee1ebc).

```bash
cd contracts
cp .env.example .env              # add ARBITRUM_PRIVATE_KEY (a funded key); RPCs have defaults
npm install
npm run deploy:arb                # Arbitrum Sepolia (421614)   →  prints VITE_ARBITRUM_ESCROW_ADDRESS
# or:  npm run deploy:arb-one     (Arbitrum One 42161)
# or:  npm run deploy:orbit       (set ORBIT_RPC_URL / ORBIT_CHAIN_ID / ORBIT_EXPLORER_URL — e.g. Robinhood Chain)
```

Set `VITE_ARBITRUM_ESCROW_ADDRESS` in `.env.local` → the Arbitrum **Escrow** tab gains a real
**"AgentEscrow"** panel (open / release / refund / cancel — native-ETH escrows, real txs; the wallet
is switched/added to the configured Arbitrum chain). Unset → that tab keeps the simulated escrow only.

### ServiceRegistry — on-chain service discovery (ERC-8004)

Agents autonomously discover paid services: `register(serviceId, name, priceWei, currency, network, endpoint, agentCardUri)`. The `agentCardUri` field points to an ERC-8004 agent card JSON (IPFS/0G Storage). Deployable to any chain via `npx hardhat run scripts/deploy-service-registry.mjs --network <chain>`.

### AgentBudget — on-chain spending guardrails

Per-agent spending policies enforced on-chain: `setPolicy(agentId, dailyLimitWei, maxPerTxWei)`, emergency `pause/unpause`. The gateway calls `checkAndSpend` before each payment — rogue agents cannot exceed their treasury limits. Deployable via `scripts/deploy-agent-budget.mjs`.

### DeliveryVerifier — cryptographic proof of delivery

Service providers sign their response hash (EIP-191): `anchor(requestHash, responseHash, signature)` records the proof on-chain. `verify(responseHash, sig, provider)` is a pure function — no gas. Any agent can confirm a service actually delivered what was paid for.

## Environment variables

**Frontend** (`.env.local`):

| Var | Default | Notes |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:8787` (dev) | Base URL of the `server/`. Set to `""` to disable the Live Gateway panel (simulation only). Point at the deployed server in prod; that server's `CORS_ORIGIN` must include this site's origin. |
| `VITE_0G_REGISTRY_ADDRESS` | _(unset)_ | Deployed `AgentReceiptRegistry` address. Set → enables the "Anchor on 0G" actions in the 0G workspace. The live demo uses `0xF4BFd93061B160Fa376c7F66De207a00225B4e70` (0G mainnet); redeploy your own with `cd contracts && npm run deploy:0g`. |
| `VITE_0G_CHAIN_ID` | `0x4115` (16661, 0G mainnet) | 0G chain id MetaMask must be on for anchoring. Hex or decimal. (`0x40da` = 16602 Galileo testnet.) |
| `VITE_0G_EXPLORER` | `https://chainscan.0g.ai` | Block explorer base URL for the receipt links. |
| `VITE_0G_STORAGE_INDEXER` | _(unset)_ | 0G Storage indexer HTTP endpoint. Set → the Pin widget shows real Merkle roots; unset → deterministic sha256-derived root, flagged "simulated". |
| `VITE_MANTLE_IDENTITY_ADDRESS` | _(unset)_ | Deployed `AgentIdentityRegistry` (ERC-8004 + `setMemoryRoot`) address on Mantle. Set → enables the "ERC-8004 agent identity" panel including "Bind brain" (memory-root to 0G Storage). Live demo: `0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB` (Mantle mainnet, 2026-05-13 deploy); redeploy with `cd contracts && npm run deploy:mantle`. |
| `VITE_MANTLE_VAULT_ADDRESS` | _(unset)_ | Deployed `AgentVault` address on Mantle. Set → enables the "AgentVault" panel (deposit / deployToYield / recordDecision). Live demo: `0xCbBcFc657787Fef2702ae6E35CA5a809a68480da` (Mantle mainnet). |
| `VITE_MANTLE_CHAIN_ID` | `0x1388` (5000, Mantle mainnet) | Mantle chain id MetaMask must be on. Hex or decimal. (`0x138b` = 5003 Mantle Sepolia.) |
| `VITE_MANTLE_EXPLORER` | `https://explorer.mantle.xyz` | Block explorer base URL for the Mantle links. |
| `VITE_ARBITRUM_ESCROW_ADDRESS` | _(unset)_ | Deployed `AgentEscrow` address. Set → enables the "AgentEscrow" panel in the Arbitrum Escrow tab. Live demo: `0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7` (Arbitrum Sepolia); redeploy with `cd contracts && npm run deploy:arb`. |
| `VITE_ARBITRUM_CHAIN_ID` | `0x66eee` (421614, Arbitrum Sepolia) | Arbitrum chain id MetaMask must be on. Hex or decimal. (`0xa4b1` = 42161 Arbitrum One.) |
| `VITE_ARBITRUM_EXPLORER` | `https://sepolia.arbiscan.io` | Block explorer base URL for the Arbitrum links. |

**Server** (`server/.env`):

| Var | Default | Notes |
|---|---|---|
| `PORT` | `8787` | HTTP port |
| `NODE_ENV` | `development` | `production` disables the `X-PAYMENT: dev-bypass` shortcut |
| `CORS_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed origins, or `*` |
| `X402_PAYOUT_ADDRESS` | `0x0000…0000` | Provider/settlement wallet shown in challenges (demo placeholder) |
| `X402_NETWORK` | `base-sepolia` | Default settlement network advertised in challenges |
| `X402_ASSET` | `USDC` | Default settlement asset |

No private keys are stored server-side; `.env` is git-ignored; `.env.example` files are committed.

## Security notes

- **Frontend is never the source of truth.** Price, provider wallet, receipt status, and payment proofs are all validated server-side. (Provider/agent *mutations* — create service, change price, change budget — would require a wallet signature; the current server keeps a read-only registry.)
- **Replay protection.** Each challenge carries a nonce (`challengeId`), expiry, `requestHash`, `serviceId`, amount, and `payTo`; it's single-use — replays return `402 {error:"challenge_invalid", reason:"replayed"}`. Challenges expire after 5 minutes.
- **Spend policy.** Agents can't pay above `maxPerRequestUsd`, can't exceed `dailyLimitUsd`, can't call a non-allowlisted service, can't pay after pause, can't pay an expired challenge or the wrong network (enforced in the MCP `pay_for_service` tool; the gateway middleware enforces challenge/payment validity).
- **Demo facilitator mode.** Where the flow is simulated (the frontend `PaymentModal`, and the server's `dev-bypass`), the UI says so explicitly. The production path verifies a real on-chain / x402-facilitator proof.

## Future plans

- Real x402 facilitator verification + more networks (Base, Arbitrum, X Layer, Solana).
- Persist the server's registry/receipts in a DB; provider/agent mutations gated by wallet signatures.
- Frontend receipts ledger reads `GET /api/receipts` as a source when the server is reachable.
- Port XSight's `economyLoop` / `autoDeploy` pattern → Mantle "earn → pay → earn" loop visualization.
- Structured-card AI chat in the Agent Assistant panel (Eazo "AI Companion" track).
- Marketplace revenue share, agent reputation, hosted SDK, paid-tool discovery protocol.

## Repo map

```
src/                       frontend (React + Vite)
  pages/                   ProjectLauncher (/), WorkspacePage (/app/:wsId)
  layouts/AppLayout.tsx    sidebar + per-workspace theming + PaymentModal
  components/
    WorkspaceDashboard.tsx Overview / service tabs / Agents / Receipts / GatewayPage + all widgets
    PaymentModal.tsx       402 → hold → verify → approved → receipt (simulation)
    ...
  lib/api.ts               thin client for server/ (ping, listServices, gatewayUnpaid, gatewayPay, …)
  lib/og.ts                0G glue: anchor a receipt via AgentReceiptRegistry.record(), 0G Storage upload (graceful fallback)
  lib/mantle.ts            Mantle glue: ERC-8004 register/resolve, AgentVault deposit/deployToYield/recordDecision (graceful)
  lib/arbitrum.ts          Arbitrum glue: AgentEscrow open/release/refund/cancel + getEscrow (graceful)
  components/widgets/mantle/MantleOnchain.tsx       "ERC-8004 agent identity" + "AgentVault" panels (Mantle Agents tab)
  components/widgets/arbitrum/ArbitrumEscrowPanel.tsx   "AgentEscrow" panel (Arbitrum Escrow tab)
  data.ts                  workspaces, services, agents, seeded receipts
  wallet.tsx               EIP-1193 connect, live balance/block/gas, ERC-20 transfer
server/                    Express x402 gateway + MCP + activity tracker (see server/README.md)
packages/sdk/              @tollgate/sdk — zero-dep x402 client (fetchPaid / createTollGate); 402 → pay → unlock in one call (see packages/sdk/README.md)
contracts/                 on-chain: 0G AgentReceiptRegistry + Mantle AgentIdentityRegistry (ERC-8004) + AgentVault + Arbitrum AgentEscrow + Hardhat + deploy scripts (see contracts/README.md)
TRACK-PLAN.md              per-track gap analysis + build plan
PROJECT-PLAYBOOK.md        product spec
agent-payments-x402-universal-tz-uk.md   umbrella spec (UA)
```

## Acknowledgements

The `server/` x402 middleware, MCP server, activity tracker, and `/x402-spec` discovery endpoint are ported from the author's sibling project [`kravadk/XSight-`](https://github.com/kravadk/XSight-) (AI Trading Copilot for X Layer, OKX Build X Hackathon), generalized from its OKX/X-Layer specifics to TollGate's multi-workspace model.
