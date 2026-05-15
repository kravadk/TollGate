# TollGate × 0G — Agentic Economy

**Hackathon:** 0G APAC Hackathon 2026 ($150K prize pool)
**App route:** `/app/0g`

## What it does

Agents pay-per-call for AI inference and decentralised storage on the 0G network. Every payment flows through the x402 protocol: the server issues a single-use challenge, the agent pays USDC on-chain, and the response is unlocked only after the payment is verified. Each settled call produces a cryptographic receipt anchored to 0G Storage and a Receipt NFT minted on Mantle.

## Tracks entered

| Track | What we built for it |
|---|---|
| Agentic Economy | x402 payment gateway: 5 paid APIs, single-use challenges, replay-safe, USDC settlement |
| Agentic Infra | `AgentReceiptRegistry.sol` on 0G mainnet — immutable on-chain audit trail per payment |
| Agentic Trading Arena | AlphaTrade widget: agent buys Mantle alpha data → 0G Compute risk score → Mantle decision log |
| Privacy & TEE | TEE badge, private agent context API (Seal-encrypted), sealed receipt display |
| Web 4.0 | MCP server (9 tools) — Claude Desktop agents call TollGate APIs natively via tool-use |

## Contracts deployed

| Contract | Network | Address |
|---|---|---|
| `AgentReceiptRegistry` | 0G Mainnet | `0xF4BFd93061B160Fa376c7F66De207a00225B4e70` |
| `ServiceRegistry` | 0G Mainnet | deployed via `deploy-0g.cjs` |
| `AgentBudgetController` | 0G Mainnet | deployed via `deploy-0g.cjs` |
| `DeliveryVerifier` | 0G Mainnet | deployed via `deploy-0g.cjs` |

## Paid APIs (x402 services)

| Service ID | Name | Price | Description |
|---|---|---|---|
| `svc_0g_inference` | 0G Inference Risk Report | $0.03 | Runs a risk-assessment model on a wallet/contract via 0G Compute |
| `svc_0g_storage` | 0G Storage Memory Write | $0.02 | Persists an agent memory blob to 0G Storage with verifiable reference |
| `svc_0g_context` | Private Agent Context API | $0.04 | Sealed agent working context, only the receipt holder can read |
| `svc_0g_dav` | 0G DA Verify | $0.015 | Verifies a 0G data-availability commitment and returns inclusion proof |
| `svc_0g_batch` | 0G Compute Batch Job | $0.09 | Queues batch inference prompts; one receipt covers the whole batch |

## UI tabs

1. **Overview** — live Economy Dashboard: payment feed (SSE), total volume, receipt NFT chips
2. **Agent Identity** — ERC-8004 identity NFT binding, EIP-191 signed credential display
3. **Compute** — 0G Compute inference panel, real model call, job result + receipt anchor
4. **Trading Arena** — A2A loop: Strategist agent hires Executor → 0G Compute → Mantle decision
5. **Storage & Memory** — 0G Storage pin widget (real Merkle root vs SHA-256 fallback badge)
6. **TEE & Privacy** — TEE attestation badge, private sealed context viewer
7. **Receipts** — full receipt ledger (SQLite-persisted), NFT chip, 0G Storage explorer links

## Key differentiators vs other 0G APAC projects

- **Multi-chain**: 0G + Mantle + Arbitrum + Base as one unified payment rail — only project with this breadth
- **MCP server**: 9 tools — TollGate is the only project making x402 a first-class Claude tool-call
- **A2A auto-cycle**: "Start Economy" one-click autonomous loop, agents trade every 5 seconds
- **On-chain budget enforcement**: `AgentBudgetController` with smart-contract daily caps
- **Receipt NFTs**: ERC-721 minted per payment, shown live in Economy Dashboard via SSE

## Environment variables required

```
OG_STORAGE_INDEXER=https://...        # 0G Storage indexer RPC
OG_COMPUTE_PRIVATE_KEY=0x...          # server-side wallet for compute billing
RECEIPT_NFT_ADDRESS=0x...             # ReceiptNFT contract on Mantle
MINTER_PRIVATE_KEY=0x...              # server-side wallet for NFT minting
```

## Local development

```bash
cd server && npm install && npm run dev   # API server on :3001
npm run dev                              # Vite frontend on :5173
```
