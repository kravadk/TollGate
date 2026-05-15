# TollGate × QIE — Agent Payment Gateway

**Hackathon:** QIE Hackathon
**App route:** `/app/qie`

## What it does

Merchants list paid AI and API services; agents and buyers settle through the QIE payment rail using the native QIE token. Access to premium endpoints is gated by `QIE Pass` — a soulbound NFT that identifies the merchant or user tier. An on-chain oracle feed provides live QIEDEX price data for agent decision-making.

## Tracks entered

| Track | What we built for it |
|---|---|
| DeFi & Payments | x402 merchant checkout: agents settle QIE-native per call; payout batching |
| AI + Web3 | `QieAgentCredit.sol` — on-chain agent credit scoring on QIE chain |
| Gaming & Metaverse | Game Store tab: in-game item purchases settled via QIE checkout |
| Social & Community | Creator Hub tab: content subscriptions gated by QIE Pass |
| Infra & Tools | `QieOracleFeed.sol` — permissioned price oracle on QIE testnet |

## Contracts deployed

| Contract | Network | Address |
|---|---|---|
| `QieCheckout` | QIE Testnet (chainId 1983) | `0xA8302734081F26b8a3E42f90DCf07b3E063441de` |
| `QiePass` | QIE Testnet (chainId 1983) | deployed via `deploy-qie.cjs` |
| `QieAgentCredit` | QIE Testnet (chainId 1983) | deployed via `deploy-qie.cjs` |
| `QieOracleFeed` | QIE Testnet (chainId 1983) | deployed via `deploy-qie.cjs` |

## Paid APIs (x402 services)

| Service ID | Name | Price | Description |
|---|---|---|---|
| `svc_qie_checkout` | QIE Merchant Checkout API | $0.01 | Creates a paid checkout intent; agents settle through the QIE rail |
| `svc_qie_dex` | QIEDEX Data API | $0.02 | Live QIEDEX pool data: depth, fees, recent trades, TWAP |
| `svc_qie_pass` | QIE Pass-Gated API | $0.03 | Premium endpoint requiring a valid QIE Pass (currently paused) |
| `svc_qie_payout` | QIE Merchant Payout API | $0.005 | Settles accumulated checkout balances to merchant wallet |
| `svc_qie_pos` | QIE POS Plugin Feed | $0.002 | Inventory + price feed the QIE POS plugin polls to stay in sync |

## UI tabs

1. **Overview** — merchant dashboard, total revenue, receipt feed
2. **Merchant Checkout** — `QieCheckout.sol` flow: create intent, pay, release to merchant
3. **QIE Wallet** — wallet connect on QIE testnet, balance display, token info
4. **QIE Pass** — soulbound merchant/user identity NFT: tier display, mint flow
5. **Oracle Feed** — `QieOracleFeed.sol` live QIEDEX price feed panel
6. **Agent Credit** — `QieAgentCredit.sol` on-chain agent credit score viewer
7. **Game Store** — in-game item purchases settled via QIE checkout
8. **Creator Hub** — content subscription gating via QIE Pass tiers

## Network details

- Chain ID: 1983 (QIE Testnet)
- Native currency: QIE
- RPC: configure via `VITE_QIE_RPC_URL`
- Explorer: configure via `VITE_QIE_EXPLORER_URL`
