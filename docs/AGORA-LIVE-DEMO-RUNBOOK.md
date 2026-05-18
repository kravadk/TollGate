# Agora Live Demo Runbook

Status date: 2026-05-18
Product: ArcMind CopyGuard

Companion submission copy:

- `docs/AGORA-SUBMISSION-PACK.md`
- `docs/AGORA-PRODUCTION-DEPLOYMENT.md`
- `docs/AGORA-API-SIGNAL-RADAR.md`
- `server/.env.agora.example`
- `.env.agora.frontend.example`

## Public Demo Path

Primary judge URL:

- `/live`

Backend endpoints judges/operators can verify:

- `GET /api/arc-live`
- `GET /api/arc-readiness`
- `GET /api/arc-decisions`
- `GET /api/arc-alerts`
- `GET /api/arc-decision-replay/latest`
- `GET /api/arc-signal-sources`
- `GET /api/arc-verify/latest`
- `POST /api/arc-portfolio/simulate`
- `POST /api/arc-portfolio/start`
- `GET /api/arc-traction/stats`
- `GET /api/arc-readiness`
- `GET /api/services?workspace=agora`
- `GET /api/receipts?workspace=agora`

## Demo Story

One-liner:

> ArcMind CopyGuard protects copy-traders from leader decay by deciding who to copy, how much to allocate, and when to stop, with auditable Arc hashes and USDC receipts.

What the judge should see in 30 seconds:

- Live agent status and next autonomous decision countdown.
- A leader that looks attractive but is stopped due to degradation risk.
- Decision hash and CopyGuard hash.
- Shareable decision card with public copy text.
- Strategy decay factor breakdown for each leader.
- Decision Replay timeline: signal observed, leaders scored, risk checked, action chosen, Arc proof.
- Read-only What-If Simulator backed by portfolio logic.
- Paid reasoning trace unlock.
- Protected portfolio receipt in USDC.
- Traction panel with testers, traces, portfolios, decisions, and feedback.
- Signal Source Radar showing which social/news/research providers can be wired next and which risky sources are blocked.

## Judge Click Path

1. Open `/live`.
2. Keep `Read-only walkthrough` active for first inspection.
3. Click `Judge Walkthrough` and copy/view agent, payout, and latest proof values.
4. Inspect `Latest CopyGuard Decision`, then open a leader row to see decay factors.
5. Review `Shareable decision card`; copy share text if needed.
6. Inspect `Paid Reasoning Trace`; locked state shows only preview metadata.
7. Inspect `Notification Center` and `Decision Replay + Arc Audit`.
8. Use `What-If Simulator` by changing leader and stop threshold. It is read-only and never creates a receipt.
9. Check `Live Traction` and optionally submit structured feedback.
10. Check `Signal Source Radar`; unconfigured providers should show `needs key` or `watchlist`, not fake live data.
11. Switch to `Live execution` only when ready to connect wallet and create verified Arc payment receipts.

## Required Production Environment

Frontend:

- `VITE_SERVER_URL=https://<backend-domain>`
- Optional: `VITE_API_BASE=https://<backend-domain>`
- `VITE_ARC_REGISTRY_ADDRESS=<ArcMindRegistry address>`
- `VITE_ARC_ESCROW_ADDRESS=<CopyTradeEscrow address>`
- `VITE_ARC_EXPLORER=https://testnet.arcscan.app`

Backend:

- `NODE_ENV=production`
- `PORT=8787`
- `CORS_ORIGIN=https://<frontend-domain>`
- `X402_PAYOUT_ADDRESS=<provider wallet>`
- `X402_NETWORK=arc-testnet`
- `X402_ASSET=USDC`
- `ARC_RPC_URL=<Canteen/Arc RPC>`
- `ARC_PRIVATE_KEY=<dedicated funded hot wallet>`
- `ARC_AGENT_ID=<bytes32 registry agent id>`
- `VITE_ARC_REGISTRY_ADDRESS=<ArcMindRegistry address>`

Optional:

- `ARC_AGENT_INTERVAL_MS=1800000`
- `ARC_TRACTION_FILE=/persistent/data/arc-traction.jsonl`
- `APIFY_TOKEN=<optional Apify token for source radar adapters>`
- `ARC_SIGNAL_SOURCE_MODE=watchlist`

## Go/No-Go Checks

Run locally before every submit:

```bash
cd server && npm test && npm run build
cd .. && npm test && npm run build
AGORA_FRONTEND_URL=http://127.0.0.1:5173 AGORA_BACKEND_URL=http://127.0.0.1:8787 npm run test:agora-live
```

Production checks:

```bash
curl https://<backend-domain>/api/arc-readiness
curl https://<backend-domain>/api/arc-live
curl https://<backend-domain>/api/arc-signal-sources
curl "https://<backend-domain>/api/services?workspace=agora"
curl "https://<backend-domain>/api/receipts?workspace=agora"
```

Readiness target:

- Before signer secrets: `status=ready_paper`, score should be at least 70. This means the live demo has real product state, Arc RPC/payment config, visible traction, and judge-readable proof surfaces, but may still be missing the dedicated Arc signer or agent id.
- Final on-chain demo: `status=ready_onchain`, score should be 100. This means production mode, Arc RPC, non-zero payout wallet, Arc network, signer, agent id, contracts, traction, and at least one protected portfolio receipt are all configured.
- If status is `needs_decisions`, run the Arc agent loop and resolve required checks before recording the submission video.

The same readiness score appears inside `/live` → `Judge Walkthrough` → `Submission Readiness`. It never exposes private keys; it only reports whether required variables and proof artifacts are present.

## 3-Minute Video Script

### 0:00-0:20 Problem

"Copy-trading products make it easy to follow leaders, but they do not tell users when a leader's strategy has decayed. ArcMind CopyGuard is an AI risk layer for copy-traders."

Show:

- `/live`
- headline
- countdown
- RFB 06 badge

### 0:20-1:05 Agent Decision

"The agent runs autonomously. It watches market signals, leader performance, drawdowns, recent losses, liquidity, and crowding. It decides copy, reduce, stop, or risk-off."

Show:

- Latest CopyGuard Decision
- Low-Liq Sprinter `STOP`
- decay factor drawer
- shareable decision card
- Decision Replay timeline
- decision hash
- CopyGuard hash

### 1:05-1:40 Protected Portfolio

"A user chooses a risk profile and stake amount. The agent creates a protected USDC portfolio. Notice it allocates to usable leaders and routes the rest into risk-off USDC/USYC."

Show:

- Conservative/Balanced/Aggressive
- Create Protected Portfolio
- Protected Portfolio Receipt
- Risk-off allocation

### 1:40-2:10 Reasoning Trace Monetization

"The reasoning trace is the product. Users can unlock the latest trace for a $0.01 USDC nanopayment-style flow. On Arc, this is economical because settlement is fast and fees are stable."

Show:

- Unlock Trace
- locked trace preview
- unlocked trace sections if wallet/payment is available
- Arc/Circle Proof card

### 2:10-2:40 Traction

"Traction is built into the product. The dashboard records testers, trace unlocks, protected portfolios, feedback, and testnet USDC volume."

Show:

- Live traction panel
- structured feedback prompts
- stats update

### 2:40-3:00 Why Arc

"Arc gives this product the right physics: fast finality, USDC-native settlement, cheap receipts, and a stable cost basis for agentic commerce."

Show:

- Arc Testnet / USDC badge
- readiness endpoint or Arc tx links if on-chain secrets are configured

## Submission Form Copy

Short description:

> ArcMind CopyGuard is an AI risk layer for copy-traders. It watches leader decay, market crowding, funding/OI, and drawdown signals, then decides who to copy, how much to allocate, and when to stop. Decisions are hashed for Arc auditability, reasoning traces are monetized via USDC nanopayments, and users can create protected copy portfolios with testnet USDC receipts.

Tracks/RFBs:

- Primary: RFB 06 Social Trading Intelligence
- Secondary: RFB 04 Adaptive Portfolio Manager

Circle/Arc usage:

- USDC-denominated portfolio receipts
- Arc decision hashes / registry path
- x402/Gateway-style reasoning trace unlock
- USYC risk-off allocation preview
- Arc Testnet live backend readiness endpoint

Traction statement template:

> During the event window, we onboarded <N> testers, recorded <N> ArcMind decisions, created <N> protected portfolios, unlocked <N> reasoning traces, and collected <N> feedback notes. Volume is labeled as testnet USDC.
