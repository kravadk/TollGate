# TollGate

## Agora Agents Hackathon: ArcMind CopyGuard

ArcMind CopyGuard is the Agora/Arc submission inside this repo. It is an AI risk layer for copy-traders: it detects leader strategy decay, decides whether to COPY, REDUCE, STOP, HOLD_USDC, or MOVE_TO_USYC, and exposes paid reasoning traces plus protected USDC portfolio receipts on Arc.

**Primary demo route:** `/live`  
**Full Agora console:** `/app/agora`  
**Readiness endpoint:** `/api/arc-readiness`  
**Main RFB fit:** RFB 06 Social Trading Intelligence  
**Secondary fit:** RFB 04 Adaptive Portfolio Manager, RFB 02 Trader Intelligence

For judges:

1. Open `/live`.
2. Keep `Read-only walkthrough` active for first inspection.
3. Open `Judge Walkthrough`.
4. Check `Submission Readiness`.
5. Inspect latest CopyGuard decision, leader decay factors, paid trace preview, Decision Replay, What-If Simulator, and Live Traction.
6. Check Signal Source Radar to see which market/social/news providers are configured, need keys, or are intentionally blocked.
7. Switch to `Live execution` only when ready to connect an Arc wallet and create verified payment receipts.

Agora-specific docs:

- [Submission pack](docs/AGORA-SUBMISSION-PACK.md)
- [Live demo runbook](docs/AGORA-LIVE-DEMO-RUNBOOK.md)
- [Production deployment checklist](docs/AGORA-PRODUCTION-DEPLOYMENT.md)
- [API signal radar](docs/AGORA-API-SIGNAL-RADAR.md)
- [Active execution plan](docs/AGORA-ACTIVE-EXECUTION-PLAN.md)

Agora local run:

```bash
npm install
cd server && npm install && npm run dev
cd .. && npm run dev
```

Agora smoke check:

```bash
AGORA_FRONTEND_URL=http://127.0.0.1:5173 AGORA_BACKEND_URL=http://127.0.0.1:8787 npm run test:agora-live
```

Production smoke check:

```bash
AGORA_FRONTEND_URL=https://<frontend-domain> AGORA_BACKEND_URL=https://<backend-domain> npm run test:agora-live
```

Honest demo boundary: read-only walkthrough never creates local fake receipts. Paid trace unlocks and protected portfolio starts require wallet payment plus backend Arc verification.

---

> **The payment rails the agent economy runs on.** HTTP 402 for autonomous payments + AgentScore credit reputation, bound to ERC-8004 identity. 18 contracts across 5 chains.

**[Live demo](https://toll-gatee.vercel.app/)** · **[API server](https://tollgate-1.onrender.com)** · **[0G mainnet contract](https://chainscan.0g.ai/address/0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f)** · **[GitHub](https://github.com/kravadk/TollGate)**

Turn any API, data feed, inference job, or storage write into a **paid AI-agent service** using HTTP `402 Payment Required`, stablecoin settlement, on-chain agent budgets, and verifiable receipts — no accounts, no API keys, no human approval loop.

---

## The problem

AI agents will execute over $10 trillion in autonomous economic decisions by 2030. Today they have zero native payment infrastructure: no service discovery, no per-request billing, no spending limits, no proof of delivery, no credit history. Every agent still relies on human-in-the-loop approval to pay an API.

HTTP `402 Payment Required` was reserved in the HTTP spec for exactly this case in 1997. TollGate makes it real for the agentic era — fully on-chain, replay-safe, and chain-agnostic.

## The solution

A single gateway that agents talk to over standard HTTP. The gateway issues a payment challenge, the agent settles USDC on-chain, and the response unlocks. Every call produces a cryptographic receipt anchored to a blockchain, an on-chain audit trail in `AgentReceiptRegistry`, and an ERC-721 NFT. Agents accumulate an on-chain credit score (`AgentCreditRegistry`) from their receipt history — just like a FICO score, but for AI.

## Key features

| Feature | Description |
|---|---|
| **x402 payment gateway** | HTTP 402 challenges: single-use, replay-safe, SHA-256 request-hash bound, 5-min expiry |
| **Multi-chain** | 0G · Mantle · Arbitrum · Base · QIE · Sui · Polygon — one unified gateway |
| **On-chain budget enforcement** | `AgentBudgetController`: smart-contract daily caps + per-request limits |
| **Agent credit score** | `AgentCreditRegistry`: FICO-style score built from on-chain receipt history |
| **Receipt NFTs** | ERC-721 minted per payment, live in Economy Dashboard via SSE |
| **MCP server (9 tools)** | Claude Desktop agents call TollGate natively — `pay_for_service`, `list_services`, etc. |
| **A2A auto-cycle** | Agents hire each other autonomously every 5 s; decision logs anchored on-chain |
| **SQLite receipt ledger** | Receipts survive server restarts; queryable at `GET /api/receipts` |

## How x402 works

```
Agent → GET /api/gateway/svc_0g_inference
      ← 402 { challengeId, payTo, amount, network, requestHash, expiresAt }
      → pays USDC on-chain
      → retries with X-PAYMENT: <base64 proof>
      ← Gateway verifies: recipient · amount · network · challenge binding · replay check
      ← { data, receiptId } + SQLite write + SSE event + NFT mint
```

## Architecture

| Component | Path | Description |
|---|---|---|
| **Frontend** | `src/` | React 19 + Vite 7 + Tailwind v4. Workspace selector → per-workspace dashboard with live Economy Dashboard (SSE), paid-API tabs, Agents panel, and Receipts ledger. |
| **Server** | `server/` | Express + TypeScript. Real `402` gateway middleware, SQLite receipt ledger, SSE payment feed, and an MCP server exposing 9 tools so Claude Desktop agents call TollGate natively. |
| **Contracts** | `contracts/` | 18 Hardhat-deployed Solidity contracts across 0G, Mantle, Arbitrum, QIE, and Arc. |
| **SDK** | `packages/sdk/` | `@tollgate/sdk` — zero-dependency x402 client: `fetchPaid()` + `createTollGate()`. |

## Workspaces

Each workspace is a self-contained deployment with its own contracts, paid API services, UI tabs, and network configuration.

| Workspace | Route | Networks | What it does |
|---|---|---|---|
| **0G** | `/app/0g` | 0G Mainnet · Galileo Testnet | AI inference + decentralised storage economy; A2A agent loop; MCP server |
| **Mantle** | `/app/mantle` | Mantle Mainnet | Agent wallets with on-chain spend policies; mETH/USDY yield signals; agent credit scoring |
| **Arbitrum** | `/app/arbitrum` | Arbitrum Sepolia · One | USDC per-call services with escrowed delivery; Orbit chain monitoring |
| **QIE** | `/app/qie` | QIE Testnet | Merchant checkout rail; QIE Pass NFT gating; on-chain oracle feed |
| **Sui** | `/app/sui` | Sui Mainnet · Testnet | Agent Economy OS: DeepBook yield escrow, Walrus receipts, Seal encryption, Intent Engine |
| **Agora** | `/app/agora` | Arc Mainnet · Base | ArcMind autonomous trading: copy-trading, reasoning traces, kill switch |
| **Polygon** | `/app/polygon` | Polygon zkEVM | UAE commerce: AED invoice tokenisation, cross-border stablecoin remittance |

## Deployed contracts

### 0G Mainnet — chainId 16661

| Contract | Address |
|---|---|
| `AgentReceiptRegistry` | [`0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f`](https://chainscan.0g.ai/address/0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f) |
| `AgentIdentityRegistry` | [`0x8769E9ad02728d49D08CE2F5D5cd4ce75EeC0446`](https://chainscan.0g.ai/address/0x8769E9ad02728d49D08CE2F5D5cd4ce75EeC0446) |
| `ServiceRegistry` | [`0x2b27425bd22Ae883dEc34F7a8Eacacf336C562b8`](https://chainscan.0g.ai/address/0x2b27425bd22Ae883dEc34F7a8Eacacf336C562b8) |
| `AgentBudgetController` | [`0x305eF265BD964fBe34913E70Ef6AA8951e6b662e`](https://chainscan.0g.ai/address/0x305eF265BD964fBe34913E70Ef6AA8951e6b662e) |
| `DeliveryVerifier` | [`0x5F4999829D57f714497343f5677e66e6A56238E3`](https://chainscan.0g.ai/address/0x5F4999829D57f714497343f5677e66e6A56238E3) |

### Mantle Mainnet — chainId 5000

| Contract | Address |
|---|---|
| `AgentIdentityRegistry` | [`0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB`](https://explorer.mantle.xyz/address/0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB) |
| `AgentCreditRegistry` | [`0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9`](https://explorer.mantle.xyz/address/0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9) |
| `AgentVault` | [`0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f`](https://explorer.mantle.xyz/address/0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f) |
| `AgentBudgetController` | [`0x2b27425bd22Ae883dEc34F7a8Eacacf336C562b8`](https://explorer.mantle.xyz/address/0x2b27425bd22Ae883dEc34F7a8Eacacf336C562b8) |
| `ReceiptNFT` | [`0x5F4999829D57f714497343f5677e66e6A56238E3`](https://explorer.mantle.xyz/address/0x5F4999829D57f714497343f5677e66e6A56238E3) |

### Arbitrum Sepolia — chainId 421614

| Contract | Address |
|---|---|
| `AgentEscrow` | [`0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f`](https://sepolia.arbiscan.io/address/0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f) |

### QIE Testnet — chainId 1983

| Contract | Address |
|---|---|
| `QieCheckout` | [`0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f`](https://testnet.qie.digital/address/0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f) |
| `QiePass` | [`0x8769E9ad02728d49D08CE2F5D5cd4ce75EeC0446`](https://testnet.qie.digital/address/0x8769E9ad02728d49D08CE2F5D5cd4ce75EeC0446) |

### Arc Testnet — chainId 5042002

| Contract | Address |
|---|---|
| `ArcMindRegistry` | [`0x24Cb6d1bE131006e8CB2cb7fBa5675725f9E6Da8`](https://testnet.arcscan.app/address/0x24Cb6d1bE131006e8CB2cb7fBa5675725f9E6Da8) |

## Quick start

```bash
# Frontend
npm install
npm run dev          # Vite on :5173

# Server
cd server
npm install
cp .env.example .env   # fill in keys
npm run dev          # Express on :8787
```

## API reference

```
GET  /api/services              list all paid services (?workspace=0g)
GET  /api/services/:id          service details
GET  /api/agents                list agents (?workspace=)
GET  /api/agents/:id            agent details
GET  /api/v1/x402-spec          x402 discovery document
GET  /api/gateway/:serviceId    → 402 challenge or unlocked response
POST /api/gateway/:serviceId    same, for POST payloads
GET  /api/receipts              receipt ledger (?workspace=&service=&agent=)
GET  /api/receipts/:id          single receipt
GET  /api/receipts/stats        economy stats (total, today, agents, avg)
GET  /api/agent-score/:agentId  FICO-style credit score from receipt history
GET  /api/events/payments       SSE: live payment feed (snapshot + receipt + nft_update)
POST /api/og/upload             0G Storage upload (server-signed)
POST /api/og/compute            0G Compute inference (server-signed)
GET  /api/status/health         server health + version
GET  /api/status/activity       activity snapshot
POST /mcp                       MCP server (JSON-RPC 2.0, 9 tools)
```

## SDK

```typescript
import { fetchPaid, createTollGate } from "@tollgate/sdk";

const data = await fetchPaid("https://tollgate-1.onrender.com/api/gateway/svc_0g_inference", {
  proof: async (challenge) => myWallet.signAndPay(challenge),
  agentId: "my-agent",
});
```

## MCP server (Claude Desktop)

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "tollgate": {
      "command": "npx",
      "args": ["-y", "@tollgate/mcp-bridge", "--url", "https://tollgate-1.onrender.com/mcp"]
    }
  }
}
```

Claude can then call `list_services`, `pay_for_service`, `get_receipt`, and 6 more tools natively.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS v4, TypeScript |
| Server | Node.js, Express, TypeScript, better-sqlite3, ethers v6 |
| Contracts | Solidity 0.8, Hardhat, OpenZeppelin |
| Payments | HTTP 402 (x402 protocol), USDC ERC-20, ERC-721 NFT receipts |
| Storage | 0G Storage (Merkle-root anchored), Walrus (Sui) |
| Identity | ERC-8004 agent identity, EIP-191 signatures |
| MCP | JSON-RPC 2.0 MCP server, Claude Desktop integration |
| Chains | 0G · Mantle · Arbitrum · Base · QIE · Sui · Polygon zkEVM · Arc |

## Security

TollGate handles real on-chain payments.

**Server hardening:**
- HTTP security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`) on every response. Mirrored in `vercel.json`.
- Rate limiting: `/api/og/upload` 10 req/min, `/api/gateway/:id` 30 req/min/IP, `/mcp` 60 req/min.
- `X-Agent-Id` truncated to 128 printable-ASCII chars to prevent log injection.
- `X-Request-Id` validated against `[a-zA-Z0-9_-]{1,64}`.
- x402 challenges are single-use, expire in 5 minutes, and are bound to a SHA-256 request hash.
- 500 responses return `{ error: "internal_error" }` only — no stack traces.
- Model inference endpoint has an allowlist — unknown model IDs return 400.

**Frontend hardening:**
- All user-entered amounts pass through `safeAmt()` — NaN, negative, and overflow values rejected before any on-chain call.
- Tx hash links rendered only after `isTxHash()` validates the 64-char hex — prevents open-redirect.
- Ethereum addresses validated with `/^0x[0-9a-fA-F]{40}$/` before any transaction.

**Known limitations:**
- `CORS_ORIGIN=*` by default; tighten to your domain before production.
- MCP `create_service` accepts arbitrary endpoint URLs — add an SSRF blocklist before public deployment.

Full security policy: [SECURITY.md](SECURITY.md)

## Testing

```bash
# Unit tests
npm test

# Integration / flow test (requires server running on :8787)
node scripts/test-flow.js
```

The flow test exercises the full x402 cycle: service discovery → 402 challenge → dev-bypass payment → receipt verification → agent credit score. All credentials are loaded from `server/.env`.
