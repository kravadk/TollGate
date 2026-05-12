# TollGate — Track Analysis & Extended Plan

> Generated: 2026-05-12. Cross-reference: PROJECT-PLAYBOOK.md (product source of truth), agent-payments-x402-universal-tz-uk.md (ТЗ), hackathon-ideas-playbook-uk.md (idea strategy).

---

## 1. Overall playbook completion

| Pillar | ТЗ requirement | Status |
|---|---|---|
| Workspace selector | 8 workspaces, per-workspace accent/tabs/data | Done |
| Provider Dashboard | Create paid service modal, service registry | UI done (frontend-only) |
| x402 Gateway page | 402 flow visualizer, SDK snippets, middleware | Done (GatewayPage, Integration/SDK tabs) |
| PaymentModal | Hold-to-pay, 402 → verify → approved → receipt | Done (simulated facilitator) |
| Agent SDK | Code snippet, policy config, fetch example | Shown in Gateway/SDK tab |
| Receipts ledger | Full receipt list, filters, inspector | Done (ReceiptsPage) |
| Usage / KPIs | Weekly bars, top services, spend | Done (WeekBars, WorkspaceMetrics, OverviewPage) |
| Real wallet connect | MetaMask/EIP-1193, live balance, block, gas | Done (wallet.tsx, WalletLiveStrip) |
| Real USDC transfer | sendErc20Transfer on Arbitrum Sepolia | Done (UsdcTransferWidget) |
| Per-workspace distinct UI blocks | All 8 workspaces have unique widgets | Done |
| Per-workspace OverviewPage tiles | Unique WS_CARDS per workspace | Done |
| Seeded receipts with kind/payload | kind-filtered widget history tables | Done |
| 0G StoragePinWidget | SHA-256 hash, SEEDED_PINS, per-pin receipts | Done |
| 0G InferenceJobRunner | Job form, seeded 0g.inference receipts | Done |
| Arbitrum InteractiveEscrow | localStorage, Release/Refund state flip | Done |
| Mantle BacktestRunner | Form → deterministic results → receipt | Done |
| Liquify TaxExport | Year selector → CSV download → receipt | Done |
| DeepSurge RouteRiskScorer | Hub selectors → risk score → receipt | Done |
| Eazo EazoSubManager | localStorage subs, budget bar | Done |
| Berkeley PaidToolsGrid | Service cards → PaymentModal | Done |
| WorkspaceSignature | Per-workspace unique data table | Done |
| AgentsPage 3-up grid | AgentCard + SpendWeekCard + NewAgentCard | Done |
| Real backend API | Server, real 402 responses, DB | NOT BUILT — all frontend/localStorage |
| Real x402 facilitator | Actual challenge/proof verification | Demo/mock only |
| Real 0G API calls | Actual 0G Storage/Compute SDK | Simulated |
| Real Mantle on-chain | mETH/USDY contract reads | Simulated |
| Real QIE integration | QIE wallet/pass/QIEDEX live data | Simulated |
| Smart contract (Escrow) | Deployed testnet contract, ABI | localStorage only |
| Replay protection | Server-side nonce/expiry checks | UI-only |
| .env.example | Env variable documentation | Missing |
| README (full submission) | Problem, solution, tracks, deploy, video | Missing |
| Demo video | 2–3 min structured demo | Missing |

**Summary:** The frontend demo layer is ~85% complete. The missing 15% is all backend/infra (real API, real x402, deployed contracts) and submission artifacts (README, video, .env). For a hackathon judging a demo app this is strong — the critical gap for every track is making the **402 flow feel real** and having proper submission materials.

---

## 2. Per-track analysis

---

### 2.1 0G APAC

**Hackathon tracks:** Agentic Economy & Autonomous Applications · Agentic Infrastructure · Web 4.0 · Privacy & Sovereign Infrastructure · Agentic Trading Arena

**Workspace:** `0G Agent Payment Router` (`/app/0g`)

**Current tabs:** Overview · Agents · Compute · Storage · Privacy · Receipts

**What judges want to see (from TZ 7.1):**
- AI agent is the buyer
- API/service is autonomous
- Payment unlocks compute/storage/data
- Receipt is verifiable

#### Implemented
| Feature | Where |
|---|---|
| InferenceJobRunner — agent pays for compute job, gets job-id receipt | Compute tab |
| StoragePinWidget — SHA-256 hash, pin blob, micro-payment receipt, SEEDED_PINS | Storage tab |
| ProofVerifier — sealed data, privacy receipts, access rules | Privacy tab |
| AgentsPage 3-up — agent card + spend chart + NewAgent | Agents tab |
| Seeded receipts: 2x 0g.inference, 1x 0g.pin with payload | data.ts |
| OverviewPage unique tiles (Run Inference Job, Pin Snapshot, Verify Proof, New Agent) | Overview tab |

#### Missing / Gap
| Gap | Impact | Effort |
|---|---|---|
| No real 0G Storage SDK call (using sha256Hex locally instead of actual 0G node) | Medium — judges know 0G | High |
| No "agent memory" narrative — 0G's strongest angle is persistent memory for agents | High — key track differentiator | Low (UI only) |
| Privacy tab lacks "Sealed inference log" (caller · endpoint · ts) | Medium | Low |
| No "Try Demo Agent" button that shows full 402 cycle end-to-end on this workspace | High | Medium |
| 0G has nothing for "Agentic Trading" track | Low | Low |

#### Priority actions for 0G track
1. **Add "Agent Memory" narrative card** on Overview: "Each inference job result is stored as a content-hashed blob in 0G Storage — persistent agent memory across sessions." (pure copy change)
2. **Add sealed inference log** inside ProofVerifier: table of `caller · endpoint · hash · sealed-at` derived from seeded receipts with kind `0g.privacy`.
3. **Add seed receipts for `0g.privacy` kind** in data.ts (1–2 rows) so Privacy tab is pre-populated.
4. **Demo flow button** — a "Run Demo Agent" action in OverviewPage tiles that opens PaymentModal for a pre-selected 0G inference service.

---

### 2.2 QIE

**Hackathon tracks:** DeFi & Payments · AI + Web3 · Infrastructure & Tools · Social & Community

**Workspace:** `QIE Agent Payment Gateway` (`/app/qie`)

**Current tabs:** Overview · Checkout · QIE Wallet · QIE Pass · QIEDEX Data · Merchant Dashboard

**What judges want (TZ 7.3):**
- Payment utility, not just logo
- Merchant/provider revenue
- AI agent or developer pays for service
- QIE wallet/payment flow

#### Implemented
| Feature | Where |
|---|---|
| CheckoutLinkBuilder — generate checkout link, QR, pay → receipt | Checkout tab |
| QIE Wallet tab (Agents page) — balance, spend policy, allowlist | QIE Wallet tab |
| QIE Pass tab (verify-style) — identity/access gating demo | QIE Pass tab |
| QIEDEX Data tab — service tab with pair stats | QIEDEX Data tab |
| Merchant Dashboard — Receipts page with revenue filter | Merchant Dashboard tab |
| Seeded receipts: qie.checkout, qie.pass kinds | data.ts |
| OverviewPage unique tiles | Overview |

#### Missing / Gap
| Gap | Impact | Effort |
|---|---|---|
| "Settlement split" UI — USDT vs QIE payout split bars — missing from Checkout tab | Medium | Low |
| "Issued passes" table in QIE Pass tab — currently just ProofVerifier generic view | Medium | Low |
| QIEDEX Data tab has no "Pool depth" or volume chart — looks generic | High | Medium |
| No real QIE chain wallet connect | Medium | Medium |
| Merchant Dashboard shows all receipts — no revenue/payout summary | Medium | Low |

#### Priority actions for QIE track
1. **Settlement split card** — two-bar chart (USDT % / QIE %) + "Next payout: 2026-05-14" inside Checkout tab below CheckoutLinkBuilder.
2. **Issued passes table** — in QIE Pass tab: `passId · holder · issued-at · status` table seeded from `qie.pass` receipts.
3. **QIEDEX pool depth card** — simple bar chart showing top 3 pairs by TVL (deterministic). Place in QIEDEX Data tab under the endpoints table.
4. **Revenue summary in Merchant Dashboard** — a KPI row at the top of the Receipts page when workspace=qie: "Revenue this week · Invoices paid · Avg size".

---

### 2.3 Arbitrum

**Hackathon tracks:** Best Agentic Project · Overall Prize · DeFi/Payments · Grants · Orbit/Robinhood Chain

**Workspace:** `Arbitrum Agent Services` (`/app/arbitrum`)

**Current tabs:** Overview · Agent Services · Stablecoin Payments · Escrow · Orbit Monitor · Risk Rules

**What judges want (TZ 7.4):**
- Real payment action on Arbitrum testnet
- Agentic workflow
- Spend limits and receipts
- Stablecoin utility

#### Implemented
| Feature | Where |
|---|---|
| UsdcTransferWidget — real ERC-20 transfer via window.ethereum, Arbitrum Sepolia USDC | Stablecoin Payments tab |
| InteractiveEscrow — localStorage, Release/Refund state flip, receipt on action | Escrow tab |
| OrbitMonitorPanel — block height, bridge health, settlement status | Orbit Monitor tab |
| Risk Rules tab (verify-style) — spend caps, allowlist toggles, ENFORCED list | Risk Rules tab |
| Agent Services tab — Marketplace of paid services, PaymentModal | Agent Services tab |
| Seeded receipts: arb.usdc.transfer, arb.escrow.release | data.ts |
| OverviewPage tiles including "Transfer USDC", "View Escrow" | Overview |

#### Missing / Gap
| Gap | Impact | Effort |
|---|---|---|
| Escrow emits receipt on Release/Refund but localStorage only — no chain tx | High for "Best Agentic" | High (needs contract) |
| UsdcTransfer requires connected wallet — fallback for unconnected state | Medium | Low |
| Orbit Monitor data is deterministic/static — no real RPC call | Medium | Medium |
| No "Sent payments" history below UsdcTransferWidget | Medium | Low |
| No real Arbitrum contract deployment | High for Grants track | High |

#### Priority actions for Arbitrum track (no contract needed)
1. **Sent payments list** — below UsdcTransferWidget, table of `arb.usdc.transfer` receipts. Already emitted, just needs a display table.
2. **Wallet-not-connected fallback** in UsdcTransferWidget — friendly state: "Connect wallet above to send real USDC on Arbitrum Sepolia".
3. **Escrow receipt payload** — verify that `arb.escrow.release` receipt includes `to`, `amount`, `escrowId` so it reads well in the Receipts ledger.
4. **Orbit Monitor live block ticker** — make block height +1 every 2 seconds in component state (cosmetic, shows "live" to judges).
5. For Grants track: document in README that the escrow contract is the next deploy step with ABI sketched out.

---

### 2.4 Liquify

**Hackathon tracks:** Advanced Wallet Analysis Tool · Next-Gen Trading Tool with x402 Integration · Seamless DeFi Tax Reporting Tool

**Workspace:** `Liquify x402 Data Terminal` (`/app/liquify`)

**Current tabs:** Overview · Trading Data · Wallet Analysis · Tax Reports · x402 Gateway · Payments

**What judges want (TZ 7.2):**
- Direct x402 integration
- Paid data access
- Useful trading/wallet/tax output
- API monetization angle

#### Implemented
| Feature | Where |
|---|---|
| TaxExport — year selector → aggregate workspace receipts → CSV download → receipt | Tax Reports tab |
| x402 Gateway page — full protocol flow, SDK snippets, Integration tab | x402 Gateway tab |
| Trading Data tab — service tab, all Liquify services, endpoint table | Trading Data tab |
| Wallet Analysis tab — service tab with wallet risk services | Wallet Analysis tab |
| Payments tab — Receipts page with Liquify receipts | Payments tab |
| Seeded receipts: liquify.tax.export kind | data.ts |
| OverviewPage tiles: "Get Wallet Risk", "Download Tax Report", "View Signal" | Overview |

#### Missing / Gap
| Gap | Impact | Effort |
|---|---|---|
| ~~Wallet Analysis has no "Wallet Risk Lookup" form~~ — ✅ DONE (`WalletRiskAnalyzer`) | — | — |
| Trading Data tab has no live ticker board with drifting prices | High for "Next-Gen Trading Tool" | Medium |
| Tax export only aggregates local receipts — not real DeFi events | Medium — clearly labeled demo | Low |
| No "Address cluster" or "counterparty graph" visualization | Low | High |

#### Priority actions for Liquify track
1. ✅ **Wallet Risk Analyzer widget** — DONE: `WalletRiskAnalyzer` (address → score/band + risk & clean signals + `liquify.wallet.risk` receipt + recent reports), on the Wallet Analysis tab.
2. **Live ticker strip** — in Trading Data tab: 4–5 rows (ETH/USDC · BTC/USDT · mETH/USDT · WBTC/DAI) with deterministicScore-derived prices that drift ±0.5% via setInterval in component state.
3. **CSV export improvement** — add column headers: `Date,Service,Amount,Currency,Network,Kind,ReceiptId` to TaxExport output.
4. **x402 Gateway demo flow** — make "Try Unpaid Request" / "Try Paid Request" buttons go through PaymentModal for a Liquify service. Shows the full 402 cycle ТЗ §6.3 describes.

---

### 2.5 Mantle

**Hackathon tracks:** AI Trading & Strategy · AI Alpha & Data · AI x RWA · Consumer & Viral DApps · AI DevTools · Agentic Wallets & Economy

**Workspace:** `Mantle Agent Wallet Economy` (`/app/mantle`)

**Current tabs:** Overview · Agent Wallets · Alpha Data · mETH / USDY · RWA Data · Strategy Sandbox

**What judges want (TZ 7.5):**
- Agent wallet
- Paid alpha/data
- Mantle-specific assets (mETH, USDY, RWA)
- Usage and receipt

#### Implemented
| Feature | Where |
|---|---|
| BacktestRunner — asset pair + window form → deterministic ret/DD/Sharpe → receipt | Strategy Sandbox tab |
| AlphaFeed — 5-item timestamped alpha drops with confidence bars | Alpha Data tab |
| Agent Wallets tab (Agents page) — spend policy, allowlist | Agent Wallets tab |
| mETH/USDY tab (service tab) — yield/risk services | mETH/USDY tab |
| RWA Data tab — service tab with RWA risk services | RWA Data tab |
| Seeded receipts: mantle.backtest kind | data.ts |
| OverviewPage tiles: "Run Backtest", "Get Alpha", "mETH Yield", "RWA Report" | Overview |

#### Missing / Gap
| Gap | Impact | Effort |
|---|---|---|
| ~~mETH/USDY tab has no "Yield board"~~ — ✅ DONE (`YieldBoard`) | — | — |
| AlphaFeed is static — no "refresh" action that emits a receipt | Medium | Low |
| RWA Data tab has no "RWA Registry" table (basket · grade · duration · APY) | Medium | Low |
| BacktestRunner: no "comparison" view of multiple backtest runs | Low | Medium |
| No real Mantle RPC call or mETH contract read | Medium | High |

#### Priority actions for Mantle track
1. ✅ **Yield board component** — DONE: `YieldBoard` (mETH vs USDY APY cards, "higher APY" highlight, agent rotation suggestion + "Approve rotation" → `mantle.yield.rotate` receipt + recent rotations), on the mETH/USDY tab.
2. **RWA Registry table** — in RWA Data tab above endpoints: 4-row table: `Basket · Grade · Duration · APY · Liquidity`. E.g. "US T-Bills ETF · AAA · 90d · 5.3% · High". Fully static.
3. **AlphaFeed paid refresh** — "Refresh (0.04 USDC)" button → PaymentModal for Alpha Data service → on approval, re-randomize 2 items in feed state.
4. **BacktestRunner comparison mode** — "Compare last 3 runs" toggle: mini-table of historical runs from receipt history. Reuses existing data.

---

### 2.6 Eazo

**Hackathon tracks:** Superparent · AI Companion · Life OS · Body Intelligence · Wildcard

**Workspace:** `Eazo AI Subscription OS` (`/app/eazo`)

**Current tabs:** Overview · AI Companion · Subscriptions · Personal Budget · Life OS · Approvals

**What judges want (TZ 7.6):**
- Consumer value
- AI companion behavior
- Budget and permission control
- Recurring/subscription use case

#### Implemented
| Feature | Where |
|---|---|
| EazoSubManager — localStorage subs (Netflix, Spotify, Claude Pro), Pause/Resume/Remove, budget bar | Subscriptions tab |
| Personal Budget tab (Agents page) — weekly spend from receipts, daily avg, cap bar | Personal Budget tab |
| AI Companion tab (Agents page) — companion agent card + spend policy | AI Companion tab |
| Approvals tab (verify-style) — what agent may buy, from whom, for how much | Approvals tab |
| Life OS tab (service tab) — reminders, automations | Life OS tab |
| Seeded receipts: eazo.sub.toggle kind | data.ts |
| OverviewPage tiles: "Review AI Spend", "Manage Subs", "Budget Cap", "New Subscription" | Overview |

#### Missing / Gap
| Gap | Impact | Effort |
|---|---|---|
| AI Companion tab is just an Agents page — no chat/suggestion UI showing companion behavior | High for "AI Companion" track | Medium |
| Life OS tab has no interactive "Daily ops" trigger list | Medium | Low |
| Budget tab shows receipts but no editable weekly cap slider | Medium | Low |
| Approvals tab is static list — no toggle editing | Medium | Low (useLocalStore) |

#### Priority actions for Eazo track
1. **Companion suggestion cards** — in AI Companion tab, below agent card: 3 action cards the companion "wants to do": "Cancel Spotify ($9.99/mo, 3 months unused)" / "Renew Claude Pro ($20/mo, expires tomorrow)" / "Alert: Unusual approval for OpenSea". Each has Approve/Dismiss → Approve emits receipt.
2. **Editable budget slider** — in Personal Budget tab: `<input type="range">` for weekly cap (default $50), `useLocalStore`-persisted. When sum of sub prices > cap, show warning bar in red.
3. **Approval toggles** — in Approvals tab: convert static ENFORCED list to checkbox toggles, `useLocalStore`-persisted.
4. **Life OS trigger buttons** — in Life OS tab: 3 automation rows with "Trigger" buttons → toast "Action queued · 0.02 USDC" → receipt.

---

### 2.7 Berkeley AI

**Hackathon tracks:** Ddoski's World · Ddoski's Toolbox · Ddoski's Lab · Ddoski's Playground

**Workspace:** `Berkeley Agent Payment Playground` (`/app/berkeley`)

**Current tabs:** Overview · Playground · Paid Tools · Agent Debugger · Transaction Explainer · Receipts

**What judges want (TZ 7.7):**
- AI-first developer tool
- Playful but technically clear sandbox
- Agent can pay, retry, and receive output

#### Implemented
| Feature | Where |
|---|---|
| PlaygroundInspector — step-by-step 402 flow visualizer | Playground tab |
| PaidToolsGrid — service cards, "Pay & Run" → PaymentModal | Paid Tools tab |
| AgentDebuggerPanel — replay agent run step by step | Agent Debugger tab |
| TxExplainerPanel — decode wallet action, risk label, before/after | Transaction Explainer tab |
| ReceiptsPage — proof trail ledger | Receipts tab |
| OverviewPage tiles | Overview |

#### Missing / Gap
| Gap | Impact | Effort |
|---|---|---|
| PaidToolsGrid has no "tool output" shown after payment — just marks as "paid" | High — judges expect to see the result | Low |
| Agent Debugger has no timestamped "run timeline" | Medium | Low |
| Transaction Explainer doesn't simulate "before/after balance" visually | Medium | Medium |

#### Priority actions for Berkeley track
1. **Tool output panel** — when a tool is "paid" in PaidToolsGrid, show deterministic JSON result below the card: `{ "result": "Risk score: 73. Wallet has 2 unlimited approvals.", "receiptId": "..." }`. Uses `deterministicScore`.
2. **Run timeline** in Agent Debugger — timestamps on each step: `10:42:01 · Request sent`, `10:42:01 · 402 received`, `10:42:02 · Payment initiated`, `10:42:03 · Verified · Receipt #rcpt_...`.
3. **Balance simulation** in TxExplainerPanel — below risk label: "Before: 1.23 ETH · After: 0.98 ETH (approve infinite USDC to 0x…)".

---

### 2.8 DeepSurge / EVE Frontier

**Hackathon tracks:** Utility · Technical Implementation · Creative · Weirdest Idea · Live Frontier Integration

**Workspace:** `Frontier Intel Market` (`/app/deepsurge`)

**Current tabs:** Overview · Intel API · Resource Data · Trade Safety · Alerts · Payments

**What judges want (TZ 7.8):**
- Useful game utility
- Technical integration
- Paid data/API angle
- Clear reason this belongs in EVE Frontier

#### Implemented
| Feature | Where |
|---|---|
| RouteRiskScorer — From/To hub selectors, gank-prob + spread + jumps + escort → receipt | Trade Safety tab |
| Intel API tab (service tab) — frontier intel services, endpoint table | Intel API tab |
| Resource Data tab (service tab) | Resource Data tab |
| Alerts tab (service tab with verify) | Alerts tab |
| Payments tab (Receipts page) | Payments tab |
| Seeded receipts: ds.route.risk kind | data.ts |
| OverviewPage tiles: "Check Route Safety", "Buy Resource Intel", "Set Alert", "View Receipts" | Overview |

#### Missing / Gap
| Gap | Impact | Effort |
|---|---|---|
| ~~Intel API tab has no "Frontier intel query box"~~ — ✅ DONE (`FrontierIntelQuery`) | — | — |
| Resource Data tab has no "Resource map" table | High for "Utility" | Low |
| Alerts tab has no "subscribe/unsubscribe" interactive rows | Medium | Low (useLocalStore) |
| No EVE Frontier vocabulary in copy (solar systems, gate camps, ISK analogy) | High for "Creative/Weird" tracks | Low (copy only) |

#### Priority actions for DeepSurge track
1. ✅ **Frontier intel query box** — DONE: `FrontierIntelQuery` (region + query type → deterministic JSON result per type + `ds.intel.query` receipt + recent queries), on the Intel API tab.
2. **Resource map table** — in Resource Data tab above endpoints: 5-row table: `System · Top Node · Contested · Hostiles 24h · Yield`. EVE-vocabulary cells.
3. **Alert subscriptions** — in Alerts tab: 3 alert types (Gate Camp · Resource Surge · Market Crash) with Subscribe/Unsubscribe toggles → `useLocalStore("ds.alerts", [...])`, emit `ds.alert.sub` receipt on toggle.
4. **EVE copy pass** — rename service descriptions, tab copy, and WorkspaceSignature to use EVE Frontier terminology.

---

## 2b. Layout restructure — functional surfaces dominate (✅ done)

User feedback: every service tab was mostly stats / charts / history with the functional widgets buried in the middle. `ServiceTabPage` was reworked:
- **Functional zone first** — bespoke widgets (InferenceJobRunner, StoragePinWidget, ProofVerifier, WalletRiskAnalyzer, YieldBoard, FrontierIntelQuery, BacktestRunner, UsdcTransferWidget, InteractiveEscrow, CheckoutLinkBuilder, OrbitMonitorPanel, EazoSubManager, PaidToolsGrid, RouteRiskScorer, AlphaFeed, …) render right under the hero+KPIs.
- **`QuickCallPanel`** — new generic functional block shown on any tab without a bespoke widget: endpoint picker → request/response shape → "Pay & call" → PaymentModal → receipt + recent-calls log. So **every** service tab now has a working call surface.
- **Endpoints table** is full-width (was a cramped 2-col with a stats sidebar) — still actionable, every row has a Try button.
- **Stats demoted** — `WorkspaceSignature` (data table), `Call volume` (WeekBars chart), `Recent activity` / `Guarantees`, and `Top callers` are collapsed into a `<details class="svc-insights">` section at the very bottom (closed by default).
- New CSS: `.svc-insights` summary styling (custom ▸ marker, no default disclosure triangle).

**Follow-up fixes (user feedback on `/app/0g/compute`):**
- **Endpoints are now a responsive card grid** (`.svc-ep-grid` / `.svc-ep-card`) instead of a wide table — the "Try · pay & call" button is always visible, no horizontal scroll on any viewport.
- **De-duplicated per-workspace blocks across tabs** — KPIs (Endpoints / Calls·7d / Avg price / Settled here) are now scoped to the tab's category, not the whole workspace; "Recent activity" and "Top callers" in the insights drawer are scoped to the tab's services; `WeekBars` already varied per tab (kept); the per-workspace `WorkspaceSignature` table (which was identical on every tab) was removed from `ServiceTabPage`. So no two tabs of the same workspace show the same stat block. (`WorkspaceSignature` / `WS_SIGNATURE` are now unused dead code — candidates for the Overview page or deletion.)

## 2c. Per-tab functional widgets — all 8 workspaces (✅ done)

User feedback: "~80% of each tab is static info you can't work with — I need concrete functions per my track/hackathon; the main thing is you can interact with what's in the tabs". Every service/verify/agents tab of all 8 workspaces now opens with a real form-and-action widget (all client-side simulated — `emitReceipt` / `useLocalStore` / `deterministicScore` / `sha256Hex`; a separate plan covers real 0G on-chain integration):

- **0G** — *Agents*: `AgentIdRegistry` (register Agent ID → self-custodial wallet + sealed-exec flag → `0g.agentid.register`) + `RevenueSplitConsole` (fan service earnings to N wallets → one `0g.revenue.split` receipt each). *Compute*: `InferenceJobRunner` enriched — sealed/TEE toggle (`sha256Hex` seal + `attestationId`), "treat prompt as proprietary strategy", batch mode (`0g.inference.batch` queue). *Storage*: `StoragePinWidget` enriched — "Agent memory snapshot" mode (agent picker → auto-gen JSON memory blob → `0g.memory.snapshot` w/ per-agent generation counter → per-row Restore). *Privacy*: `SealedPayloadVault` (seal payload for a recipient → digest stored → unseal only with a matching receipt id) replaces the static access-rules list.
- **Liquify** — *Trading Data*: `TradingSignalDesk` (pair/timeframe/risk → direction/confidence/entry/stop/target + R:R + `liquify.trading.signal` + last-7 confidences chart) — replaces the bare `QuickCallPanel`. *Tax Reports*: `TaxLotCalculator` (FIFO/LIFO/HIFO real lot-matching → ST/LT gain split + Form-8949-style CSV + `liquify.tax.lots`) above the existing `TaxExport`. *Wallet Analysis*: `ApprovalRevokePlanner` (per-address approvals table → select risky ones → queue revoke bundle + est gas + `liquify.approval.revoke`) after `WalletRiskAnalyzer`.
- **QIE** — *QIEDEX Data*: `SwapQuoteDesk` (tokenIn/tokenOut/amount/slippage → out/impact/minOut/route + `qie.dex.quote`, then "Accept & settle" → `qie.dex.swap`) — replaces the static 3-row pairs table. *Checkout*: `CheckoutLinkBuilder` enriched (links persist; "Simulate payment" → `qie.checkout.settle` + split fan-out) + new `SettlementSplitConfig` (merchant/platform/referrer % → `qie.settlement.config`, applied on settle as `qie.settlement.split` children). *QIE Wallet*: `AgentWalletConsole` (self-custodial QIE wallet — top up / send / per-tx cap → `qie.wallet.topup|send|cap`). *QIE Pass*: `QiePassIssuer` (mint tiered passes → `qie.pass.issue`; check access against tier-gated endpoints → `qie.pass.access`) replaces the static access-rules list.
- **Arbitrum** — *Agent Services*: `AgentServiceRegistry` (register an x402 service → gateway URL + provider wallet + `arb.service.register`; "Test call" → real PaymentModal) — replaces the bare `QuickCallPanel`. *Orbit Monitor*: `OrbitMonitorPanel` rewritten interactive — per-chain metric query (`arb.orbit.query`) + subscribe toggle (`arb.orbit.alert`) — replaces the static table. *Risk Rules*: `SpendRulesEditor` (editable caps/allowlist/denylist/network/autoPay → `arb.risk.publish`; "test a request" evaluates the live rules → PASS/BLOCK + reason) — replaces the static `ENFORCED` list. *Escrow*: `InteractiveEscrow` enriched — "Open escrow" form (`arb.escrow.open`); Release/Refund now emit `arb.escrow.release|refund` + a held/released/refunded summary strip.
- **Mantle** (Agentic Wallets · AI Alpha & Data · AI × RWA · AI Trading) — *Agent Wallets*: `MantleEconomyLoop` (earn x402 → store in agent wallet → "Deploy surplus → mETH" → mark-to-market yield; 4-node loop + net-profit strip + `mantle.deploy` receipts) — ported from XSight's economy-loop pattern. *Alpha Data*: `AlphaDesk` (replaces static `AlphaFeed` — "Pull fresh alpha ($0.04)" re-rolls deterministic drops + `mantle.alpha.pull` + subscribe toggle). *RWA Data*: `RwaRegistry` (basket registry + "Rotate in" per basket + "Get RWA risk report ($0.06)" → collateral ratio/default-prob/stress-test/recommendation + `mantle.rwa.report`) — replaces the bare `QuickCallPanel`. *mETH/USDY* / *Strategy Sandbox* already have `YieldBoard` / `BacktestRunner`.
- **Eazo** (AI Companion · Life OS · Superparent · Wildcard) — *AI Companion*: `EazoCompanionPanel` (3–5 suggestion cards the companion wants to do → Approve emits `eazo.companion.approve` receipt / Dismiss; persisted). *Personal Budget*: `EazoBudgetTracker` (editable weekly-cap range slider → `eazo.budget.cap`; spend-this-week bars; over-budget warning). *Approvals*: `EazoApprovalRules` (checkbox-editable rules — may buy tools/subs/household + max-per-purchase + require-approval-over → `eazo.approval.publish`; "test a purchase" → ALLOWED/BLOCKED + reason). *Life OS*: `EazoDailyOps` (recurring-task rows — renew transit pass / pay utility / reorder coffee / … → "Trigger" → toast + `eazo.lifeops.run` receipt + recent runs). *Subscriptions* already has `EazoSubManager`.
- **Berkeley** (Ddoski's Toolbox · Playground · Lab) — *Transaction Explainer*: `TxExplainerPanel` enriched — paste any calldata/address → "Decode (paid $0.03)" → verdict (safe/caution/danger) + facts/reasons + `berkeley.tx.decode` receipt + recent decodes (keeps the worked examples). *Agent Debugger*: `AgentDebuggerPanel` enriched — pick a scenario → "Re-run scenario ($0.02)" → fresh deterministic timeline (request→402→policy→pay→verify→receipt) + `berkeley.debug.run` receipt + recent re-runs. *Playground* / *Paid Tools* already have `PlaygroundInspector` / `PaidToolsGrid`.
- **DeepSurge** (Utility · Technical Implementation · Live Frontier Integration · Creative) — *Resource Data*: `ResourceMapQuery` (pick a Frontier system → "Pay & query map ($0.04)" → top node/yield-per-hr/contested/hostiles/recommended approach + `ds.resource.map` receipt) — replaces the bare `QuickCallPanel`. *Alerts*: `AlertSubscriptions` (subscribe/unsubscribe to alert types — gate camp / resource surge / market crash / hostile fleet → `ds.alert.sub`; per-type "Deliver" → metered `ds.alert.deliver` receipt; "delivered today" counter) — replaces the static list with dead Pause buttons. *Intel API* / *Trade Safety* already have `FrontierIntelQuery` / `RouteRiskScorer`.
- **Layout**: bespoke widgets render first; the endpoints card grid + reference foot + collapsed `<details>` insights follow. New `kind`s flow into the Receipts/Payments tab + the insights "Recent activity". `tsc -b` + `vite build` clean.

Remaining (optional, lower-priority): QIE Merchant `Payouts` widget; Arbitrum Stablecoin invoice-mode + Receipts batch-settle; `AgentPolicyEditor` slider; Mantle `YieldBoard` projected-yield calc + `BacktestRunner` compare-runs; Eazo family-member sub-budgets (Superparent); Berkeley build-a-tool wizard; DeepSurge trade-escrow + market-oracle query — and a separate plan for real 0G on-chain integration.

## 3. Cross-cutting gaps (affects all tracks)

| Gap | Priority | Effort |
|---|---|---|
| README.md — submission README with problem/solution/tracks/deploy/video | Critical | Low |
| Demo video — 2–3 min structured per TZ 17 | Critical | Medium |
| .env.example — document env variables | High | Low |
| "Try Demo Agent" button on every OverviewPage | High | Low |
| Mock facilitator label — "Demo facilitator mode simulates the 402 handshake" per TZ 10 | High | Low |
| Challenge expiry UI — show countdown in PaymentModal | Medium | Low |
| Mobile responsiveness — sidebar breaks on small screens | Medium | Medium |

---

## 4. Build priority order

### Tier 1 — Must-do before any submission

1. ✅ README.md — follows TZ §16 structure (problem / solution / how it works / workspaces+track mapping / protocol integrations / demo / how to run / env vars / security notes / future plans / repo map / acknowledgements). _(TODO: fill the Vercel/Render/video links once deployed.)_
2. ✅ .env.example — root (`VITE_API_BASE`) + `server/.env.example`; `.gitignore` updated for `.env*`
3. ✅ "Try the demo agent" tile — `demoAgentCard` prepended to every workspace's `WS_CARDS` in `OverviewPage`; clicking → `onOpenPayment(def)` (PaymentModal for the workspace's primary service) + a "x402 Gateway →" link. Per-workspace first card de-emphasised so there's one clear primary CTA.
4. ✅ Mock facilitator label — muted footer line in `PaymentModal` ("Demo facilitator mode — the 402 handshake is simulated here … see the x402 Gateway tab"); plus the existing gw-note on the GatewayPage and the dev-bypass note in `LiveGatewayPanel`.
5. ✅ **Wallet Risk Analyzer widget** for Liquify — `WalletRiskAnalyzer` in `WorkspaceDashboard.tsx`: address input → `deterministicScore` → score/band + risk & clean signal lists + receipt `kind: "liquify.wallet.risk"` + recent-reports table. Wired on the Wallet Analysis tab (`workspace.id === "liquify" && t.includes("wallet"|"analysis")`).
6. ✅ **Frontier Intel Query Box** for DeepSurge — `FrontierIntelQuery` in `WorkspaceDashboard.tsx`: region (Jita/Amarr/Rens/Dodixie/Hek) + query type (Resource Yield / Hostile Activity / Market Anomaly) → deterministic JSON result + receipt `kind: "ds.intel.query"` + recent-queries table. Wired on the Intel API tab.
7. ✅ **`server/` skeleton ported from XSight** — real Express x402 gateway + MCP + activity tracker (see §7). `cd server && npm i && npm run dev` → `curl -i :8787/api/gateway/<id>` returns real 402. Frontend wired via `src/lib/api.ts` + `LiveGatewayPanel` on the x402 Gateway tab. *(remaining: deploy server + set `VITE_API_BASE`)*

### Tier 2 — Strong for 0G/QIE/Mantle/Eazo

7. ✅ Yield board for Mantle mETH/USDY tab — `YieldBoard` (two APY cards + rotation suggestion + "Approve rotation" → `mantle.yield.rotate` receipt + recent rotations table)
8. AlphaFeed paid refresh for Mantle
9. Settlement split card for QIE Checkout tab
10. Issued passes table for QIE Pass tab
11. Companion suggestion cards for Eazo AI Companion tab
12. Sealed inference log for 0G Privacy tab + 0g.privacy seed receipts

### Tier 3 — Polish for Berkeley/Arbitrum

13. Tool output panel for Berkeley PaidToolsGrid
14. Sent payments list for Arbitrum UsdcTransferWidget
15. Orbit Monitor block ticker (cosmetic live feel)
16. Run timeline for Berkeley Agent Debugger
17. RWA Registry table for Mantle RWA Data tab
18. Alert subscriptions for DeepSurge

### Tier 4 — Nice to have

19. Live ticker strip for Liquify Trading Data
20. Balance simulation in Berkeley TxExplainerPanel
21. BacktestRunner comparison mode for Mantle
22. Approval toggles for Eazo
23. Life OS trigger buttons for Eazo

---

## 5. Judge demo script (2 min)

```
1. Open /liquify
2. Show "x402 Data Terminal" — explain: paid APIs for AI agents
3. OverviewPage "Try Demo Agent" → PaymentModal for Wallet Risk API
4. Walk through: 402 Challenge → Hold to Pay → Verifying → Approved
5. Show receipt in Payments tab
6. Switch to /0g → "Same core — now agent pays for compute/storage"
7. Compute tab → InferenceJobRunner → show job receipt
8. Storage tab → StoragePinWidget → pin a blob → receipt
9. Switch to /arbitrum → "Real USDC transfer on Arbitrum Sepolia (if wallet connected)"
10. UsdcTransferWidget → demonstrate (or show fallback state)
11. Close: "Same gateway — 8 workspaces, 8 hackathon tracks, one payment protocol"
```

---

## 6. Track → workspace URL mapping

| Hackathon | Submit URL | Primary track claim |
|---|---|---|
| 0G APAC | /app/0g | Agentic Economy & Autonomous Applications |
| Liquify | /app/liquify | Next-Gen Trading Tool with x402 Integration |
| QIE | /app/qie | DeFi & Payments |
| Arbitrum | /app/arbitrum | Best Agentic Project |
| Mantle | /app/mantle | Agentic Wallets & Economy + AI Trading & Strategy |
| Eazo | /app/eazo | AI Companion + Life OS |
| Berkeley AI | /app/berkeley | Ddoski's Toolbox + Ddoski's Playground |
| DeepSurge | /app/deepsurge | Utility + Technical Implementation + Live Frontier Integration |

---

## 7. Sibling project: XSight — backend port targets

`github.com/kravadk/XSight-` (deployed: x-sight.vercel.app + xsight-server.onrender.com) is the author's other submission — **AI Trading Copilot for X Layer**, OKX Build X Hackathon. It is the **more mature** project: it has a *real* backend (Express + TS), a *real* x402 middleware that returns `HTTP 402` and verifies `X-PAYMENT` headers, real on-chain swaps via OKX DEX, an MCP server, and a server-side activity tracker. It implements exactly the ТЗ §10/§13 layer that TollGate currently fakes (`mock facilitator`, localStorage-only).

**Reusability:** XSight backend is OKX/X-Layer specific in its *adapters* (OnchainOS, Uniswap, ethers) but its *core* (x402 middleware, MCP JSON-RPC handler, activity tracker, the `/api/v1/x402-spec` discovery endpoint, the route structure) is generic and worth porting. Author has cleared copying.

### Ported into this repo: `server/` (Express + TS skeleton)

| XSight source | Ported as | Adaptation |
|---|---|---|
| `server/src/middleware/x402.ts` | `server/src/middleware/x402.ts` | Generalized: workspace/service-aware, issues challenges with `requestHash` + expiry, replay-protected via `challengeStore`, `dev-bypass` only when `NODE_ENV != production` |
| `server/src/routes/mcp.ts` | `server/src/routes/mcp.ts` | MCP JSON-RPC 2.0 handler; tools expose TollGate resources: `list_services`, `get_service`, `pay_for_service`, `list_receipts`, `get_agent_policy` |
| `server/src/services/activityTracker.ts` | `server/src/services/activityTracker.ts` | Verbatim core, generalized `ActivityKind` (`gateway.402`, `gateway.paid`, `gateway.rejected`, `mcp.tools.call`, …) |
| `server/src/routes/analysis.ts` (`/x402-spec`) | `server/src/routes/spec.ts` | Discovery descriptor built from our `services` seed, per-workspace |
| `server/src/routes/status.ts` (`/activity`, `/x402-log`) | `server/src/routes/status.ts` | Same shape |
| `server/src/index.ts` | `server/src/index.ts` | Mounts our routes: `/api/services`, `/api/agents`, `/api/gateway/:serviceId`, `/api/receipts`, `/api/v1/x402-spec`, `/api/status/*`, `/mcp` |
| `server/src/config/env.ts`, `package.json`, `.env.example` | same | Anthropic/OKX vars dropped; kept `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `X402_PAYOUT_ADDRESS`, `X402_NETWORK`, `X402_ASSET` |

### What this unlocks (vs. current frontend-only)

- A **real `402 Payment Required`** for at least the Liquify + 0G workspaces (ТЗ §21 Phase 1) — `curl -i http://localhost:8787/api/gateway/svc_liq_wallet_risk` returns the challenge JSON; pass `X-PAYMENT: dev-bypass` (dev) or a signed proof (prod) to unlock.
- A **discovery endpoint** `GET /api/v1/x402-spec?workspace=liquify` judges/integrators hit first.
- An **MCP server** so any Claude agent can call TollGate services as tools — strong for 0G "Agentic Infrastructure" + Berkeley "Toolbox" tracks.
- A **server-side activity tracker** (`GET /api/status/activity`) — `byKind` map proves the gateway is live, not a mock.
- The frontend can keep its PaymentModal simulation as the *demo path* but now also point "Try real 402" at the local server.

### Done

- ✅ `server/` skeleton ported & tested (`npm i` + `tsc --noEmit` clean; `curl` smoke tests: real 402 + challenge, `dev-bypass` unlock, receipts, `/api/status/activity`, `/api/v1/x402-spec`, MCP `tools/list` + `pay_for_service`, replay → `402 challenge_invalid`).
- ✅ Frontend client `src/lib/api.ts` — `ping`, `listServices`, `getSpec`, `gatewayUnpaid`, `gatewayPay` (base64 `X-PAYMENT`), `listReceipts`, `getActivity`. Base URL from `VITE_API_BASE` (defaults to `http://localhost:8787` in dev).
- ✅ `LiveGatewayPanel` in `WorkspaceDashboard.tsx` `GatewayPage` — picks a workspace service, "Send unpaid request" shows the real 402 + challenge JSON, "Pay & retry (dev-bypass)" shows the 200 unlocked body + `receiptId` and mirrors the server receipt into the in-app ledger via `emitReceipt({ kind: "x402.live", … })`; graceful "server offline → using simulation" state with the start command. `tsc -b` + `vite build` clean.
- ✅ `.env.example` (root: `VITE_API_BASE`) + `server/.env.example`; `.gitignore` updated for `.env*`.

### Remaining work (not done yet)

- Make the receipts ledger *read* `GET /api/receipts` as a source when the server is reachable (currently only live-gateway receipts are mirrored in via `emitReceipt`; seeded/localStorage receipts still drive the rest).
- Wire the `x402 Gateway` SDK tab's example `tollgate-sdk` snippet to a real published package (or vendor a tiny `fetchPaid` helper that wraps `src/lib/api.ts`).
- Deploy `server/` (Render/Fly, like XSight) + set `VITE_API_BASE` on the Vercel frontend; set `CORS_ORIGIN` on the server to the Vercel origin.
- Optionally port XSight's `economyLoop` / `autoDeploy` pattern → Mantle "Agentic Wallets & Economy" earn→pay→earn visualization (the animated 4-node loop).
- Optionally port XSight's structured-card chat (`CardPayload` union, `MessageBubble`, `RiskCard`, `SwapPreviewCard`) into our `AgentAssistantPanel` — turns it from a static panel into a real AI companion (helps Eazo "AI Companion" track).
