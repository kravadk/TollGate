# TollGate

> **HTTP 402 payment gateway letting AI agents autonomously pay for compute, storage, and inference on 0G using stablecoins with on-chain receipt anchoring.**

Turn any API, data feed, inference job, storage write, or analytics endpoint into a **paid AI-agent service** using HTTP `402`, stablecoin settlement, agent budgets, and verifiable receipts. One core gateway, eight hackathon workspaces.

**Stripe / API gateway for AI agents** — agents call an endpoint, get `402 Payment Required`, pay with a stablecoin / x402 proof, retry, and the data unlocks. No accounts, no API keys, no manual checkout.

## Problem

AI agents can already discover APIs and run workflows — but they have no clean way to **pay for an individual request**, and API providers don't want to build Stripe billing, API keys, and subscriptions for every agent. HTTP `402 Payment Required` was reserved for exactly this; TollGate makes it real for modern stablecoin / agent payments.

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

| Component | How it's used |
|---|---|
| **0G Chain (mainnet)** | `AgentReceiptRegistry.record(receiptHash, payloadHash)` anchors every x402 receipt on-chain. Deployed at `0xF4BFd93061B160Fa376c7F66De207a00225B4e70`. |
| **0G Storage** | Agent memory blobs (inference results, policy snapshots, checkpoints) are pinned via the 0G Storage indexer (`https://indexer-storage-turbo.0g.ai`) and returned as Merkle roots. |
| **0G Compute** | Inference jobs are priced per-token via x402 — the `InferenceJobRunner` widget submits a job and receives a verifiable result hash. |
| **OpenClaw** | The `OpenClawSkillConsole` registers skill manifests and orchestrates sealed TEE inference jobs (`0g.sealed.inference`), returning SGX/TDX attestation quotes. |
| **Agent ID** | `AgentIdentityRegistry` (ERC-8004) is deployed on Mantle mainnet; the 0G workspace's **Agent Identity** tab demonstrates the same identity model for 0G agents. |

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
| **Mantle mainnet** (5000) | `AgentIdentityRegistry` (ERC-8004) | [`0xdA549367192a41c6e1a7eAa161e766d87d15606b`](https://explorer.mantle.xyz/address/0xdA549367192a41c6e1a7eAa161e766d87d15606b) | [`0x2e94b2…59bb7`](https://explorer.mantle.xyz/tx/0x2e94b240327c744fee8fa26b40c2555e3a91a44240eac45bdd33b87a3c659bb7) |
| **Mantle mainnet** (5000) | `AgentVault` | [`0xCbBcFc657787Fef2702ae6E35CA5a809a68480da`](https://explorer.mantle.xyz/address/0xCbBcFc657787Fef2702ae6E35CA5a809a68480da) | [`0xf4fc69…2efb7`](https://explorer.mantle.xyz/tx/0xf4fc694a3be287efaa8c854ffb6c0d8c1bd5f8ed225b1d2acd4169c06952efb7) |
| **Arbitrum Sepolia** (421614) | `AgentEscrow` | [`0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7`](https://sepolia.arbiscan.io/address/0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7) | [`0x85549a…1ebc`](https://sepolia.arbiscan.io/tx/0x85549afe5523f25b39bdbf014d30b93a43a21fcce4be7be6e447e34965ee1ebc) |

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

## Protocol integrations

- **x402** — HTTP `402 Payment Required` handshake (Coinbase x402 model). The server implements the challenge/proof flow; the spec is exposed at `GET /api/v1/x402-spec`.
- **Stablecoins** — challenges settle in USDC / USDT (per workspace network). Arbitrum's UsdcTransferWidget does a real ERC-20 `transfer` via the connected wallet on Arbitrum Sepolia.
- **MCP (Model Context Protocol)** — `POST /mcp` (JSON-RPC 2.0, spec 2024-11-05) exposes `list_services`, `get_service`, `pay_for_service`, `list_receipts`, `get_agent_policy` so any Claude-powered agent can use TollGate as a reusable skill.
- **Wallets** — EIP-1193 (MetaMask etc.) for connect, live balance, block, gas; per-workspace network hints.

## Demo

- **Live frontend:** _[deploy to Vercel and add link here]_
- **Live server:** _[deploy to Render/Fly and add link here]_ (optional — frontend runs standalone)
- **Demo video:** _[record 3-min walkthrough and add YouTube/Loom link here]_
- **GitHub:** _[add public repo link here]_
- **0G mainnet contract:** [`0xF4BFd93061B160Fa376c7F66De207a00225B4e70`](https://chainscan.0g.ai/address/0xF4BFd93061B160Fa376c7F66De207a00225B4e70)
- **X post:** _[add post link with #0GHackathon #BuildOn0G]_

**3-minute judge path (0G track):**
1. Open `/app/0g` → **"0G Agent Payment Router"**.
2. **Storage & Memory** tab → paste any text → **"Pin to 0G Storage"** → get a real Merkle root from 0G Storage indexer.
3. Click **"Anchor on 0G"** → MetaMask opens on 0G mainnet (chain 16661) → confirm → see the tx on [chainscan.0g.ai](https://chainscan.0g.ai).
4. **Compute** tab → **InferenceJobRunner** → select a model → "Run job ($0.03)" → x402 challenge issued → job result + receipt emitted.
5. **TEE & Privacy** tab → **OpenClaw Skill Console** → choose "Sealed Inference" → "Run via OpenClaw" → TEE attestation quote returned.
6. **Receipts** tab → see all paid calls listed with amounts, hashes, and 0G explorer links.
7. **Agent Identity** tab → MantleAgentIdentity panel → "Register ERC-8004 identity" → on-chain identity NFT minted on Mantle mainnet.

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
`AgentIdentityRegistry` at [`0xdA549367192a41c6e1a7eAa161e766d87d15606b`](https://explorer.mantle.xyz/address/0xdA549367192a41c6e1a7eAa161e766d87d15606b)
— deploy txs [`0xf4fc69…2efb7`](https://explorer.mantle.xyz/tx/0xf4fc694a3be287efaa8c854ffb6c0d8c1bd5f8ed225b1d2acd4169c06952efb7) /
[`0x2e94b2…59bb7`](https://explorer.mantle.xyz/tx/0x2e94b240327c744fee8fa26b40c2555e3a91a44240eac45bdd33b87a3c659bb7).

- `contracts/AgentIdentityRegistry.sol` — ERC-8004-style identity registry implemented as an
  ERC-721: `register(domain, agentAddress)` mints the agent's unique identity NFT; plus a light
  on-chain reputation tally (`recordFeedback`). No admin, no funds held.
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

## Environment variables

**Frontend** (`.env.local`):

| Var | Default | Notes |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:8787` (dev) | Base URL of the `server/`. Set to `""` to disable the Live Gateway panel (simulation only). Point at the deployed server in prod; that server's `CORS_ORIGIN` must include this site's origin. |
| `VITE_0G_REGISTRY_ADDRESS` | _(unset)_ | Deployed `AgentReceiptRegistry` address. Set → enables the "Anchor on 0G" actions in the 0G workspace. The live demo uses `0xF4BFd93061B160Fa376c7F66De207a00225B4e70` (0G mainnet); redeploy your own with `cd contracts && npm run deploy:0g`. |
| `VITE_0G_CHAIN_ID` | `0x4115` (16661, 0G mainnet) | 0G chain id MetaMask must be on for anchoring. Hex or decimal. (`0x40da` = 16602 Galileo testnet.) |
| `VITE_0G_EXPLORER` | `https://chainscan.0g.ai` | Block explorer base URL for the receipt links. |
| `VITE_0G_STORAGE_INDEXER` | _(unset)_ | 0G Storage indexer HTTP endpoint. Set → the Pin widget shows real Merkle roots; unset → deterministic sha256-derived root, flagged "simulated". |
| `VITE_MANTLE_IDENTITY_ADDRESS` | _(unset)_ | Deployed `AgentIdentityRegistry` (ERC-8004) address on Mantle. Set → enables the "ERC-8004 agent identity" panel. Live demo: `0xdA549367192a41c6e1a7eAa161e766d87d15606b` (Mantle mainnet); redeploy with `cd contracts && npm run deploy:mantle`. |
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
contracts/                 on-chain: 0G AgentReceiptRegistry + Mantle AgentIdentityRegistry (ERC-8004) + AgentVault + Arbitrum AgentEscrow + Hardhat + deploy scripts (see contracts/README.md)
TRACK-PLAN.md              per-track gap analysis + build plan
PROJECT-PLAYBOOK.md        product spec
agent-payments-x402-universal-tz-uk.md   umbrella spec (UA)
```

## Acknowledgements

The `server/` x402 middleware, MCP server, activity tracker, and `/x402-spec` discovery endpoint are ported from the author's sibling project [`kravadk/XSight-`](https://github.com/kravadk/XSight-) (AI Trading Copilot for X Layer, OKX Build X Hackathon), generalized from its OKX/X-Layer specifics to TollGate's multi-workspace model.
