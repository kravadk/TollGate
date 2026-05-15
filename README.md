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
  → Agent pays (USDC on-chain)
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
| **Server** | `server/` | Express + TypeScript. Real `402` gateway middleware, SQLite receipt ledger, SSE payment feed, and an **MCP server** exposing 9 tools (Claude Desktop agents call TollGate natively). |
| **Contracts** | `contracts/` | 18 Hardhat-deployed Solidity contracts across 0G, Mantle, Arbitrum, QIE, and Arc. |
| **SDK** | `packages/sdk/` | `@tollgate/sdk` — zero-dependency x402 client: `fetchPaid()` + `createTollGate()`. |

## Hackathon workspaces

Each workspace is a standalone submission for a different hackathon, with its own contracts, paid API services, and UI tabs.

| Workspace | Route | Hackathon | Networks | README |
|---|---|---|---|---|
| **0G** | `/app/0g` | 0G APAC Hackathon 2026 | 0G Mainnet, Base Sepolia | [src/workspaces/0g/README.md](src/workspaces/0g/README.md) |
| **Mantle** | `/app/mantle` | Mantle Turing Test: AI Awakening | Mantle Mainnet | [src/workspaces/mantle/README.md](src/workspaces/mantle/README.md) |
| **Arbitrum** | `/app/arbitrum` | Arbitrum Open House / Buildathon | Arbitrum Sepolia | [src/workspaces/arbitrum/README.md](src/workspaces/arbitrum/README.md) |
| **QIE** | `/app/qie` | QIE Hackathon | QIE Testnet (chainId 1983) | [src/workspaces/qie/README.md](src/workspaces/qie/README.md) |
| **Sui** | `/app/sui` | Sui Overflow 2026 | Sui Mainnet + Testnet | [src/workspaces/sui/README.md](src/workspaces/sui/README.md) |
| **Agora** | `/app/agora` | Arc Agora Hackathon | Arc Mainnet, Arbitrum, Base | [src/workspaces/agora/README.md](src/workspaces/agora/README.md) |
| **Polygon** | `/app/polygon` | Polygon zkEVM / UAE Commerce | Polygon zkEVM, Polygon PoS | [src/workspaces/polygon/README.md](src/workspaces/polygon/README.md) |

## Deployed contracts

| Contract | Network | Address |
|---|---|---|
| `AgentReceiptRegistry` | 0G Mainnet | `0xF4BFd93061B160Fa376c7F66De207a00225B4e70` |
| `ServiceRegistry` | 0G Mainnet | via `deploy-0g.cjs` |
| `AgentBudgetController` | 0G Mainnet | via `deploy-0g.cjs` |
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

## Key differentiators

- **MCP server (9 tools)** — the only hackathon project making x402 a first-class tool-call for Claude Desktop agents
- **A2A auto-cycle** — "Start Economy" one-click autonomous loop; agents trade every 5 seconds
- **On-chain budget enforcement** — `AgentBudgetController` with smart-contract daily caps + per-request limits
- **FICO score for AI agents** — `AgentCreditRegistry.sol` is the first credit scoring system for agents on any chain
- **Receipt NFTs** — ERC-721 minted server-side per payment, shown live in Economy Dashboard via SSE
- **SQLite receipt ledger** — receipts survive server restarts; full history queryable via `GET /api/receipts`
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
