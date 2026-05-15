# TollGate × Polygon — Agent Commerce

**Hackathon:** Polygon zkEVM / UAE Commerce Hackathon
**App route:** `/app/polygon`

## What it does

SME merchants publish paid APIs in 30 seconds; agents and buyers settle per call in USDC on Polygon zkEVM. The platform targets UAE cross-border commerce: AED stablecoin ↔ USDC remittance via the Polygon bridge, trade invoice tokenisation with 90% advance, and a merchant checkout endpoint that any website can use.

## Tracks entered

| Track | What we built |
|---|---|
| SME Trade Finance | `svc_poly_invoice`: tokenises AED trade invoices on Polygon zkEVM, advances 90% in USDC |
| Merchant Payments | `svc_poly_merchant`: hosted x402 checkout — buyer pays USDC per call, merchant receives instantly |
| Cross-Border Stablecoins | `svc_poly_cross`: AED ↔ USDC remittance via Polygon PoS bridge; UAE↔Global corridor |
| Agent Infrastructure | x402 gateway: single-use challenges, replay protection, on-chain receipt ledger |

## Paid APIs (x402 services)

| Service ID | Name | Price | Description |
|---|---|---|---|
| `svc_poly_invoice` | Invoice Finance API | $0.10 | Tokenises a trade invoice on Polygon; advances 90% of face value in USDC |
| `svc_poly_merchant` | Merchant Checkout API | $0.01 | Hosted x402 checkout; buyer pays USDC per call, merchant receives instantly |
| `svc_poly_cross` | Cross-Border Remittance API | $0.05 | Settles AED ↔ USDC remittances via Polygon bridge; UAE commerce corridor |

## UI tabs

1. **Overview** — merchant revenue dashboard, cross-border volume, receipt feed
2. **Merchant Mode** — publish a paid API endpoint in 30 seconds; x402 config generator
3. **Trade Finance** — invoice tokenisation: submit AED invoice → receive 90% USDC advance
4. **Agent Marketplace** — browse and pay for merchant services with USDC
5. **USDC Payments** — direct USDC transfer panel with Polygon zkEVM settlement
6. **Receipts** — full receipt ledger with Polygonscan links

## UAE commerce focus

- **AED stablecoin** remittance: UAE businesses pay in AED stablecoin, recipients receive USDC globally
- **Trade invoice financing**: tokenise AED 50,000 invoice → receive USDC 45,000 advance within minutes
- **Zero-trust checkout**: x402 single-use challenges mean merchants never trust agents; payment is verified on-chain before the API response is released

## Networks

| Network | Chain ID | Use |
|---|---|---|
| Polygon zkEVM | 1101 | Invoice tokenisation, merchant checkout |
| Polygon PoS | 137 | Cross-border remittance bridge |

## Merchant onboarding

A merchant publishes a paid API in 3 steps:
1. Register endpoint + price in the Merchant Mode tab
2. Wrap the endpoint with the TollGate SDK: `withTollGate({ priceUsd: 0.01 })`
3. Agents discover it via `GET /api/services?workspace=polygon` and pay automatically
