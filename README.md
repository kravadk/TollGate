# TollGate

> **The payment rails the agent economy runs on.** HTTP 402 for autonomous payments + AgentScore credit reputation, bound to ERC-8004 identity. 18 contracts across 5 chains.

**[Live demo](https://toll-gatee.vercel.app/)** · **[API server](https://tollgate-1.onrender.com)** · **[0G mainnet contract](https://chainscan.0g.ai/address/0xF4BFd93061B160Fa376c7F66De207a00225B4e70)** · **[GitHub](https://github.com/kravadk/TollGate)**

Turn any API, data feed, inference job, or storage write into a **paid AI-agent service** using HTTP `402 Payment Required`, stablecoin settlement, on-chain agent budgets, and verifiable receipts — no accounts, no API keys, no human approval loop.

## The problem

AI agents will execute over $10 trillion in autonomous economic decisions by 2030. Today they have zero native payment infrastructure: no discovery, no per-request billing, no spending limits, no proof of delivery, no credit history. Every agent still relies on human-in-the-loop approval to pay an API.

HTTP `402` was reserved in the HTTP spec for exactly this case in 1997. TollGate makes it real for the agentic era.

## How x402 works

```
Agent calls endpoint
  → Gateway returns 402 + payment challenge (amount, network, payTo, requestHash, expiry)
  → Agent pays USDC on-chain
  → Agent retries with X-PAYMENT proof
  → Gateway verifies (recipient, amount, network, challenge binding, replay-safe)
  → Data unlocks + SQLite receipt written
  → Economy Dashboard updates via SSE
  → ERC-721 Receipt NFT minted on Mantle
```

## Architecture

| Component | Path | Description |
|---|---|---|
| **Frontend** | `src/` | React 19 + Vite 7 + Tailwind v4. Workspace selector → per-workspace dashboard with live Economy Dashboard (SSE), paid-API tabs, Agents, and Receipts. |
| **Server** | `server/` | Express + TypeScript. Real `402` gateway middleware, SQLite receipt ledger, SSE payment feed, and an **MCP server** exposing 9 tools so Claude Desktop agents can call TollGate natively. |
| **Contracts** | `contracts/` | 18 Hardhat-deployed Solidity contracts across 0G, Mantle, Arbitrum, QIE, and Arc. |
| **SDK** | `packages/sdk/` | `@tollgate/sdk` — zero-dependency x402 client: `fetchPaid()` + `createTollGate()`. |

## Workspaces

Each workspace is a self-contained project with its own contracts, paid API services, UI tabs, and network configuration.

| Workspace | Route | Networks | What it is |
|---|---|---|---|
| **0G** | `/app/0g` | 0G Mainnet, Base Sepolia | AI inference + decentralised storage economy; A2A loop; MCP server |
| **Mantle** | `/app/mantle` | Mantle Mainnet | Agent wallets with on-chain spend policies; mETH/USDY yield signals; agent credit scoring |
| **Arbitrum** | `/app/arbitrum` | Arbitrum Sepolia | USDC per-call services with escrowed delivery; Orbit chain monitoring |
| **QIE** | `/app/qie` | QIE Testnet | Merchant checkout rail; QIE Pass NFT gating; on-chain oracle feed |
| **Sui** | `/app/sui` | Sui Mainnet + Testnet | Agent Economy OS: DeepBook yield escrow, Walrus receipts, Seal encryption, Intent Engine |
| **Agora** | `/app/agora` | Arc Mainnet, Arbitrum, Base | ArcMind autonomous trading: copy-trading, reasoning traces, kill switch |
| **Polygon** | `/app/polygon` | Polygon zkEVM, PoS | UAE commerce: AED trade invoice tokenisation, cross-border stablecoin remittance |

Full details: [src/workspaces/0g/README.md](src/workspaces/0g/README.md) · [mantle](src/workspaces/mantle/README.md) · [arbitrum](src/workspaces/arbitrum/README.md) · [qie](src/workspaces/qie/README.md) · [sui](src/workspaces/sui/README.md) · [agora](src/workspaces/agora/README.md) · [polygon](src/workspaces/polygon/README.md)

## Deployed contracts

| Contract | Network | Address |
|---|---|---|
| `AgentReceiptRegistry` | 0G Mainnet | `0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f` |
| `AgentIdentityRegistry` | 0G Mainnet | `0x8769E9ad02728d49D08CE2F5D5cd4ce75EeC0446` |
| `ServiceRegistry` | 0G Mainnet | `0x2b27425bd22Ae883dEc34F7a8Eacacf336C562b8` |
| `AgentBudgetController` | 0G Mainnet | `0x305eF265BD964fBe34913E70Ef6AA8951e6b662e` |
| `DeliveryVerifier` | 0G Mainnet | `0x5F4999829D57f714497343f5677e66e6A56238E3` |
| `AgentIdentityRegistry` | Mantle Mainnet | `0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB` |
| `AgentCreditRegistry` | Mantle Mainnet | `0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9` |
| `AgentBudgetController` | Mantle Mainnet | via `deploy-mantle.cjs` |
| `ReceiptNFT` | Mantle Mainnet | via `deploy-mantle.cjs` |
| `AgentVault` | Mantle Mainnet | via `deploy-mantle.cjs` |
| `AgentEscrow` | Arbitrum Sepolia | `0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7` |
| `AgentIntentSettler` | Arbitrum Sepolia | via `deploy-arbitrum.cjs` |
| `QieCheckout` | QIE Testnet | `0xA8302734081F26b8a3E42f90DCf07b3E063441de` |
| `QiePass` | QIE Testnet | via `deploy-qie.cjs` |
| `QieAgentCredit` | QIE Testnet | via `deploy-qie.cjs` |
| `QieOracleFeed` | QIE Testnet | via `deploy-qie.cjs` |
| `ArcMindRegistry` | Arc Testnet | `0x24Cb6d1bE131006e8CB2cb7fBa5675725f9E6Da8` |
| `CopyTradeEscrow` | Arc Testnet | via `deploy-arc.cjs` |

## What makes TollGate different

- **MCP server (9 tools)** — x402 is a first-class tool-call for Claude Desktop agents
- **A2A auto-cycle** — "Start Economy" button: agents trade autonomously every 5 seconds
- **On-chain budget enforcement** — `AgentBudgetController` with smart-contract daily caps and per-request limits
- **FICO score for AI agents** — `AgentCreditRegistry.sol`: agent credit history built from on-chain receipt data
- **Receipt NFTs** — ERC-721 minted server-side per payment, shown live in Economy Dashboard via SSE
- **SQLite receipt ledger** — receipts survive server restarts; full history at `GET /api/receipts`
- **Multi-chain** — 0G + Mantle + Arbitrum + Base + QIE + Sui + Polygon from one unified gateway

## Quick start

```bash
npm install
npm run dev                  # Vite frontend on :5173

cd server
npm install
cp .env.example .env         # fill in your keys
npm run dev                  # API server on :3001
```

## API reference

```
GET  /api/services              list all paid services (?workspace=0g)
GET  /api/services/:id          service details
GET  /api/v1/x402-spec          x402 discovery document
GET  /api/gateway/:serviceId    → 402 challenge or unlocked data
GET  /api/receipts              receipt ledger (?workspace=&service=&agent=)
GET  /api/receipts/stats        economy stats (total, today, agents, avg)
GET  /api/agent-score/:agentId  FICO-style credit score from receipt history
GET  /api/events/payments       SSE: live payment feed (snapshot + receipt + nft_update)
GET  /api/status/health         server health
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

## Security

TollGate handles real on-chain payments — security is taken seriously.

**Server hardening (all in `server/src/`):**
- HTTP security headers on every response (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Permitted-Cross-Domain-Policies`). Mirrored in `vercel.json` for the frontend CDN.
- Rate limiting — `/api/og/upload` 10 req/min, `/api/gateway/:id` 30 req/min/IP, `/mcp` 60 req/min.
- `X-Agent-Id` header truncated to 128 printable-ASCII chars before any receipt write or log — prevents log injection.
- `X-Request-Id` header validated against `[a-zA-Z0-9_-]{1,64}` to block log injection.
- `/api/og/upload` body hard-capped at 50 KB.
- `devBypassEnabled` **not** exposed in production health response.
- x402 challenges are single-use, expire in 5 minutes, and are bound to a SHA-256 request hash.

**Frontend hardening:**
- Batch payout addresses validated with `/^0x[0-9a-fA-F]{40}$/` before signing any transaction.
- Sentry loaded via direct `import()` instead of `new Function()` eval.

**Known limitations:**
- `txHash` in `X-PAYMENT` is not verified on-chain in this build — a follow-up before production.
- `CORS_ORIGIN=*` by default; tighten to your domain before going live.
- MCP `create_service` accepts arbitrary endpoint URLs — add an SSRF blocklist before public deployment.

Full security policy: [SECURITY.md](SECURITY.md)
