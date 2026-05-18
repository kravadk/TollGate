# ArcMind CopyGuard Submission Pack

Status date: 2026-05-18

Use this as the source text for the Agora submission form, GitHub README polish, and 3-minute video notes.

To generate a live, metric-filled version from the deployed backend:

```bash
AGORA_FRONTEND_URL=https://<frontend-domain> AGORA_BACKEND_URL=https://<backend-domain> npm run agora:submission
```

To write it to a local markdown file:

```bash
AGORA_FRONTEND_URL=https://<frontend-domain> AGORA_BACKEND_URL=https://<backend-domain> AGORA_SUBMISSION_OUTPUT=docs/AGORA-LIVE-SUBMISSION-SUMMARY.md npm run agora:submission
```

## One-Liner

ArcMind CopyGuard is an AI risk layer for copy-traders: it detects leader strategy decay, decides who to copy or stop, and records paid reasoning traces plus protected USDC portfolio receipts on Arc.

## Short Description

Copy-trading products make it easy to follow high-performing traders, but they rarely warn users when a leader's strategy starts decaying. ArcMind CopyGuard monitors leader performance, market signals, volatility, recent losses, and signal divergence. The agent then chooses COPY, REDUCE, STOP, HOLD_USDC, or MOVE_TO_USYC, explains the decision through a paid reasoning trace, and can create a protected USDC copy portfolio after wallet payment verification.

The product is built for Agora Agents because the agent does not only summarize data. It makes market-facing allocation decisions, exposes its reasoning, and uses Arc/Circle primitives for settlement, receipts, and auditability.

## Specific User Problem

Retail copy-traders often copy leaders after the alpha is already gone. They see headline win rate or PnL, but miss degradation signals such as recent loss clustering, increasing drawdown, low liquidity, crowding, or divergence from market conditions.

ArcMind solves the moment before a bad copy-trade:

- Should I still copy this leader?
- Should I reduce exposure?
- Should I stop copying entirely?
- How much should stay risk-off in USDC/USYC?
- Can I verify why the agent made that decision?

## Target User

- Copy-traders who follow Hyperliquid or perp leaderboard traders.
- Prediction and market-intelligence users who want explainable agent decisions.
- Retail users who need a simple STOP/REDUCE/COPY answer before committing funds.
- Judges/operators who need an auditable live demo with real payment boundaries.

## RFB Fit

Primary:

- RFB 06 Social Trading Intelligence: AI-weighted copy allocation, leader decay detection, and shareable decision cards.

Secondary:

- RFB 04 Adaptive Portfolio Manager: protected portfolio construction, risk-off allocation, and user guardrails.
- RFB 02 Prediction/Trader Intelligence: signal reasoning, confidence, and paid reasoning traces as the product.

## Why It Is Agentic

ArcMind performs an explicit decision loop:

1. Observe market and leader signals.
2. Score each leader for quality and strategy decay.
3. Apply user risk settings and stop thresholds.
4. Choose a market action: COPY, REDUCE, STOP, HOLD_USDC, or MOVE_TO_USYC.
5. Produce an auditable reasoning trace.
6. Verify payments before unlocking traces or portfolio receipts.
7. Replay the decision for judges and users.

The UI exposes this loop through Decision Replay, Strategy Decay Factor Breakdown, Arc Audit, What-If Simulator, Signal Source Radar, and Shareable Decision Card.

## Circle / Arc Usage

Implemented:

- Arc-native payment verification for trace unlocks and protected portfolio starts.
- USDC-denominated payout address and receipts.
- Arc transaction links for verified decisions and receipts.
- Readiness endpoint that checks Arc RPC, payout wallet, x402 network, Arc signer, agent id, and contracts.
- Read-only walkthrough mode that never creates fake local receipts.

Product surfaces:

- Paid reasoning trace unlock priced at $0.01.
- Protected portfolio start using verified Arc payment.
- USDC/USYC risk-off allocation preview.
- Wallet Center with Arc network state, payout, agent id, and faucet link.

Production target:

- `NODE_ENV=production`
- `X402_NETWORK=arc-testnet`
- `X402_PAYOUT_ADDRESS=<funded Arc wallet>`
- `ARC_RPC_URL=<Canteen/Arc RPC>`
- `ARC_PRIVATE_KEY=<dedicated funded signer>`
- `ARC_AGENT_ID=<registered agent id>`
- `VITE_ARC_REGISTRY_ADDRESS=<deployed registry>`
- `VITE_ARC_ESCROW_ADDRESS=<deployed escrow>`

## Innovation

The novel product wedge is not another leaderboard. It is a CopyGuard layer:

- Strategy decay score instead of raw leaderboard rank.
- Paid reasoning traces as the monetizable artifact.
- Public share card that does not leak payout or private data.
- Read-only What-If Simulator before payment.
- Signal Source Radar that turns API Mega List into a safe integration plan for social, news, market, and research data.
- Agent replay timeline for asynchronous judging.
- Submission readiness doctor that makes production gaps explicit.

## Traction Answer Template

Use real numbers from `/live` -> `Live Traction` or `/api/arc-traction/stats`.

Current metrics to fill before submission:

- Testers: `[fill from /api/arc-traction/stats]`
- Connected wallets: `[fill from /api/arc-traction/stats]`
- Feedback count: `[fill from /api/arc-traction/stats]`
- Trace unlocks: `[fill from /api/arc-traction/stats]`
- Protected portfolios: `[fill from /api/arc-traction/stats]`
- Verified testnet USDC volume: `[fill from /api/arc-traction/stats]`

Suggested form answer:

During the hackathon window we tested ArcMind CopyGuard with `[tester count]` users and recorded `[feedback count]` pieces of structured feedback around clarity, trust, willingness to copy, and confusion points. `[wallet count]` wallets connected, `[trace count]` reasoning traces were unlocked, and `[portfolio count]` protected portfolio receipts were created with `[volume]` testnet USDC volume. The strongest validation was that users understood the STOP/REDUCE/COPY output faster than raw leaderboard metrics and wanted clearer proof around why a leader was blocked.

## What Judges Should Click

1. Open `/live`.
2. Keep Read-only walkthrough active.
3. Open Judge Walkthrough.
4. Check Submission Readiness score.
5. Inspect Latest CopyGuard Decision.
6. Open a leader row and review Strategy Decay Factor Breakdown.
7. Copy the Shareable Decision Card.
8. Review Paid Reasoning Trace locked preview.
9. Review Decision Replay + Arc Audit.
10. Change What-If Simulator inputs.
11. Review Signal Source Radar and confirm unconfigured providers are labeled honestly.
12. Review Live Traction.
13. Switch to Live execution only when ready to connect wallet and create verified receipts.

## 3-Minute Video Outline

0:00-0:20 Problem:

- Copy-traders follow leaders after alpha decays.
- ArcMind is the risk layer before the copy action.

0:20-0:45 Agent decision:

- Show latest decision, primary action, stopped leader, hashes.
- Explain COPY/REDUCE/STOP as actual agent outputs.

0:45-1:15 Strategy decay:

- Open leader drawer.
- Show drawdown, recent losses, volatility, confidence drop, and signal divergence.

1:15-1:45 Arc/Circle usage:

- Show Wallet Center, payout, agent id, Arc tx link.
- Show paid reasoning trace and protected portfolio receipt flow.
- Emphasize no fake receipts in read-only mode.

1:45-2:15 Product depth:

- Show Decision Replay, Arc Audit, What-If Simulator, and settings.

2:15-2:40 Traction:

- Show Live Traction and structured feedback prompts.

2:40-3:00 Submission readiness:

- Open Judge Walkthrough.
- Show readiness score and final actions.
- Close with RFB 06 plus RFB 04 fit.

## Submission Form Checklist

- Public GitHub repo: `[fill]`
- Live product URL: `[fill]`
- Video demo URL: `[fill]`
- Backend `/api/arc-readiness` URL: `[fill]`
- Arc explorer tx for latest decision: `[fill if available]`
- Arc explorer tx for protected portfolio receipt: `[fill if available]`
- Canteen Discord feedback or notes: `[fill]`
- Circle tooling feedback: `[fill any friction points]`

## Honest Demo Boundaries

- Read-only walkthrough never sends wallet transactions.
- The UI does not create local fake receipts.
- Paid trace unlock requires a verified Arc payment.
- Protected portfolio start requires a verified Arc payment.
- If an env/provider is missing, readiness and UI show the missing item instead of pretending success.

## Final Submission Claim

ArcMind CopyGuard is a market-facing AI agent for social trading intelligence. It helps users avoid decayed copy-trading leaders, explains decisions through paid traces, and uses Arc/USDC settlement for verified portfolio and trace receipts. The product is designed for asynchronous judging: a reviewer can open `/live`, follow the Judge Walkthrough, inspect readiness, replay the latest agent decision, and verify where the product is live, paper-ready, or waiting on production secrets.
