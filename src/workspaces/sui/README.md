# TollGate × Sui — SuiAgent OS

**Hackathon:** Sui Overflow 2026
**App route:** `/app/sui`
**Deadline:** 23 May 2026

## What it does

The first Agent Economy OS on Sui: agents hire agents via x402, escrow funds earn DeepBook yield while tasks run, receipts live permanently on Walrus, and agent reputation is a living NFT that updates with every transaction. Any website can accept AI payments by dropping in a single `<sui-pay>` script tag.

## Tracks entered

| Track | Prize | What we built |
|---|---|---|
| Agentic Web (AI) | main track | x402 agent-to-agent hiring, Intent Engine NL→PTB, Agent Wallet with zkLogin |
| Walrus | $70K | Walrus Storage Pin API, Agent Memory Write with Seal encryption, receipt storage |
| DeepBook | $70K | Yield Escrow: locks payment in DeepBook LP while task runs, earns yield on delivery |
| EVE Frontier | $50K | Agent Arena: battle agents judged by Nautilus TEE, winners earn Legendary AgentNFT |
| ONE Championship | $70K | Agent Arena challenge entry with verifiable on-chain outcome |
| DeFi & Payments | general | DeepBook bid/ask panel, PTB builder, zkLogin proof API |

## Paid APIs (x402 services)

| Service ID | Name | Price | Description |
|---|---|---|---|
| `svc_sui_walrus_pin` | Walrus Storage Pin | $0.02 SUI | Pins a blob to Walrus; returns blob ID + storage epoch receipt |
| `svc_sui_move_exec` | Move Contract Executor | $0.015 SUI | Builds and dry-runs a Move PTB; returns effects without committing |
| `svc_sui_nft_mint` | NFT Mint API | $0.03 SUI | Mints a Sui Kiosk-compatible NFT for agent identity or access-pass |
| `svc_sui_agent_id` | Agent Identity Resolver | $0.005 SUI | Resolves agent address to on-chain identity NFT, reputation score, allowlist |
| `svc_sui_zkproof` | zkLogin Proof API | $0.01 SUI | Generates a zkLogin proof bundle from Google/Apple OAuth token |
| `svc_sui_yield_escrow` | DeepBook Yield Escrow | $0.025 SUI | Locks payment in DeepBook LP while task runs; releases principal + yield on delivery |
| `svc_sui_battle` | Agent Arena Challenge | $0.05 SUI | Registers an agent for an Arena challenge judged by Nautilus TEE |
| `svc_sui_pay_widget` | Sui Pay Button API | $0.001 SUI | One-tag drop-in payment widget for any website |
| `svc_sui_memory_write` | Agent Memory Write (Walrus) | $0.018 SUI | AES-GCM encrypts with Seal and pins to Walrus; returns blob ID + policy address |
| `svc_sui_intent` | Intent Engine — NL→PTB | $0.04 SUI | Parses natural-language workflow into composable multi-agent PTB |

## UI tabs

1. **Overview** — agent economy stats, Walrus upload demo, PTB builder intro
2. **Agent Wallet** — zkLogin wallet (Google/Apple OAuth), gas sponsorship display
3. **Walrus Storage** — pin blobs to Walrus, live epoch from Sui RPC, blob ID display
4. **Move Contracts** — PTB builder: drag-and-drop step composer, dry-run result
5. **NFT Market** — Kiosk-compatible NFT minting + transfer; `agent_reputation.move` display
6. **Yield Escrow** — DeepBook LP escrow: stake → earn → release; live SUI/DEEP prices
7. **Agent Arena** — battle challenge entry, Nautilus TEE judging, leaderboard
8. **Pay Widget** — `<sui-pay>` embed demo, snippet generator, one-click copy
9. **Memory Network** — Seal AES-GCM encrypted memory write to Walrus + policy viewer
10. **Intent Engine** — NL→PTB parser: type an intent, get a multi-step PTB
11. **Receipts** — full receipt ledger with Walrus blob links and SUI explorer txDigests

## Architecture

```
User / Agent → x402 challenge → pay SUI/USDC on-chain
             ↓
        receipt appended to SQLite + anchored to Walrus
             ↓
        NFT minted on Mantle (Receipt NFT cross-chain)
             ↓
        SSE nft_update event → frontend "NFT #N" chip
```

For DeepBook Yield Escrow: payment is locked into a SUI/USDC LP pool while the task runs, and the agent receives `principal + accrued yield` when the delivery proof is posted.

## Key differentiators

- **Yield-earning escrow**: no other Sui Overflow project earns LP yield on locked payment capital
- **Seal encrypted memory**: agent memories are AES-GCM encrypted and only the receipt holder can decrypt
- **One-tag Pay Widget**: `<sui-pay amount="0.01" asset="USDC">` — zero friction for web integration
- **Intent Engine**: converts plain English into deployable on-chain multi-agent PTBs
