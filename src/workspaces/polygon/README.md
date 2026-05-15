# Polygon Agent Commerce

**App route:** `/app/polygon`

## What it does

SME merchants publish paid APIs in 30 seconds; agents and buyers settle per call in USDC on Polygon zkEVM. The platform targets UAE cross-border commerce: AED stablecoin ↔ USDC remittance via the Polygon bridge, trade invoice tokenisation with a 90% advance, and a merchant checkout endpoint any website can use.

## Features

| Feature | Description |
|---|---|
| Invoice tokenisation | Tokenise a trade invoice on Polygon zkEVM; receive 90% of face value in USDC instantly |
| x402 merchant checkout | Hosted endpoint: buyer pays USDC per call, merchant receives on Polygon |
| Cross-border remittance | AED ↔ USDC settlement via Polygon PoS bridge; UAE–Global corridor |
| Merchant onboarding | Publish a paid API in 30 seconds from the Merchant Mode tab |
| Agent marketplace | Agents discover and pay for merchant services via `GET /api/services?workspace=polygon` |
| Zero-trust checkout | Payment verified on-chain before API response is released |

## Paid APIs (x402 services)

| Service ID | Name | Price | Description |
|---|---|---|---|
| `svc_poly_invoice` | Invoice Finance API | $0.10 | Tokenises a trade invoice on Polygon; advances 90% of face value in USDC |
| `svc_poly_merchant` | Merchant Checkout API | $0.01 | Hosted x402 checkout; buyer pays USDC per call, merchant receives instantly |
| `svc_poly_cross` | Cross-Border Remittance API | $0.05 | Settles AED ↔ USDC remittances via Polygon bridge |

## UI tabs

1. **Overview** — merchant revenue dashboard, cross-border volume, receipt feed
2. **Merchant Mode** — publish a paid API endpoint in 30 seconds; x402 config generator
3. **Trade Finance** — invoice tokenisation: submit AED invoice → receive 90% USDC advance
4. **Agent Marketplace** — browse and pay for merchant services with USDC
5. **USDC Payments** — direct USDC transfer panel with Polygon zkEVM settlement
6. **Receipts** — full receipt ledger with Polygonscan links

## Networks

| Network | Chain ID | Purpose |
|---|---|---|
| Polygon zkEVM | 1101 | Invoice tokenisation, merchant checkout |
| Polygon PoS | 137 | Cross-border remittance bridge |

## Merchant onboarding in 3 steps

1. Register endpoint + price in the Merchant Mode tab
2. Wrap your API with the TollGate SDK: `withTollGate({ priceUsd: 0.01 })`
3. Agents discover it via `GET /api/services?workspace=polygon` and pay automatically — no integration on their side
