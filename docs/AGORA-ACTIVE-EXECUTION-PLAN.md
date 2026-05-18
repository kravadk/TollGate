# ArcMind CopyGuard Active Execution Plan

> **For future Codex/agent sessions:** read this file first before changing Agora. This is the current ordered source of truth. Work top-to-bottom, update checkboxes/status notes as tasks are completed, and keep changes scoped to Arc/Agora unless the user explicitly expands scope.

**Goal:** turn ArcMind CopyGuard into a cohesive, judge-ready live product for Agora Agents Hackathon: clear onboarding, real Arc/Circle usage, honest payment states, visible agentic decisions, and traction/audit proof.

**Product Positioning:** ArcMind CopyGuard is a social-trading intelligence agent that ranks copy-trading leaders, detects strategy decay, explains decisions through paid reasoning traces, and starts protected USDC copy portfolios on Arc.

**Primary Tracks/RFB Fit:**
- RFB 06 Social Trading Intelligence: core focus.
- RFB 04 Adaptive Portfolio Manager: protected allocation + rebalancing.
- RFB 02 Prediction/Trader Intelligence: signal reasoning and +EV decision support.

**Judging Targets:**
- 30% Agentic Sophistication: decision replay, decay scoring, explainable actions.
- 30% Traction: live tester/wallet/feedback/payment panel.
- 20% Circle Usage: wallet connection, Arc payments, USDC receipts, Gateway/CCTP/App Kit surfaces.
- 20% Innovation: reasoning traces as paid product + CopyGuard decay detection.

---

## Execution Rules

- [ ] Before each coding session, read this file and pick the first unchecked task.
- [ ] Do not create fake success states, fake receipts, local hashes, or local payments.
- [ ] If a provider/payment/wallet/API is unavailable, show a clear unavailable state.
- [ ] Keep demo/read-only mode explicitly labeled and non-executing.
- [ ] After each task, run at minimum `npm run build`, relevant tests, and a browser QA pass for touched routes.
- [ ] Update this plan with status, files changed, and verification notes.

---

## Current Status

**Last updated:** 2026-05-19 00:45 Europe/Kyiv

**Done before this plan:**
- `/live` has real wallet + Arc tx verification for trace unlock and portfolio start.
- Arc client widgets no longer create local fake receipts on failed gateway/payment calls.
- Agora client grep is clean for obvious `dev-bypass`, fake/demo/fallback strings in Arc widgets.
- Browser QA passed for `/live` and Agora tabs on desktop/mobile without overflow or console errors.
- Task 1 is implemented: `/live` now has Judge Walkthrough, Wallet Center proof rows, copyable agent/payout/latest proof values, and review links.
- Task 2 is implemented in `/live`: persistent Live execution / Read-only walkthrough switch, disabled paid actions in walkthrough, and clear no-local-receipt copy.
- Task 3 is implemented in `/live`: expanded Settings Drawer with risk profile, max allocation, max drawdown, manual approval, notification preferences, persistence, and portfolio payload integration.
- Task 4 is implemented in `/live`: alerts load from `/api/arc-alerts`, read/unread state persists locally, each alert explains why it fired, and browser notifications are opt-in only.
- Task 5 is implemented: CopyGuard returns backend-scored decay factor breakdowns and `/live` displays them in leader rows and the leader drawer.
- Task 6 is implemented: backend exposes latest decision replay events and `/live` shows the agent loop before Arc audit verification.
- Task 7 is implemented: `/live` has a judge-visible traction panel with structured feedback prompts, prompt counters, verified volume, and validation highlights from backend events.
- Task 8 is implemented: reasoning trace unlock now has a locked marketplace preview, post-unlock sections, receipt link, copy JSON control, and explicit payment failure state.
- Task 9 is implemented: `/live` has a read-only What-If Simulator backed by `buildPortfolioSimulation` and `/api/arc-portfolio/simulate`.
- Task 10 is implemented: latest decisions now have a public share card and copyable share text with clipboard fallback and no payout/private data.
- Task 11 is complete: final desktop/mobile QA, forbidden-pattern grep, build/test pass, and live demo runbook update are done.
- Task 20 is implemented: API Mega List has been turned into an Arc-specific Signal Source Radar with backend source policy, `/live` UI, docs, and smoke coverage.
- Production smoke passed on 2026-05-18/19 against `https://toll-gatee.vercel.app` and `https://tollgate-1.onrender.com`: `/live`, 10 Agora tabs, readiness, decision replay, and signal source radar.

**Known caveat:**
- Backend generic x402/MCP still has non-production dev-bypass support. Arc live client does not use it. Production must run with `NODE_ENV=production`.

---

## Next Phase: Submission + Production Readiness

**Goal:** make the live demo safer to deploy and easier for judges/operators to verify without reading code.

**Ordered tasks:**
- [x] Task 12: Arc Submission Readiness Doctor.
- [x] Task 13: Public Submission Pack in docs.
- [x] Task 14: Production env sample and deployment checklist.
- [ ] Task 15: Final live-demo browser pass after deployment config. *(Pre-deploy smoke runner ready; production URL still needed.)*
- [x] Task 16: GitHub README judge entrypoint.
- [x] Task 17: Copyable live judge brief in `/live`.
- [x] Task 18: Live submission summary generator.
- [x] Task 19: Readiness deployment artifact fallback.
- [x] Task 20: API Mega List Signal Source Radar.
- [x] Task 21: Agora Max Product Control Layer.
- [x] Task 22: Ask ArcMind evidence chat.
- [x] Task 23: Prediction-market intelligence lane.
- [x] Task 24: Perps/liquidation protection lane.
- [x] Task 25: Cross-platform arbitrage profitability lane.
- [ ] Task 26: Final production smoke and submission summary refresh.
- [x] Task 27: Starter flow, business model, and delivery rules.

---

## Task 1: Judge Walkthrough + Wallet Center

**Status:** Done 2026-05-18.

**Why this matters:** judges review asynchronously. They need a guided, verifiable path that shows what is real, what is paid, what is on Arc, and what to click.

**User value:** users immediately understand whether they are connected, on the right network, and what actions require wallet/payment.

**Judge value:** maps directly to all criteria: agentic decisions, traction, Circle usage, and innovation.

**Files:**
- Modify: `src/pages/ArcMindLive.tsx`
- Modify if needed: `src/styles.css`
- Optional test: `src/test/smoke.test.ts`

**Implementation checklist:**
- [x] Add a top-level `Judge Walkthrough` action in `/live`.
- [x] Add a compact Wallet Center with wallet state, Arc network state, payout address, and required action.
- [x] Add checklist items: latest decision, Arc agent id, reasoning trace payment, portfolio payment, traction stats, and real review links.
- [x] Add copy buttons for agent id, payout address, latest tx hash/decision hash.
- [x] Add read-only copy explaining that judge inspection does not create receipts.
- [x] Ensure no button claims success without verified backend response.

**Verification:**
- [x] `npm run build` passed.
- [x] `npm test` passed.
- [x] `cd server; npm run build` passed.
- [x] `cd server; npm test` passed.
- [x] Browser: `/live` desktop and mobile, no overflow, no clipped elements, no console errors.
- [x] Browser: Judge Walkthrough opens, all links/buttons visible, no wallet required for read-only inspection.

---

## Task 2: Honest Guided Demo Mode

**Status:** Done 2026-05-18. Implemented as `Read-only walkthrough` in UI to avoid implying fake execution.

**Why this matters:** users without MetaMask/test tokens still need to understand the product, but judges must not see fake execution.

**User value:** lets a first-time visitor explore safely before connecting wallet.

**Judge value:** demonstrates product maturity and honesty.

**Files:**
- Modify: `src/pages/ArcMindLive.tsx`
- Modify: `src/components/widgets/agora/ArcMindWidgets.tsx`
- Modify: `src/components/widgets/agora/AgoraExtraWidgets.tsx`

**Implementation checklist:**
- [x] Add mode switch: `Live execution` / `Read-only walkthrough`.
- [x] In read-only mode, show explanatory examples marked `read-only example`.
- [x] Disable paid/executing actions or route them to wallet-required explanation.
- [x] Add state copy: вЂњNo local receipt will be created in walkthrough mode.вЂќ
- [x] Persist mode in local storage.

**Verification:**
- [x] Grep Arc client files for fake/demo language that could imply real execution. Remaining matches are explicit failure copy: вЂњNo local receipt created.вЂќ
- [x] Browser: read-only mode never calls `/api/arc-trace/unlock` or `/api/arc-portfolio/start`.
- [x] Browser: live mode still blocks without wallet/payment.
- [x] `npm run build` passed.
- [x] `npm test` passed.
- [x] Browser: `/live` desktop/mobile no overflow, clipped elements, console errors, or page errors.

---

## Task 3: Settings Drawer

**Status:** Done 2026-05-18.

**Why this matters:** financial users need control over risk, approvals, and notifications.

**User value:** makes the product feel safe and personal rather than a black-box bot.

**Judge value:** shows product thinking beyond a one-screen hack.

**Files:**
- Modify: `src/pages/ArcMindLive.tsx`
- Optional create: `src/lib/arc-user-settings.ts`

**Implementation checklist:**
- [x] Add risk profile segmented control: conservative / balanced / aggressive.
- [x] Add max allocation input.
- [x] Add max drawdown slider.
- [x] Add manual approval toggle.
- [x] Add notification toggles: payment, leader risk, new trace, provider outage.
- [x] Persist settings locally.
- [x] Use settings in portfolio start payload and UI copy.

**Verification:**
- [x] Settings persist after reload.
- [x] Buttons/toggles have disabled/loading states.
- [x] Mobile drawer fits without horizontal overflow.
- [x] `npm run build` passed.
- [x] `npm test` passed.
- [x] Browser: desktop/mobile Settings drawer has no overflow, clipped elements, console errors, or page errors.

---

## Task 4: Notification Center

**Status:** Done 2026-05-18.

**Why this matters:** CopyGuard is strongest when it warns users before blindly following a decaying leader.

**User value:** users see what needs attention now.

**Judge value:** proves the product is designed for real monitoring, not static analytics.

**Files:**
- Modify: `src/pages/ArcMindLive.tsx`
- Modify if needed: `server/src/routes.ts`

**Implementation checklist:**
- [x] Add in-app notification bell.
- [x] Show latest alerts from `/api/arc-alerts`.
- [x] Add notification severity: info / warning / critical.
- [x] Add mark-as-read local state.
- [x] Add вЂњwhy this alert firedвЂќ short explanation.
- [x] Optional: browser notification permission toggle, but only if user opts in.

**Verification:**
- [x] `/api/arc-alerts` failure shows unavailable state.
- [x] Mark-as-read persists locally.
- [x] No notification overlaps on mobile.
- [x] `npm run build` passed.
- [x] `npm test` passed.
- [x] Browser: desktop/mobile alerts drawer has no overflow, clipped elements, console errors, or page errors.

---

## Task 5: Strategy Decay Score

**Status:** Done 2026-05-18.

**Why this matters:** this is the productвЂ™s defensible core, not just another copy-trading dashboard.

**User value:** gives a simple reason to stop/reduce/copy.

**Judge value:** boosts innovation and agentic sophistication.

**Files:**
- Modify: `server/src/arc-copyguard.ts` or existing scoring module.
- Modify: `server/src/arc-copyguard.test.ts`
- Modify: `src/pages/ArcMindLive.tsx`

**Implementation checklist:**
- [x] Define decay score inputs: drawdown, recent losses, volatility, confidence drop, signal divergence.
- [x] Return factor breakdown from backend.
- [x] Add tests for low/medium/high decay.
- [x] Display score on each leader row.
- [x] Add explanation: ArcMind would copy/reduce/stop because...

**Verification:**
- [x] Server tests cover scoring thresholds.
- [x] UI shows factor breakdown without cramped text.
- [x] No local/random score generation in UI.
- [x] `npm run build` passed.
- [x] `npm test` passed.
- [x] `cd server; npm test` passed.
- [x] Browser: `/live` desktop leader drawer shows 5 decay factors and action explanation.
- [x] Browser: `/live` mobile 390px has no horizontal overflow and drawer factor rows remain readable.

---

## Task 6: Agent Decision Replay

**Status:** Done 2026-05-18.

**Why this matters:** agency must be visible. A replay timeline makes the agentвЂ™s reasoning and action loop legible.

**User value:** users can see how a decision happened step-by-step.

**Judge value:** directly supports Agentic Sophistication.

**Files:**
- Modify: `server/src/arc-audit.ts`
- Modify: `server/src/routes.ts`
- Modify: `src/pages/ArcMindLive.tsx`

**Implementation checklist:**
- [x] Add `/api/arc-decision-replay/latest` or extend audit endpoint with replay events.
- [x] Events: signal observed, leader scored, risk checked, action chosen, receipt/payment/audit recorded.
- [x] UI timeline with timestamps, status icons, and explorer links when available.
- [x] Empty state if no decision exists.

**Verification:**
- [x] Endpoint returns stable schema.
- [x] Browser timeline renders on desktop/mobile.
- [x] No fake tx links for missing tx hashes.
- [x] `npm run build` passed.
- [x] `npm test` passed.
- [x] `cd server; npm run build` passed.
- [x] `cd server; npm test` passed.
- [x] Browser: `/live` desktop replay shows 5 steps and no horizontal overflow.
- [x] Browser: `/live` mobile 390px replay data renders with no horizontal overflow.

---

## Task 7: Traction + Feedback Panel

**Status:** Done 2026-05-18.

**Why this matters:** traction is 30% of judging and should be visible inside the product.

**User value:** visitors can leave useful feedback quickly.

**Judge value:** shows real validation, not hidden form claims.

**Files:**
- Modify: `src/pages/ArcMindLive.tsx`
- Modify: `server/src/arc-traction.ts`
- Modify: `server/src/routes.ts`

**Implementation checklist:**
- [x] Show testers, connected wallets, trace unlocks, portfolio starts, feedback count, verified USDC volume.
- [x] Add feedback prompts: clarity, trust, willingness to copy, confusion point.
- [x] Store feedback as traction event.
- [x] Add small latest validation list.

**Verification:**
- [x] Feedback saves through backend.
- [x] Stats update after submission.
- [x] No fake tester/volume counts.
- [x] `npm run build` passed.
- [x] `npm test` passed.
- [x] `cd server; npm run build` passed.
- [x] `cd server; npm test` passed.
- [x] Browser: `/live` desktop traction panel shows 4 prompts, counters, verified volume, and no horizontal overflow.
- [x] Browser: `/live` mobile 390px has no horizontal overflow for traction UI.

---

## Task 8: Reasoning Trace Marketplace Polish

**Status:** Done 2026-05-18.

**Why this matters:** paid traces are the most novel monetization/product primitive.

**User value:** users know exactly what they buy before paying.

**Judge value:** strong innovation + Circle usage story.

**Files:**
- Modify: `src/pages/ArcMindLive.tsx`
- Modify: `src/components/widgets/agora/ArcMindWidgets.tsx`
- Modify if needed: `server/src/routes.ts`

**Implementation checklist:**
- [x] Add locked preview: signals, decision type, timestamp, expected contents.
- [x] Add post-unlock sections: inputs, reasoning, risk sizing, outcome, receipt.
- [x] Add receipt/explorer link.
- [x] Add copy trace JSON only after unlock.
- [x] Add payment failure states.

**Verification:**
- [x] Without wallet: unlock blocked.
- [x] With invalid tx: backend rejects.
- [x] UI never exposes full trace before paid unlock.
- [x] `npm run build` passed.
- [x] `npm test` passed.
- [x] `cd server; npm run build` passed.
- [x] `cd server; npm test` passed.
- [x] Browser: `/live` desktop locked trace preview shows signals/action/timestamp and no copy JSON button before unlock.
- [x] Browser: `/live` mobile 390px trace preview has no horizontal overflow.

---

## Task 9: What-If Simulator

**Status:** Done 2026-05-18.

**Why this matters:** lets users understand risk before committing funds.

**User value:** safer onboarding for copy portfolios.

**Judge value:** shows practical financial UX and product depth.

**Files:**
- Modify: `src/pages/ArcMindLive.tsx`
- Optional modify: `server/src/arc-portfolio.ts`

**Implementation checklist:**
- [x] Inputs: amount, risk profile, max drawdown, leader.
- [x] Outputs: allocation, expected stop threshold, fees, ArcMind would do X.
- [x] Read-only until user starts paid portfolio.
- [x] Use backend portfolio builder if available.

**Verification:**
- [x] Simulator changes update deterministically from real backend logic.
- [x] No receipt/payment created by simulation.
- [x] `npm run build` passed.
- [x] `npm test` passed.
- [x] `cd server; npm run build` passed.
- [x] `cd server; npm test` passed.
- [x] Browser: `/live` desktop selected leader changes simulator summary without wallet/payment.
- [x] Browser: `/live` mobile 390px has no horizontal overflow for simulator UI.

---

## Task 10: Shareable Decision Card

**Status:** Done 2026-05-18.

**Why this matters:** helps traction and makes the demo memorable.

**User value:** users can share a recommendation or audit result.

**Judge value:** shows product-led growth thinking.

**Files:**
- Modify: `src/pages/ArcMindLive.tsx`
- Optional create: `src/components/agora/ShareDecisionCard.tsx`

**Implementation checklist:**
- [x] Add share card for latest decision: action, leader, risk, timestamp, trace hash/tx if available.
- [x] Add copy link/text button.
- [x] Downloaded image was intentionally skipped; share text/link covers this task without adding unsafe browser APIs.

**Verification:**
- [x] Share text includes no private data.
- [x] Works on mobile.
- [x] `npm run build` passed.
- [x] `npm test` passed.
- [x] `cd server; npm test` passed.
- [x] Browser: `/live` desktop share card renders, copy button writes share text, no payout leak.
- [x] Browser: `/live` mobile 390px has no horizontal overflow for share card.

---

## Task 11: Final Product QA Pass

**Status:** Done 2026-05-18.

**Why this matters:** the live demo must feel finished.

**Files:**
- Review all Agora-touched UI/backend files.

**Checklist:**
- [x] Full desktop pass: `/live` and every `/app/agora/*` tab.
- [x] Full mobile pass: `/live` and every `/app/agora/*` tab.
- [x] Keyboard/focus smoke pass for major native controls and walkthrough controls.
- [x] Grep for forbidden patterns in Arc client: `dev-bypass`, fake success, local receipt, fallback tx, demo execution.
- [x] Build/test server and client.
- [x] Update `docs/AGORA-LIVE-DEMO-RUNBOOK.md` with final judge path.

**Verification commands:**
- [x] `npm run build`
- [x] `npm test`
- [x] `cd server; npm run build`
- [x] `cd server; npm test`

**Verification notes:**
- Browser QA passed on desktop 1280px and mobile 390px for `/live` and Agora tabs: `overview`, `signal-hub`, `reasoning-traces`, `copy-trading`, `kill-switch`, `usyc-yield-swap`, `app-kit`, `arbitrage-agent`, `portfolio-manager`, `receipts`.
- Browser checks found no horizontal overflow, missing major content, clipped tab pages, or page-level console errors in the final pass.
- Keyboard/focus smoke confirmed native button focus can move through the walkthrough controls.
- Forbidden-pattern grep found only the documented generic backend x402 dev-bypass support and honest failure copy such as "No local receipt created"; Arc live client does not create fake receipts or fallback tx hashes.
- `docs/AGORA-LIVE-DEMO-RUNBOOK.md` now includes final judge click path, current endpoints, and a 3-minute demo script.

---

## Implementation Log

- 2026-05-18: Created active plan.
- 2026-05-18: Completed Task 1. Changed `src/pages/ArcMindLive.tsx`, `server/src/routes.ts`, and `src/workspaces/agora/README.md`. Next task: Task 2, Honest Guided Demo Mode.
- 2026-05-18: Completed Task 2. Changed `src/pages/ArcMindLive.tsx`. Existing Agora widgets already fail honestly without local receipts, so no widget changes were needed for this task. Next task: Task 3, Settings Drawer.
- 2026-05-18: Completed Task 3. Changed `src/pages/ArcMindLive.tsx`. Next task: Task 4, Notification Center.
- 2026-05-18: Completed Task 4. Changed `src/pages/ArcMindLive.tsx`. Next task: Task 5, Strategy Decay Score.
- 2026-05-18: Completed Task 5. Changed `server/src/arc-copyguard.ts`, `server/src/arc-copyguard.test.ts`, and `src/pages/ArcMindLive.tsx`. Next task: Task 6, Agent Decision Replay.
- 2026-05-18: Completed Task 6. Changed `server/src/arc-audit.ts`, `server/src/arc-audit.test.ts`, `server/src/routes.ts`, and `src/pages/ArcMindLive.tsx`. Next task: Task 7, Traction + Feedback Panel.
- 2026-05-18: Completed Task 7. Changed `server/src/arc-traction.ts`, `server/src/arc-traction.test.ts`, `server/src/routes.ts`, and `src/pages/ArcMindLive.tsx`. Next task: Task 8, Reasoning Trace Marketplace Polish.
- 2026-05-18: Completed Task 8. Changed `src/lib/arcTrace.ts`, `src/test/arcTrace.test.ts`, and `src/pages/ArcMindLive.tsx`. Backend invalid trace tx rejection verified through `/api/arc-trace/unlock`. Next task: Task 9, What-If Simulator.
- 2026-05-18: Completed Task 9. Changed `server/src/arc-portfolio.ts`, `server/src/arc-portfolio.test.ts`, `server/src/routes.ts`, and `src/pages/ArcMindLive.tsx`. Next task: Task 10, Shareable Decision Card.
- 2026-05-18: Completed Task 10. Changed `src/lib/arcShare.ts`, `src/test/arcShare.test.ts`, and `src/pages/ArcMindLive.tsx`. Next task: Task 11, Submission Checklist / Final Polish.
- 2026-05-18: Completed Task 11. Changed `docs/AGORA-LIVE-DEMO-RUNBOOK.md` and this plan. Final QA passed for `/live` and Agora tabs on desktop/mobile; active execution plan is complete.
- 2026-05-18: Started submission/production readiness phase.

---

## Task 12: Arc Submission Readiness Doctor

**Status:** Done 2026-05-18.

**Why this matters:** judges and operators need one place that says what is ready, what is only paper/live-read-only, and exactly what env or data is missing before production.

**Files:**
- Create: `server/src/arc-readiness.ts`
- Create: `server/src/arc-readiness.test.ts`
- Modify: `server/src/routes.ts`
- Modify: `src/pages/ArcMindLive.tsx`
- Modify: `docs/AGORA-LIVE-DEMO-RUNBOOK.md`

**Implementation checklist:**
- [x] Move readiness scoring into a tested helper.
- [x] Add weighted checks with clear severity and fix guidance.
- [x] Treat zero payout address as missing, not configured.
- [x] Include production/onchain checks: `NODE_ENV`, Arc RPC, Arc key, agent id, payout, x402 network, contract addresses.
- [x] Surface readiness in `/live` Judge Walkthrough without exposing secrets.
- [x] Update runbook with readiness interpretation.

**Verification:**
- [x] `cd server; npm test`
- [x] `cd server; npm run build`
- [x] `npm test`
- [x] `npm run build`
- [x] Browser: `/live` readiness panel desktop/mobile.

**Verification notes:**
- Browser QA on `http://127.0.0.1:5176/live` with backend `http://127.0.0.1:8789` showed readiness score in Wallet Center and Judge Walkthrough.
- Desktop 1280px and mobile 390px had no horizontal overflow; readiness drawer stayed visible and responsive.
- `/api/arc-readiness` returned `ready_paper`, score `87`, and missing actions for local non-production mode plus missing escrow contract.
- Frontend build still shows the known non-Arc Arbitrum chunk warning; left untouched by scope.

**Implementation log:**
- 2026-05-18: Completed Task 12. Changed `server/src/arc-readiness.ts`, `server/src/arc-readiness.test.ts`, `server/src/routes.ts`, `src/pages/ArcMindLive.tsx`, `docs/AGORA-LIVE-DEMO-RUNBOOK.md`, and this plan. Next task: Task 13, Public Submission Pack in docs.

---

## Task 13: Public Submission Pack in Docs

**Status:** Done 2026-05-18.

**Why this matters:** the submission form, GitHub repo, and video need one coherent story that maps the product to Agora criteria without inventing traction.

**Files:**
- Create: `docs/AGORA-SUBMISSION-PACK.md`
- Modify: `docs/AGORA-LIVE-DEMO-RUNBOOK.md`
- Modify: `docs/AGORA-ACTIVE-EXECUTION-PLAN.md`

**Implementation checklist:**
- [x] Add one-liner and short product description.
- [x] Explain the specific user problem and target user.
- [x] Map the product to RFB 06, RFB 04, and RFB 02.
- [x] Explain agentic loop and Arc/Circle usage.
- [x] Add innovation and judge click path.
- [x] Add 3-minute video outline.
- [x] Add traction answer template with placeholders instead of fake metrics.
- [x] Link the pack from the runbook.

**Verification:**
- [x] Submission pack avoids fake traction numbers.
- [x] Submission pack points to `/live`, `/api/arc-readiness`, and live traction stats.
- [x] Copy aligns with implemented product surfaces.

**Implementation log:**
- 2026-05-18: Completed Task 13. Changed `docs/AGORA-SUBMISSION-PACK.md`, `docs/AGORA-LIVE-DEMO-RUNBOOK.md`, and this plan. Next task: Task 14, Production env sample and deployment checklist.

---

## Task 14: Production Env Sample and Deployment Checklist

**Status:** Done 2026-05-18.

**Why this matters:** the project needs a clear route from local demo to public live demo without leaking secrets or accidentally running with dev settings.

**Files:**
- Create: `docs/AGORA-PRODUCTION-DEPLOYMENT.md`
- Create: `server/.env.agora.example`
- Create: `.env.agora.frontend.example`
- Modify: `.gitignore`
- Modify: `docs/AGORA-LIVE-DEMO-RUNBOOK.md`
- Modify: `docs/AGORA-ACTIVE-EXECUTION-PLAN.md`

**Implementation checklist:**
- [x] Add backend production env sample.
- [x] Add frontend public env sample.
- [x] Add secret-handling guidance for `ARC_PRIVATE_KEY`.
- [x] Add pre-deploy and post-deploy commands.
- [x] Add browser QA checklist for desktop/mobile.
- [x] Add rollback guidance that forbids fake local receipts.
- [x] Link deployment docs from the runbook.
- [x] Allowlist Agora markdown docs in `.gitignore` so public submission docs can be committed.

**Verification:**
- [x] Env samples contain placeholders, not real secrets.
- [x] Deployment checklist is scoped to Agora/Arc only.
- [x] Readiness targets match `/api/arc-readiness`.

**Implementation log:**
- 2026-05-18: Completed Task 14. Changed `docs/AGORA-PRODUCTION-DEPLOYMENT.md`, `server/.env.agora.example`, `.env.agora.frontend.example`, `.gitignore`, `docs/AGORA-LIVE-DEMO-RUNBOOK.md`, and this plan. Next task: Task 15, Final live-demo browser pass after deployment config.

---

## Task 15: Final Live-Demo Browser Pass After Deployment Config

**Status:** Waiting for production frontend/backend URLs. Pre-deploy automation done 2026-05-18.

**Why this matters:** final submission needs the same checks against the public URL judges will open, not only localhost.

**Files:**
- Create: `scripts/agora-live-smoke.mjs`
- Modify: `package.json`
- Modify: `docs/AGORA-PRODUCTION-DEPLOYMENT.md`
- Modify: `docs/AGORA-LIVE-DEMO-RUNBOOK.md`
- Modify: `docs/AGORA-ACTIVE-EXECUTION-PLAN.md`

**Implementation checklist:**
- [x] Add Agora-only smoke runner that does not test other workspaces.
- [x] Check `/api/arc-readiness`, `/api/arc-live`, `/api/arc-alerts`, `/api/arc-decision-replay/latest`, and Agora services.
- [x] Check `/live` Judge Walkthrough and readiness card on desktop/mobile.
- [x] Check every `/app/agora/*` tab on desktop/mobile.
- [x] Fail on console errors, horizontal overflow, empty tabs, missing replay/trace/simulator/traction blocks.
- [x] Document production command with `AGORA_FRONTEND_URL` and `AGORA_BACKEND_URL`.
- [ ] Run against final production frontend/backend URLs.

**Verification:**
- [x] `AGORA_FRONTEND_URL=http://127.0.0.1:5176 AGORA_BACKEND_URL=http://127.0.0.1:8789 npm run test:agora-live`
- [x] `npm test`
- [x] `cd server; npm test`
- [x] `npm run build`
- [x] `cd server; npm run build`

**Verification notes:**
- Local smoke passed with readiness `ready_paper`, score `87/100`, missing `node_env_production` and `arc_escrow_contract`.
- Smoke checked `/live` plus 10 Agora tabs on desktop and mobile.
- Frontend build still shows the known non-Arc Arbitrum chunk warning; left untouched by scope.

**Production command once deployed:**

```bash
AGORA_FRONTEND_URL=https://<frontend-domain> AGORA_BACKEND_URL=https://<backend-domain> npm run test:agora-live
```

**Implementation log:**
- 2026-05-18: Added production-ready Agora live smoke runner and documented it. Task 15 remains open until the public production URLs are available.

---

## Task 16: GitHub README Judge Entrypoint

**Status:** Done 2026-05-18.

**Why this matters:** judges read the public repo asynchronously. The root README must point them to the Agora product immediately instead of making them infer it from a multi-workspace TollGate repo.

**Files:**
- Modify: `README.md`
- Modify: `docs/AGORA-ACTIVE-EXECUTION-PLAN.md`

**Implementation checklist:**
- [x] Add ArcMind CopyGuard section at the top of README.
- [x] Include primary route `/live`, console route `/app/agora`, and readiness endpoint.
- [x] Map product to RFB 06, RFB 04, and RFB 02.
- [x] Add judge click path.
- [x] Link Agora submission/runbook/deployment/plan docs.
- [x] Add local and production smoke commands.
- [x] State honest demo boundary around read-only mode and verified Arc receipts.

**Verification:**
- [x] README keeps existing TollGate content but gives Agora reviewers an immediate entrypoint.
- [x] README links target allowlisted Agora docs.

**Implementation log:**
- 2026-05-18: Completed Task 16. Changed `README.md` and this plan. Next blocked step remains Task 15 production smoke once public URLs are available.

---

## Task 17: Copyable Live Judge Brief in `/live`

**Status:** Done 2026-05-18.

**Why this matters:** the user needs a fast, honest, copy-ready summary for the submission form, Discord updates, and video notes, using real live metrics instead of invented traction.

**Files:**
- Modify: `src/pages/ArcMindLive.tsx`
- Modify: `docs/AGORA-ACTIVE-EXECUTION-PLAN.md`

**Implementation checklist:**
- [x] Build judge brief from current readiness, stats, and latest decision.
- [x] Add Judge Walkthrough section with copy button.
- [x] Keep brief honest about read-only mode and verified Arc receipts.
- [x] Build/test frontend.
- [x] Browser smoke `/live` desktop/mobile.

**Verification:**
- [x] `npm test`
- [x] `npm run build`
- [x] `npm run test:agora-live`

**Verification notes:**
- Judge brief includes RFB fit, live metrics, readiness score, latest decision, and honest read-only/payment boundary.
- Browser check confirmed the brief renders in Judge Walkthrough with no desktop/mobile horizontal overflow and no console errors.
- `npm run test:agora-live` passed locally against `http://127.0.0.1:5176` and `http://127.0.0.1:8789`.

**Implementation log:**
- 2026-05-18: Completed Task 17. Changed `src/pages/ArcMindLive.tsx` and this plan.

---

## Task 18: Live Submission Summary Generator

**Status:** Done 2026-05-18.

**Why this matters:** final submission should use real backend metrics and readiness state, not manually copied or invented numbers.

**Files:**
- Create: `scripts/agora-submission-summary.mjs`
- Modify: `package.json`
- Modify: `docs/AGORA-SUBMISSION-PACK.md`
- Modify: `docs/AGORA-PRODUCTION-DEPLOYMENT.md`
- Modify: `docs/AGORA-ACTIVE-EXECUTION-PLAN.md`

**Implementation checklist:**
- [x] Add CLI that reads `AGORA_FRONTEND_URL` and `AGORA_BACKEND_URL`.
- [x] Fetch readiness, live state, traction stats, and Agora receipts.
- [x] Print a form-ready markdown summary with real metrics.
- [x] Support optional `AGORA_SUBMISSION_OUTPUT` for local file export.
- [x] Document local/production usage.
- [x] Run generator locally.
- [x] Run frontend tests/build affected by script/package changes.

**Verification:**
- [x] `AGORA_FRONTEND_URL=http://127.0.0.1:5176 AGORA_BACKEND_URL=http://127.0.0.1:8789 npm run agora:submission`
- [x] `npm test`
- [x] `npm run build`

**Verification notes:**
- Local summary generated a form-ready markdown block with links, readiness, missing actions, traction metrics, validation notes, and honest demo boundary.
- Local readiness in generated summary: `ready_paper`, `87/100`, missing `node_env_production` and `arc_escrow_contract`.
- Frontend build still shows the known non-Arc Arbitrum chunk warning; left untouched by scope.

**Implementation log:**
- 2026-05-18: Completed Task 18. Changed `scripts/agora-submission-summary.mjs`, `package.json`, `docs/AGORA-SUBMISSION-PACK.md`, `docs/AGORA-PRODUCTION-DEPLOYMENT.md`, and this plan.

---

## Task 19: Readiness Deployment Artifact Fallback

**Status:** Done 2026-05-18.

**Why this matters:** the backend readiness doctor should not incorrectly fail `arc_escrow_contract` when the deployed Arc contract address already exists in `contracts/deployments/arcTestnet.json`.

**Files:**
- Modify: `server/src/arc-readiness.ts`
- Modify: `server/src/arc-readiness.test.ts`
- Modify: `server/src/routes.ts`
- Modify: `docs/AGORA-PRODUCTION-DEPLOYMENT.md`
- Modify: `docs/AGORA-ACTIVE-EXECUTION-PLAN.md`

**Implementation checklist:**
- [x] Accept deployed registry/escrow addresses as readiness input.
- [x] Load `contracts/deployments/arcTestnet.json` in `/api/arc-readiness`.
- [x] Prefer env vars when present, fallback to deployment artifact when absent.
- [x] Add test for artifact-backed contracts.
- [x] Update deployment docs with current readiness snapshot.
- [x] Run server tests/build.
- [x] Run local readiness/smoke check.

**Verification:**
- [x] `cd server; npm test`
- [x] `cd server; npm run build`
- [x] Local `/api/arc-readiness` returned `92/100` with only `node_env_production` missing.
- [x] Local production-mode smoke reaches `ready_onchain`.

**Verification notes:**
- Development-mode local readiness now returns `ready_paper`, score `92/100`, with only `node_env_production` missing.
- Production-mode local readiness returns `ready_onchain`, score `100/100`, missing `none`.
- `AGORA_FRONTEND_URL=http://127.0.0.1:5179 AGORA_BACKEND_URL=http://127.0.0.1:8792 AGORA_MIN_READINESS_SCORE=100 npm run test:agora-live` passed.

**Implementation log:**
- 2026-05-18: Completed Task 19. Changed `server/src/arc-readiness.ts`, `server/src/arc-readiness.test.ts`, `server/src/routes.ts`, `docs/AGORA-PRODUCTION-DEPLOYMENT.md`, and this plan.

---

## Task 20: API Mega List Signal Source Radar

**Status:** Done 2026-05-18.

**Why this matters:** the user shared `cporter202/API-mega-list` as a resource. The product needs a curated, honest integration path for more live market/social/news inputs without pretending unconfigured APIs are active.

**Files:**
- Create: `server/src/arc-signal-sources.ts`
- Create: `server/src/arc-signal-sources.test.ts`
- Create: `docs/AGORA-API-SIGNAL-RADAR.md`
- Modify: `server/src/routes.ts`
- Modify: `src/pages/ArcMindLive.tsx`
- Modify: `scripts/agora-live-smoke.mjs`
- Modify: `server/.env.agora.example`
- Modify: `docs/AGORA-PRODUCTION-DEPLOYMENT.md`
- Modify: `.gitignore`
- Modify: `docs/AGORA-ACTIVE-EXECUTION-PLAN.md`

**Implementation checklist:**
- [x] Review API Mega List categories relevant to ArcMind: news, social media, AI, and agents.
- [x] Curate only useful sources for RFB 06, RFB 04, RFB 02, and future RFB 05.
- [x] Add backend `/api/arc-signal-sources` with configured, needs-key, watchlist, and blocked states.
- [x] Keep provider-backed sources honest when `APIFY_TOKEN` is absent.
- [x] Block paywall/subscription-bypass actors from the product plan.
- [x] Add `/live` Signal Source Radar UI for judges and users.
- [x] Add smoke coverage so the source catalog cannot silently disappear.
- [x] Document integration path, env, and source policy.

**Verification:**
- [x] `cd server; npm test`
- [x] `cd server; npm run build`
- [x] `npm test`
- [x] `npm run build`

**Verification notes:**
- Server tests cover missing-token, live-token, watchlist, and blocked-source states.
- `/api/arc-signal-sources` is metadata-only and does not create fake live provider calls.
- Frontend shows source status and recommended actions without claiming live data when keys are missing.

**Implementation log:**
- 2026-05-18: Completed Task 20. Changed the files listed above. Next blocked step remains Task 15 production smoke once public frontend/backend URLs are available.

---

## Agora Max Phase: Product Depth for All RFBs

**Goal:** keep ArcMind's primary identity as RFB 06 Social Trading Intelligence while adding product surfaces that prove it can interface with every Agora market track.

**RFB coverage strategy:**
- RFB 06: core CopyGuard leader selection, weighting, monitoring, lifecycle controls, and strategy decay.
- RFB 04: portfolio lifecycle, USDC/USYC risk-off routing, rebalancing simulation, and strategy gallery.
- RFB 02: source proof, prediction-market-style +EV explanation, confidence and sizing language.
- RFB 01: liquidation guardrails, leverage caution, stop thresholds, and funding/crowding risk signals.
- RFB 05: slippage, route/cost awareness, spread stress, and CCTP/App Kit surfaces.
- RFB 03: market vertical ideation through source radar and future question/market templates, without diluting the core demo.

---

## Task 21: Agora Max Product Control Layer

**Status:** Done 2026-05-19.

**Why this matters:** competitors win trust with basic controls: profile pages, lifecycle status, pause/stop/reduce controls, source proof, strategy galleries, and backtest/replay surfaces. Agora judges also need visible agency beyond a single decision card.

**Files:**
- Modify: `src/pages/ArcMindLive.tsx`
- Modify: `docs/AGORA-ACTIVE-EXECUTION-PLAN.md`

**Implementation checklist:**
- [x] Add portfolio lifecycle rail: setup, wallet, simulation, trace, portfolio, monitoring.
- [x] Add user-safe pause/reduce/stop controls that are local policy states, not fake on-chain actions.
- [x] Upgrade leader drawer with profile stats, RFB fit, risk badges, and source proof.
- [x] Add Source Proof Drawer/list using configured signal sources and decision replay events.
- [x] Add Backtest/Replay Lab using current decisions and CopyGuard actions.
- [x] Add Strategy Gallery with simulate/apply actions and clear read-only boundaries.
- [x] Keep all live execution/payment claims tied to verified backend responses.

**Verification:**
- [x] `npm test`
- [x] `npm run build`
- [ ] `AGORA_FRONTEND_URL=http://127.0.0.1:<port> AGORA_BACKEND_URL=http://127.0.0.1:<port> npm run test:agora-live`
- [x] Browser/Playwright desktop/mobile `/live` no horizontal overflow or console errors; Strategy Gallery and Source Proof Drawer interactions pass.

---

## Task 22: Ask ArcMind Evidence Chat

**Status:** Done 2026-05-19.

**Why this matters:** users naturally ask "why did you stop this trader?" A bounded evidence chat gives the product modern usability without hallucinating.

**Implementation checklist:**
- [x] Add a local, retrieval-style Ask ArcMind panel using only current live payload, source radar, replay, alerts, and settings.
- [x] Add canned prompts: why stop, what changed, which source mattered, how to lower risk, what would make COPY safe.
- [x] Show cited evidence rows under each answer.
- [x] Avoid model/API claims unless a real LLM provider is configured later.

**Verification:**
- [x] `npm test`
- [x] `npm run build`
- [x] Playwright desktop/mobile `/live` against local frontend/backend: Ask ArcMind prompts/custom question work, no horizontal overflow or console errors.

---

## Task 23: Prediction-Market Intelligence Lane

**Status:** Done 2026-05-19.

**Why this matters:** RFB 02/RFB 03 are not the core product, but ArcMind should show how prediction-style intelligence informs copy decisions.

**Implementation checklist:**
- [x] Add prediction intelligence card: confidence gap, Kelly-style sizing note, source credibility.
- [x] Add market vertical templates: crypto leader decay, macro risk-off, source credibility, private/internal.
- [x] Keep it advisory until real market execution/builder-code integration exists.

**Verification:**
- [x] `npm test`
- [x] `npm run build`
- [x] Playwright desktop/mobile `/live` against local frontend/backend: Prediction Intelligence and Market Vertical Drafts render, Ask ArcMind still works, no horizontal overflow or console errors.

---

## Task 24: Perps/Liquidation Protection Lane

**Status:** Done 2026-05-19.

**Why this matters:** RFB 01 asks for leverage decisions and liquidation protection. CopyGuard already has drawdown/funding/crowding signals; expose them clearly.

**Implementation checklist:**
- [x] Add liquidation guard card with leverage cap, stop threshold, collateral reduce/hold/allow decision, and funding risk.
- [x] Show no leverage execution unless a real venue integration exists.

**Verification:**
- [x] `npm test`
- [x] `npm run build`
- [x] Playwright desktop/mobile `/live` against local frontend/backend: Perps Liquidation Guard renders, no horizontal overflow or console errors.

---

## Task 25: Cross-Platform Arbitrage Profitability Lane

**Status:** Done 2026-05-19.

**Why this matters:** RFB 05 values detect-route-execute-survive slippage. ArcMind has App Kit/CCTP surfaces; the live demo needs clearer route math.

**Implementation checklist:**
- [x] Add arbitrage calculator card: route, required spread, slippage reserve, Arc fee drag, quote status, reject reason.
- [x] Use real available feeds where present; otherwise show unavailable/read-only states.

**Verification:**
- [x] `npm test`
- [x] `npm run build`
- [x] Playwright desktop/mobile `/live` against local frontend/backend: Arbitrage Route Math renders and refuses profit claims without executable quotes.

---

## Task 26: Final Production Smoke and Submission Summary Refresh

**Status:** Local verification and push done 2026-05-19; production smoke pending after Vercel deploys commit `d1d45df`.

**Why this matters:** every new product layer must survive public judge review.

**Implementation checklist:**
- [x] Run full local build/tests.
- [x] Run local smoke.
- [x] Push commit `d1d45df` to `origin/main`.
- [ ] Verify production smoke after Vercel deploy includes new Agora Max sections.
- [ ] Regenerate submission summary from production.

**Verification:**
- [x] `npm test`
- [x] `npm run build`
- [x] `AGORA_FRONTEND_URL=http://127.0.0.1:5178 AGORA_BACKEND_URL=http://127.0.0.1:8788 npm run test:agora-live`
- [x] Production deploy poll checked `https://toll-gatee.vercel.app/live`; new sections were not live yet, so production smoke remains pending.

---

## Task 27: Starter Flow, Business Model, and Delivery Rules

**Status:** Done 2026-05-19.

**Why this matters:** competitors feel finished because new users understand where to begin, how alerts reach them, and how the product makes money. This closes the remaining basic-product gaps without inventing fake integrations.

**Implementation checklist:**
- [x] Add first-run goal picker: avoid bad copy trades, find safer leader, inspect agent, prepare live copy.
- [x] Add first-run checklist: goal, risk, simulation, proof, paid receipt.
- [x] Add business model block: trace unlock, protected portfolio start, future builder fees, future profit-share.
- [x] Add alert delivery rules for in-app, browser, webhook, and Telegram with honest local/configured states.
- [x] Add webhook/Telegram fields in Settings without fake send success.
- [x] Add Escape-to-close and accessible labels for drawers.

**Verification:**
- [x] `npm test`
- [x] `npm run build`
- [x] Playwright desktop/mobile `/live`: starter flow, business model, delivery settings, and Escape-close work with no horizontal overflow or console errors.
- [x] `AGORA_FRONTEND_URL=http://127.0.0.1:5178 AGORA_BACKEND_URL=http://127.0.0.1:8788 npm run test:agora-live`
