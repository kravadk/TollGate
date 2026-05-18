# ArcMind CopyGuard Production Deployment

Status date: 2026-05-18

This checklist is scoped only to the Agora/Arc live demo.

## Deployment Shape

Recommended split:

- Frontend: Vercel, Netlify, or any static host serving the Vite build.
- Backend: Render, Fly.io, Railway, or any Node host with persistent storage for traction/receipt data.
- Persistent data: mount a volume or persistent disk for `data/arc-traction.jsonl`, `data/arc-decisions.jsonl`, and receipts DB.

## Backend Environment

Required for public production:

```bash
NODE_ENV=production
PORT=8787
CORS_ORIGIN=https://<frontend-domain>
SERVER_URL=https://<backend-domain>

X402_PAYOUT_ADDRESS=0x<funded-arc-wallet>
X402_NETWORK=arc-testnet
X402_ASSET=USDC

ARC_RPC_URL=https://<arc-rpc>
ARC_PRIVATE_KEY=<dedicated-funded-hot-wallet-private-key>
ARC_AGENT_ID=0x<bytes32-agent-id>
ARC_AGENT_REGISTER_TX=0x<registration-tx-hash>
ARC_AGENT_INTERVAL_MS=1800000

APIFY_TOKEN=<optional-apify-token>
ARC_SIGNAL_SOURCE_MODE=watchlist

VITE_ARC_REGISTRY_ADDRESS=0x<ArcMindRegistry-address>
VITE_ARC_ESCROW_ADDRESS=0x<CopyTradeEscrow-address>

ARC_TRACTION_FILE=/persistent/data/arc-traction.jsonl
DB_PATH=/persistent/data/receipts.db
```

Optional during dry run:

```bash
ARC_PRIVATE_KEY=
ARC_AGENT_ID=
ARC_AGENT_REGISTER_TX=
APIFY_TOKEN=
ARC_SIGNAL_SOURCE_MODE=watchlist
```

If these signer fields are missing, `/api/arc-readiness` should report `ready_paper`, not `ready_onchain`.

`APIFY_TOKEN` is optional. Without it, `/api/arc-signal-sources` must show provider-backed sources as `needs_key` instead of live.

## Frontend Environment

Required:

```bash
VITE_SERVER_URL=https://<backend-domain>
VITE_API_BASE=https://<backend-domain>
VITE_ARC_REGISTRY_ADDRESS=0x<ArcMindRegistry-address>
VITE_ARC_ESCROW_ADDRESS=0x<CopyTradeEscrow-address>
VITE_ARC_EXPLORER=https://testnet.arcscan.app
```

Optional:

```bash
VITE_ARC_PAYMASTER_URL=
```

## Secret Handling

- Use a dedicated Arc hot wallet for `ARC_PRIVATE_KEY`.
- Do not reuse the user's main wallet private key.
- Fund only enough testnet USDC for the demo loop and receipts.
- Store the private key only in the backend host secret manager.
- Never expose `ARC_PRIVATE_KEY` through frontend env variables.
- Rotate the key after the hackathon if the deployment stays public.

## Pre-Deploy Checks

Run locally:

```bash
cd server && npm test && npm run build
cd .. && npm test && npm run build
```

Check no obvious local-only references in Arc surfaces:

```bash
rg -n "localhost|127.0.0.1|dev-bypass|fake receipt|fallback tx|local receipt" src/pages/ArcMindLive.tsx src/workspaces/agora server/src/arc-*.ts server/src/routes.ts
```

Allowed matches:

- `dev-bypass` in generic x402/MCP documentation only, not Arc live client success paths.
- Honest failure copy such as `No local receipt created`.
- Docs and local run instructions.

## Post-Deploy Checks

Run these against production:

```bash
curl https://<backend-domain>/api/version
curl https://<backend-domain>/api/arc-readiness
curl https://<backend-domain>/api/arc-live
curl https://<backend-domain>/api/arc-alerts
curl https://<backend-domain>/api/arc-decision-replay/latest
curl https://<backend-domain>/api/arc-signal-sources
curl "https://<backend-domain>/api/services?workspace=agora"
curl "https://<backend-domain>/api/receipts?workspace=agora"
```

Run the browser/API smoke check against production:

```bash
AGORA_FRONTEND_URL=https://<frontend-domain> AGORA_BACKEND_URL=https://<backend-domain> npm run test:agora-live
```

Generate the live submission summary:

```bash
AGORA_FRONTEND_URL=https://<frontend-domain> AGORA_BACKEND_URL=https://<backend-domain> npm run agora:submission
```

For local pre-deploy QA:

```bash
AGORA_FRONTEND_URL=http://127.0.0.1:5173 AGORA_BACKEND_URL=http://127.0.0.1:8787 npm run test:agora-live
```

Expected readiness:

- `ready_paper` and score `>=70` before signer secrets.
- `ready_onchain` and score `100` for final demo.

Current local readiness snapshot from 2026-05-18 pre-deploy QA:

- Development server status: `ready_paper`
- Development server score: `92/100`
- Local production-mode status: `ready_onchain`
- Local production-mode score: `100/100`
- Remaining blocker for public `100/100`:
- Deploy backend with `NODE_ENV=production`.
- `CopyTradeEscrow` is resolved from `contracts/deployments/arcTestnet.json` when `VITE_ARC_ESCROW_ADDRESS` is absent from backend env.

## Browser QA

Desktop:

- Open `/live`.
- Open `Judge Walkthrough`.
- Confirm Submission Readiness score appears.
- Confirm no console errors.
- Confirm no horizontal overflow.

Mobile:

- Test width around 390px.
- Open `Judge Walkthrough`, `Settings`, `Alerts`, and a leader drawer.
- Confirm text wraps, buttons remain tappable, and no drawer content is clipped.

## Final Demo Data Checklist

Before recording:

- Latest decision exists.
- Decision replay has five steps.
- Strategy decay factors render for each leader.
- At least one structured feedback item exists.
- At least one wallet connection is recorded if possible.
- At least one trace unlock receipt exists if testnet USDC is available.
- At least one protected portfolio receipt exists if testnet USDC is available.
- `/api/arc-readiness` missing list is understood and explainable.

## Rollback

If production payment verification fails:

1. Keep `/live` in Read-only walkthrough for judges.
2. Verify `ARC_RPC_URL`, `X402_PAYOUT_ADDRESS`, and `X402_NETWORK`.
3. Check the wallet is on Arc testnet and has testnet USDC.
4. Re-run `/api/arc-readiness`.
5. Do not manually create local receipts as a workaround.
