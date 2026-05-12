# TollGate — Project Playbook

> **One line:** Stripe for AI agents. A payment gateway + SDK that lets autonomous AI agents pay for APIs, data, inference, storage and tools over **x402 / stablecoins** — pay-per-use, subscriptions, receipts, limits.

This document describes the product idea, the MVP shape, the hackathon reskin strategy, and the **exact tab layout for every workspace** as implemented in this prototype. It is the source of truth for "what should be on each screen".

---

## 1. The idea

An AI agent wants to use a paid service: a data API, an inference job, a storage write, a trading signal, a wallet-analysis lookup. The service replies **402 Payment Required**. The agent automatically pays (x402 handshake or a stablecoin transfer), retries, and gets the protected response **plus a receipt**.

It is **not** primarily an end-user app — it is **infrastructure for paid APIs that AI agents consume**, with a small demo app on top so judges can see the loop.

### Sibling ideas this codebase can flex into
| Idea | What it is | Best-fit tracks |
|---|---|---|
| **AI Wallet Safety Copilot** | Before a wallet action is signed, explain what it does, simulate the result, flag risky approvals / scam contracts, return **safe / caution / danger**. | Mantle (Agentic Wallets, AI DevTools), 0G (Privacy, Web 4.0), Arbitrum (Best Agentic, DeFi), QIE (AI+Web3, Tools), Eazo (AI Companion), Berkeley (Toolbox), Liquify (Advanced Wallet Analysis) |
| **Agent Payments / x402 API Economy** ← *this build* | Infrastructure where agents pay for API/data/inference/storage/tools via x402/stablecoins: pay-per-use, subscriptions, receipts, limits. | 0G (Agentic Economy), Liquify (Next-Gen Trading + x402), QIE (DeFi & Payments), Arbitrum (Best Agentic, Payments), Mantle (Agentic Wallets & Economy), Eazo (Life OS, AI Companion) |
| **Onchain Intelligence Engine** | Indexer + AI analytics for wallets/contracts: PnL, tax, labels, smart money, approvals, anomalies, risk score, dashboards. | Liquify (Wallet Analysis, DeFi Tax), Mantle (AI Alpha & Data), QIE (Tools), Arbitrum (Infra, Grants), 0G (Agentic Infra), Berkeley (Toolbox, Lab) |
| **EVE Frontier Intel Terminal** | Terminal for EVE Frontier: resources, market, risk, routes, player activity, alerts, trade safety. | DeepSurge (Utility, Technical, Live Frontier, Creative, Weirdest Idea) |

---

## 2. MVP shape (the four pillars)

1. **Developer Dashboard** — a builder creates a paid API: name · price per request · receiving wallet · limits · test endpoint. *(In the app: the "New paid service" modal + the Marketplace / "My Services" view.)*
2. **Payment Gateway / API Middleware** — the layer in front of the API: checks for payment, returns `402 Payment Required` if missing, lets the request through once paid. *(In the app: the **x402 Gateway** tab — protocol flow, challenge/proof examples, security guarantees, mock facilitator note.)*
3. **Agent SDK** — a tiny SDK for the agent: see `402` → pay → retry → get data. *(In the app: the **SDK** sub-tab of the Gateway page — `TollGateClient` snippet, Express/Hono middleware, policy config, receipt format.)*
4. **Usage / Receipts Dashboard** — for the provider: how many requests, how much earned, which agents paid, receipts / tx hashes. *(In the app: the **Receipts / Payments / Usage** tabs.)*

### Reference demo flow
> Agent is asked: *"Find me the safest yield opportunity on Arbitrum."* The yield-risk API is paid.
> 1. Agent calls `yield-risk-api`.
> 2. API returns `402 Payment Required` (with a payment challenge).
> 3. Agent pays `0.05 USDC`.
> 4. API returns the risk report.
> 5. Dashboard shows the payment, usage and receipt.

The **PaymentModal** in the app is exactly this loop: `required → holding → verifying → approved → unlocked`, with a receipt appended on success.

### Reskin axis (same core, different "what gets paid for")
- **0G** — agent pays for compute / storage / inference.
- **Liquify** — agent pays for trading data / wallet analytics / tax classification.
- **QIE** — payment links / API payments on the QIE rail (+ QIE Pass gating).
- **Arbitrum** — USDC stablecoin payments for AI services (+ escrowed delivery).
- **Mantle** — agent wallets with spend policy buy paid alpha / mETH·USDY / RWA data.
- **Eazo** — a personal AI companion manages subscriptions / pay-per-use tools inside a budget.
- **Berkeley** — a sandbox to inspect every step of the 402 / payment flow.
- **DeepSurge** — players & agents pay for live EVE Frontier intel (resources, market, routes, alerts, trade safety).

---

## 3. The universal sidebar (core, shared by all)

| Tab | Purpose |
|---|---|
| **Overview** | What the agent does, how much it spent, which APIs it uses. KPIs, weekly volume, recent receipts. |
| **Marketplace** | List of paid APIs/tools: data, inference, storage, wallet analytics. Search + category filter. "New paid service" lives here. |
| **Agent Wallet** | Balance, spend limits, permissions, allowlist, emergency pause. **Connect a real wallet** to mirror against an on-chain address (live balance, block, gas). |
| **Payments** | History of payments, receipts, tx hashes. Filters by status. |
| **Usage** | Requests, cost, revenue, failed payments. |
| **Receipts** | Verifiable proof of payment / use — the ledger + receipt inspector. |
| **Settings** | API keys, chains, limits, webhooks. *(In the app: the gear button → Tweaks panel.)* |

> Implementation note: in this prototype each workspace ships **6 curated tabs** (a tight subset of the above + 2–4 hackathon-specific ones). The sidebar is rendered dynamically from `workspace.tabs` in `src/data.ts`; each tab name is routed to a page kind by `pageKind()` in `src/components/WorkspaceDashboard.tsx`.

---

## 4. Per-workspace tabs (as implemented) and what each tab should contain

Legend for "renders as": **Overview** = KPI dashboard · **ServiceTab** = hero + 4 KPIs + endpoints table + 7-day volume chart + recent-activity (or Guarantees for the `verify` variant) · **Agents** = agent card + budget bar + enforcement rules + live wallet strip · **Gateway** = 402 protocol flow + SDK · **Receipts** = ledger + filters + receipt inspector · **Marketplace** = service grid + create modal.

### Liquify — *x402 Data Terminal* (accent: amber)
| Tab | Renders as | Content |
|---|---|---|
| Overview | Overview | Agent spend, weekly volume, top data APIs used, recent receipts. |
| Trading Data | ServiceTab | Paid market data / signals / orderflow feeds; per-call price, p95, 7-day calls; Try → PaymentModal. |
| Wallet Analysis | ServiceTab | PnL, approvals exposure, risk score, address labels — billed per lookup. |
| Tax Reports | ServiceTab | Cost-basis, realised P&L, jurisdiction tags — generated on demand, paid per report. |
| x402 Gateway | Gateway | Test the 402 flow for paid endpoints; challenge/proof; middleware + SDK. |
| Payments | Receipts | Payment history, receipts, tx hashes. |
| *(+ Signals)* | ServiceTab | Purchased trading/risk insights — refresh any per call. |

### 0G APAC — *Agent Payment Router* (accent: blue)
| Tab | Renders as | Content |
|---|---|---|
| Overview | Overview | Inference/storage spend, jobs run, recent receipts. |
| Agents | Agents | List of AI agents + their permissions, budgets, pause. |
| Compute | ServiceTab | Paid inference / 0G Compute jobs — pay per token / per job; receipts link to verifiable job metadata. |
| Storage | ServiceTab | Paid storage / memory writes for agents — each write returns a content hash + metadata link. |
| Privacy | ServiceTab (verify) | Private jobs, sealed data, access rules; Guarantees panel (replay-safe, single-use, server-side enforced). |
| Receipts | Receipts | Verifiable proof of payment / use. |

### QIE — *Agent Payment Gateway* (accent: green)
| Tab | Renders as | Content |
|---|---|---|
| Overview | Overview | Merchant revenue, agent payments, recent receipts. |
| Checkout | ServiceTab | Hosted payment links for merchants / API providers — generate a link, get paid in QIE-rail stablecoins. |
| QIE Wallet | Agents | Balance, payments, permissions. |
| QIE Pass | ServiceTab (verify) | Identity / access / user verification — gate paid endpoints behind verified QIE Pass; each check is a receipt. |
| QIEDEX Data | ServiceTab | Paid swap quotes, liquidity depth, pair stats from QIEDEX — priced per query. |
| Merchant Dashboard | Receipts | Revenue, invoices, receipts. |

### Arbitrum — *Agent Services* (accent: blue)
| Tab | Renders as | Content |
|---|---|---|
| Overview | Overview | USDC spend across AI services, recent receipts. |
| Agent Services | ServiceTab / Marketplace | Paid AI / API services on Arbitrum, settled in USDC. |
| Stablecoin Payments | Receipts | USDC payments, invoices, subscriptions. |
| Escrow | ServiceTab | Escrow for agents / API / freelance services — hold payment until delivery confirms, then release or refund. |
| Orbit Monitor | ServiceTab | Orbit-chain data feeding the gateway — block height, settlement status, bridge health. |
| Risk Rules | ServiceTab (verify) | Spend limits, allowlists, contract-safety checks the gateway enforces before any payment clears. |

### Mantle — *Agent Wallet Economy* (accent: violet)
| Tab | Renders as | Content |
|---|---|---|
| Overview | Overview | Agent-wallet spend, alpha/RWA data consumed, recent receipts. |
| Agent Wallets | Agents | Wallets for autonomous agents + spend policy. |
| Alpha Data | ServiceTab | Paid trading / RWA / yield data — pulled per call inside wallet policy. |
| mETH / USDY | ServiceTab | Mantle-native assets — yield/risk reads, billed per query. |
| RWA Data | ServiceTab | Paid RWA insights / risk reports — generated on demand. |
| Strategy Sandbox | ServiceTab | Agent pays per backtest / simulation run; each run returns metrics + a receipt. |

### Eazo — *AI Subscription OS* (accent: orange)
| Tab | Renders as | Content |
|---|---|---|
| Overview | Overview | What the AI spent today/this week, active tools. |
| AI Companion | Agents | Chat that manages paid tools/subscriptions; budget + approvals. |
| Subscriptions | Receipts | Recurring payments for AI/API tools — pause/cancel. |
| Personal Budget | Agents | How much the AI spent per day/week, by tool, with the cap it can't cross. |
| Life OS | ServiceTab | Daily tools, reminders, finance automations the companion can trigger — each paid action logged. |
| Approvals | Agents | Exactly what the agent may buy, from whom, for how much — enforced server-side. |

### Berkeley — *Agent Payment Playground* (accent: cyan)
| Tab | Renders as | Content |
|---|---|---|
| Overview | Overview | What the agent did, what it paid for, step counts. |
| Playground | Gateway | Fire a paid tool call and watch every step of the 402 → pay → unlock flow. |
| Paid Tools | Marketplace | The catalogue of tools an agent can call here — each returns 402 until the micro-payment settles. |
| Agent Debugger | Gateway | Replay an agent's last run step by step: request → 402 challenge → proof → settled receipt. |
| Transaction Explainer | Gateway | Decode a pending wallet action: what it does, what it touches, safe/caution/danger. |
| Receipts | Receipts | The proof trail. |

### DeepSurge — *Frontier Intel Market* (accent: lime)
| Tab | Renders as | Content |
|---|---|---|
| Overview | Overview | What players/agents bought, intel spend, recent receipts. |
| Intel API | ServiceTab | Live EVE Frontier intel sold per call — resources, routes, market, trade-risk feeds. |
| Resource Data | ServiceTab | Paid resource maps + yield estimates across Frontier systems — priced per query. |
| Trade Safety | ServiceTab | Per-call risk reads on Frontier trades and routes — billed before the answer is returned. |
| Alerts | ServiceTab | Subscriptions to Frontier events — price moves, hostiles, resource spawns — each delivery metered. |
| Payments | Receipts | Intel payments, receipts, tx hashes. |
| *(+ Market Oracle / Routes & Risk — alt tabs)* | ServiceTab | Frontier market reads; route planning with trade-safety scoring. |

---

## 5. Where this lives in the code

| Concern | File |
|---|---|
| Workspaces, tabs, services, agents, seed receipts | `src/data.ts` |
| Dynamic sidebar + tab → page routing (`pageKind`, `buildRail`, `railIconFor`) | `src/components/WorkspaceDashboard.tsx` |
| Per-tab hero copy | `TAB_COPY` in `src/components/WorkspaceDashboard.tsx` |
| ServiceTab page (KPIs / endpoints table / chart / history / guarantees) | `ServiceTabPage` in `src/components/WorkspaceDashboard.tsx` |
| 402 flow + SDK docs | `GatewayPage` in `src/components/WorkspaceDashboard.tsx` |
| Hold-to-pay 402 simulation | `src/components/PaymentModal.tsx` |
| Real wallet connect + live on-chain strip | `src/wallet.tsx` |
| Receipts showcase (standalone `#/showcase`) | `src/components/ReceiptsShowcase.tsx` |
| Design tweaks lab (`#/tweaks`) | `src/labs/DesignTweaksLab.tsx` |
| All styles | `src/styles.css` |

## 6. Source documents
- `hackathon-ideas-playbook-uk.md` — the original idea playbook (four ideas, tracks, tab proposals).
- `402/agent-payments-x402-universal-tz-uk.md` — the universal x402 technical spec (ТЗ) this build follows.
