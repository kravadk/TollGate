# Mantle Agent Wallet Economy

**App route:** `/app/mantle`

## What it does

AI agents hold wallets with on-chain spend policies, then autonomously buy Mantle alpha data, mETH/USDY yield signals, and RWA risk reports per call — all settled via x402 on Mantle. The platform includes a FICO-style credit scoring system for AI agents (`AgentCreditRegistry`), a budget controller enforcing daily and per-request caps on-chain, and an A2A loop where a Strategist agent hires an Executor and logs every decision to the blockchain.

## Features

| Feature | Description |
|---|---|
| On-chain agent wallets | Daily limit, per-request cap, autoPay, allowlist — enforced by `AgentBudgetController.sol` |
| Agent credit scoring | `AgentCreditRegistry.sol` — FICO-style score built from on-chain receipt history |
| A2A economy loop | Strategist → Executor → 0G Compute → `recordDecision()` on Mantle; auto-cycle every 5s |
| Yield signals | mETH/USDY rotation signal with live ETH price from CoinGecko |
| RWA risk data | T-BILL basket risk grades, duration/collateral breakdown, stress test API |
| Strategy backtester | Sharpe/MaxDD display; result recorded on-chain via `AgentVault.recordDecision()` |

## Contracts deployed

| Contract | Network | Address |
|---|---|---|
| `AgentIdentityRegistry` | Mantle Mainnet | `0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB` |
| `AgentCreditRegistry` | Mantle Mainnet | `0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9` |
| `AgentBudgetController` | Mantle Mainnet | via `deploy-mantle.cjs` |
| `ReceiptNFT` | Mantle Mainnet | via `deploy-mantle.cjs` |
| `AgentVault` | Mantle Mainnet | via `deploy-mantle.cjs` |

## Paid APIs (x402 services)

| Service ID | Name | Price | Description |
|---|---|---|---|
| `svc_mnt_rwa` | Mantle RWA Risk API | $0.06 | Risk + yield metrics for tokenised RWA baskets; collateral and duration breakdown |
| `svc_mnt_meth` | mETH / USDY Yield Signal | $0.10 | Yield + rotation signal with suggested rebalance band |
| `svc_mnt_backtest` | Strategy Backtest API | $0.15 | Backtests a strategy spec on Mantle market data; billed per run |
| `svc_mnt_liq` | Mantle Liquidity Map | $0.04 | DEX liquidity depth + routing suggestion for a given trade size |
| `svc_mnt_stress` | RWA Stress Test API | $0.12 | Rate/liquidity stress scenario on a tokenised RWA basket |

## UI tabs

1. **Overview** — agent wallet dashboard, spend meter, live receipt feed (SSE)
2. **Agent Economy** — A2A economy loop with "Start Economy" auto-cycle, Strategist → Executor flow
3. **Alpha Data** — mETH/USDY yield signal, Mantle liquidity map, whale alert feed
4. **Yield Compare** — mETH vs USDY yield comparison with live prices
5. **Yield Optimizer** — rebalance calculator with live ETH price from CoinGecko
6. **RWA Data** — T-BILL/RWA basket risk grades, duration, and collateral metrics
7. **Trading Strategies** — AlphaBotWidget: agent runs backtest → records decision on-chain
8. **AI DevTools** — Hardhat deploy templates, ABI snippets, strategy backtest runner
9. **Agent Credit Score** — FICO-style credit meter powered by `AgentCreditRegistry.sol`
10. **Budget Dashboard** — on-chain daily/per-request spend controls via `AgentBudgetController.sol`
11. **A2A Loop** — autonomous Strategist → Executor cycle; decision anchored to Mantle + 0G Storage

## Environment variables

```
VITE_MANTLE_CREDIT_ADDRESS=0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9
VITE_MANTLE_BUDGET_ADDRESS=0x...
RECEIPT_NFT_ADDRESS=0x...
MINTER_PRIVATE_KEY=0x...
```
