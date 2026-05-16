# 0G Agent Payment Router

**App route:** `/app/0g`

## What it does

Agents pay-per-call for AI inference and decentralised storage on the 0G network. Every payment flows through the x402 protocol: the server issues a single-use challenge, the agent pays USDC on-chain, and the response is unlocked only after the payment is verified. Each settled call produces a cryptographic receipt anchored to 0G Storage and a Receipt NFT minted on Mantle.

## Features

| Feature | Description |
|---|---|
| x402 payment gateway | 5 paid APIs, single-use challenges, replay-safe, USDC settlement |
| `AgentReceiptRegistry.sol` | Immutable on-chain audit trail per payment on 0G mainnet |
| `AgentIdentityRegistry.sol` | ERC-8004 identity NFT binding + EIP-191 signed credential display |
| `ServiceRegistry.sol` | On-chain service catalog with price enforcement |
| `AgentBudgetController.sol` | Per-agent daily + per-request spend limits |
| `DeliveryVerifier.sol` | Delivery proof anchoring with Merkle root verification |
| A2A trading loop | Strategist agent hires Executor → 0G Compute risk score → Mantle decision log |
| TEE & Privacy | TEE attestation badge, private sealed context API (Seal-encrypted) |
| MCP server | 9 tools — Claude Desktop agents call TollGate APIs natively via tool-use |
| Economy Dashboard | Live SSE payment feed, receipt NFT chips, total volume |
| Network toggle | Mainnet (chainId 16661) — persisted in localStorage |

## Contracts deployed

### 0G Mainnet (chainId 16661)

| Contract | Address |
|---|---|
| `AgentReceiptRegistry` | [`0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f`](https://chainscan.0g.ai/address/0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f) |
| `AgentIdentityRegistry` | [`0x8769E9ad02728d49D08CE2F5D5cd4ce75EeC0446`](https://chainscan.0g.ai/address/0x8769E9ad02728d49D08CE2F5D5cd4ce75EeC0446) |
| `ServiceRegistry` | [`0x2b27425bd22Ae883dEc34F7a8Eacacf336C562b8`](https://chainscan.0g.ai/address/0x2b27425bd22Ae883dEc34F7a8Eacacf336C562b8) |
| `AgentBudgetController` | [`0x305eF265BD964fBe34913E70Ef6AA8951e6b662e`](https://chainscan.0g.ai/address/0x305eF265BD964fBe34913E70Ef6AA8951e6b662e) |
| `DeliveryVerifier` | [`0x5F4999829D57f714497343f5677e66e6A56238E3`](https://chainscan.0g.ai/address/0x5F4999829D57f714497343f5677e66e6A56238E3) |

## Paid APIs (x402 services)

| Service ID | Name | Price | Description |
|---|---|---|---|
| `svc_0g_inference` | 0G Inference Risk Report | $0.03 | Runs a risk-assessment model on a wallet/contract via 0G Compute |
| `svc_0g_storage` | 0G Storage Memory Write | $0.02 | Persists an agent memory blob to 0G Storage with verifiable reference |
| `svc_0g_context` | Private Agent Context API | $0.04 | Sealed agent working context, only the receipt holder can read |
| `svc_0g_dav` | 0G DA Verify | $0.015 | Verifies a 0G data-availability commitment and returns inclusion proof |
| `svc_0g_batch` | 0G Compute Batch Job | $0.09 | Queues batch inference prompts; one receipt covers the whole batch |

## UI tabs

1. **Overview** — live Economy Dashboard: payment feed (SSE), total volume, receipt NFT chips, ecosystem links
2. **Agent Identity** — ERC-8004 identity NFT binding, EIP-191 signed credential display
3. **Compute** — 0G Compute inference panel, real model call, job result + receipt anchor
4. **Trading Arena** — A2A loop: Strategist agent hires Executor → 0G Compute → Mantle decision
5. **Storage & Memory** — 0G Storage pin widget (real Merkle root vs SHA-256 fallback badge)
6. **TEE & Privacy** — TEE attestation badge, private sealed context viewer
7. **Receipts** — full receipt ledger (SQLite-persisted), NFT chip, 0G Storage explorer links

## Ecosystem resources

| Network | Tool | URL |
|---|---|---|
| Mainnet | Chainscan Explorer | https://chainscan.0g.ai |
| Mainnet | StorageScan | https://storagescan.0g.ai |
| Mainnet | Bridge | https://bridge.0g.ai |
| Mainnet | DApp Hub | https://hub.0g.ai |
| Testnet | Galileo Explorer | https://chainscan-galileo.0g.ai |
| Testnet | StorageScan Galileo | https://storagescan-galileo.0g.ai |
| Testnet | Faucet | https://faucet.0g.ai |
| Both | Storage Indexer | https://indexer-storage-turbo.0g.ai |
| Both | Docs | https://docs.0g.ai |

The Overview tab renders these links automatically based on the active mainnet/testnet toggle.

## Architecture

```
Agent → GET /api/gateway/svc_0g_inference
      ← 402 { challengeId, payTo, amount: "0.03", asset: "USDC", network: "0g-mainnet" }
      → pay USDC on-chain → retry with X-PAYMENT header
      ← { data, receiptId, receipt }
      → receipt anchored to 0G Storage + NFT minted on Mantle
```

## Security

- **Amount validation** — all user-facing amount inputs pass through `safeAmt()` (`src/lib/validate.ts`); NaN, negative, and overflow values are rejected before any chain call.
- **Tx hash guard** — receipt NFT links only render when `isTxHash()` validates the 64-char hex hash, preventing open-redirect via malformed tx hashes.
- **Server error sanitisation** — 500 responses return `{ error: "internal_error" }` only; no stack traces or RPC messages reach the client.
- **Model allowlist** — the inference API validates the `model` parameter against a fixed allowlist (`routes.ts`); unknown model names return 400.
- **RPC error stripping** — x402 verification failures return `{ verified: false, reason: "rpc_error" }` without leaking node error messages.

## Environment variables

```
OG_STORAGE_INDEXER=https://...        # 0G Storage indexer RPC
OG_COMPUTE_PRIVATE_KEY=0x...          # server-side wallet for compute billing
RECEIPT_NFT_ADDRESS=0x...             # ReceiptNFT contract on Mantle
MINTER_PRIVATE_KEY=0x...              # server-side wallet for NFT minting
VITE_0G_NETWORK=mainnet               # "mainnet" | "testnet" default
```
