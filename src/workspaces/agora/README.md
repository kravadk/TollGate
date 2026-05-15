# TollGate × Agora — ArcMind Trading Intelligence

**Hackathon:** Arc Agora Hackathon
**App route:** `/app/agora`

## What it does

ArcMind is the first autonomous trading agent that shows judges its reasoning step by step, lets anyone copy-trade with $1, and hard-kills itself when drawdown exceeds the threshold — all settled in USDC on Arc L1 via CCTP cross-chain transfers. Data feeds (Hyperliquid OI, Polymarket sentiment, news sentiment, whale flows) are sold as sub-cent x402 Nanopayments.

## Tracks entered

| Track | What we built |
|---|---|
| Cross-Platform Arbitrage Agent | `svc_arc_arb`: CCTP cross-chain USDC arbitrage Arc → Base → Arbitrum, profit tracking |
| Adaptive Portfolio Manager | `svc_arc_portfolio`: multi-asset rebalance via Circle Paymaster; gas-free |
| Copy Trading | `CopyTradeEscrow.sol`: ERC-8183 copy-trade with 5% performance fee + auto-kill threshold |
| Reasoning Traces x402 | `svc_arc_reasoning`: buy ArcMind decision logs as Nanopayments; each trace = Kelly sizing + outcome |
| Kill Switch Risk Manager | Kill switch widget: auto-closes all positions when max drawdown is hit |

## Contracts deployed

| Contract | Network | Address |
|---|---|---|
| `ArcMindRegistry` | Arc Testnet | `0x24Cb6d1bE131006e8CB2cb7fBa5675725f9E6Da8` |
| `CopyTradeEscrow` | Arc Testnet | deployed via `deploy-arc.cjs` |

## Paid APIs (x402 services)

| Service ID | Name | Price | Description |
|---|---|---|---|
| `svc_arc_oracle` | Arc Price Oracle | $0.02 | Real-time USDC price across Arc, Arbitrum, Base — spots cross-chain gaps |
| `svc_arc_arb` | Cross-Chain Arb Executor | $0.05 | Executes USDC arbitrage via CCTP; monitors finality, returns net profit |
| `svc_arc_portfolio` | Portfolio Rebalance API | $0.08 | Multi-asset rebalance instructions settled via Circle Paymaster |
| `svc_arc_signal_hl` | Hyperliquid OI Feed | $0.002 | Open interest delta + funding rate from Hyperliquid perps |
| `svc_arc_signal_poly` | Polymarket Sentiment Feed | $0.001 | YES probability for top macro events on Polymarket |
| `svc_arc_signal_news` | News Sentiment Oracle | $0.005 | Aggregated sentiment from 200+ crypto news sources |
| `svc_arc_signal_whale` | On-Chain Whale Tracker | $0.003 | Net wallet flows >$100k across Arc, Base, and Arbitrum |
| `svc_arc_reasoning` | Reasoning Trace Marketplace | $0.01 | ArcMind step-by-step decision logs: signal → Kelly sizing → outcome |
| `svc_arc_copytrade` | Copy ArcMind — ERC-8183 Escrow | $1.00 | Open copy-trade position in `CopyTradeEscrow.sol`; auto PnL settlement |

## UI tabs

1. **Overview** — ArcMind performance summary, live arb feed, kill switch status
2. **Arbitrage Agent** — live cross-chain price oracle + CCTP arb executor panel
3. **Copy Trading** — stake USDC into `CopyTradeEscrow.sol`, view PnL + kill threshold
4. **Reasoning Traces** — buy ArcMind decision trace via x402; view signal, sizing, outcome
5. **Signal Hub** — 4 live data feeds: Hyperliquid OI, Polymarket, news sentiment, whale tracker
6. **Portfolio Manager** — multi-asset rebalancer: target weights → rebalance calldata via Paymaster
7. **Circle Tools** — CCTP cross-chain USDC transfer builder + status tracker
8. **Receipts** — full payment history with Arc explorer links

## ArcMind kill switch

When cumulative drawdown exceeds the configured threshold (default 15%), the kill switch:
1. Stops all new position entries
2. Posts a `killSwitch` event to `ArcMindRegistry` on-chain
3. Triggers liquidation of all copy-trade escrows at current mark price
4. Emits a receipt for the forced exit

This is auditable by any judge via the on-chain registry.

## Architecture: Nanopayment data feeds

Each signal call is priced at $0.001–$0.005 — genuinely sub-cent per call. This is only viable because x402 challenges are issued and verified server-side with no per-call gas cost; the on-chain cost is amortised across many calls.
