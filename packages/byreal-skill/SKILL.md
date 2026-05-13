---
name: tollgate-x402
description: "TollGate x402 payment gateway for AI agents. Enables agents to autonomously pay for APIs using HTTP 402 protocol with USDC on Mantle, 0G, Arbitrum, and Sui — no API keys, no human approval. Use when an agent needs to: pay for an API call, access a paid data feed, list available services, retrieve a payment receipt, or execute agent-to-agent payment. Triggered by phrases: 'pay for', 'access paid API', 'x402 payment', 'buy service', 'agent payment', 'tollgate'."
license: MIT
metadata:
  openclaw:
    homepage: https://github.com/kravadk/tollgate
    requires:
      env:
        - TOLLGATE_BASE_URL
        - TOLLGATE_AGENT_ID
    install:
      - kind: node
        package: "@tollgate/sdk"
        global: false
---

# TollGate x402 — Agent Payment Gateway

TollGate implements the HTTP 402 "Payment Required" protocol for AI agents. An agent calls any paid API → receives a 402 challenge → pays in USDC via x402 → receives data + cryptographic receipt anchored on Mantle mainnet.

**No accounts. No API keys. No human approval. Every payment is cryptographically proven on-chain.**

## Deployed Contracts (Mantle mainnet)

- **AgentIdentityRegistry (ERC-8004):** `0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB`
- **AgentVault:** `0xCbBcFc657787Fef2702ae6E35CA5a809a68480da`

## Live Gateway

- **Server:** `https://tollgate-1.onrender.com`
- **Frontend:** `https://toll-gatee.vercel.app`
- **MCP endpoint:** `https://tollgate-1.onrender.com/mcp`

## Installation

```bash
npm install @tollgate/sdk
```

## SDK Quick Start (5 lines)

```typescript
import { createTollGate } from "@tollgate/sdk";

const tg = createTollGate({ agentId: "my-agent-0x1234", devBypass: true });
const services = await tg.listServices("mantle");
const result = await tg.fetchPaid("svc_mnt_meth");
console.log(result.data, result.receiptId);
```

## Available Services

Query live services:
```bash
curl https://tollgate-1.onrender.com/api/services?workspace=mantle
```

Key Mantle services:
| Service ID | Name | Price | Description |
|---|---|---|---|
| `svc_mnt_meth` | mETH/USDY Yield Signal | $0.10 | Rotation signal across mETH and USDY |
| `svc_mnt_rwa` | Mantle RWA Risk API | $0.06 | Risk metrics for tokenised RWA baskets |
| `svc_mnt_backtest` | Strategy Backtest API | $0.15 | Backtest strategy spec on Mantle data |
| `svc_mnt_liq` | Mantle Liquidity Map | $0.04 | Liquidity depth across Mantle DEX pools |

## Payment Flow

```
Agent → GET /api/gateway/{serviceId}
         ← 402 { challenge: { challengeId, amount, currency, payTo, network } }
Agent → GET /api/gateway/{serviceId} + X-PAYMENT: <base64 proof>
         ← 200 { data, receiptId, receipt }
```

## MCP Interface (for Claude/AI assistants)

TollGate exposes a Model Context Protocol server at `https://tollgate-1.onrender.com/mcp`:
```json
{
  "tools": [
    { "name": "list_services",    "description": "List available paid services" },
    { "name": "pay_for_service",  "description": "Execute x402 payment and receive data" },
    { "name": "list_receipts",    "description": "Retrieve payment receipt history" },
    { "name": "get_agent_policy", "description": "Get spending policy for an agent" }
  ]
}
```

## Agent Credit Score (ERC-8004 Reputation)

Agents earn a credit score (0–1000) stored on Mantle via AgentCreditRegistry.
Higher scores → lower fees (0.1%) and higher rate limits.

```bash
curl https://tollgate-1.onrender.com/api/credit/{agentAddress}
```

## x402 Price Feeds

```bash
# Get live Mantle DEX price (requires x402 payment)
curl https://tollgate-1.onrender.com/api/feeds/mnt-price
# → 402 challenge
# Pay → { "pair": "MNT/USDC", "price": 0.312, "change24h": "+2.1%" }
```

## Byreal Agent Integration

```typescript
import { createTollGate } from "@tollgate/sdk";

const tg = createTollGate({
  baseUrl: process.env.TOLLGATE_BASE_URL ?? "https://tollgate-1.onrender.com",
  agentId: process.env.TOLLGATE_AGENT_ID,
});

// Pay for yield signal and get data + on-chain receipt
const { data, receiptId } = await tg.fetchPaid("svc_mnt_meth");
```

## When to Use TollGate

- Agent needs paid API without API keys → `fetchPaid(serviceId)`
- Agent wants to list paid services → `listServices(workspace)`
- Need on-chain proof of agent payment → receipt is anchored on Mantle
- Building agentic economy micropayments → `@tollgate/sdk`
