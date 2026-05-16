# ТЗ: Universal Agent Payments / x402 API Economy Platform

Версія: v1 для хакатонів  
Мова продукту: англійська для demo/pitch, внутрішнє ТЗ українською  
Формат: один сайт з вибором workspace під конкретний хакатон  
Головний фокус: backend/API/product logic, без глибокого опису фронтенду

## 1. Коротка суть

Продукт: **Agent Payments / x402 API Economy Platform**.

Одне речення:

> Платформа, де developers можуть перетворити API, data feed, inference, storage або analytics endpoint у paid service, а AI-агенти можуть автоматично отримувати `402 Payment Required`, платити stablecoin/x402 і повторювати request без ручного onboarding.

Простіше:

> Stripe / API Gateway для AI-агентів, які платять за API, data, storage, inference і onchain analytics по факту використання.

Головна проблема:

- AI-агенти вже можуть шукати, викликати API і виконувати workflow.
- Але вони не мають нормального способу автономно платити за конкретний request.
- API providers не хочуть робити акаунти, Stripe billing, API keys і subscriptions для кожного агента.
- x402 повертає стару ідею HTTP `402 Payment Required`, але для сучасних stablecoin / agent payments.

Головне рішення:

- Provider створює paid endpoint.
- Agent викликає endpoint.
- Endpoint повертає `402 Payment Required` з payment terms.
- Agent платить через x402/stablecoin.
- Agent повторює request з payment proof.
- Gateway перевіряє payment і віддає protected resource.
- Dashboard показує usage, revenue, receipts, limits, failed payments.

## 2. Один сайт чи багато

Рішення: **один сайт, багато workspace-режимів**.

Не робити окремий сайт під кожен хакатон. Треба один core-продукт, який після заходу пропонує вибрати workspace:

- `0G Agent Payments`
- `Liquify x402 Data Terminal`
- `QIE Payment Gateway`
- `Arbitrum Agent Services`
- `Mantle Agent Wallet Economy`
- `Eazo AI Subscription OS`
- `Berkeley Agent Payment Playground`
- `DeepSurge Frontier Intel Market`

Після вибору workspace змінюються:

- назва продукту;
- треки і pitch;
- sidebar tabs;
- demo data;
- chain/API adapters;
- приклади paid endpoints;
- README/demo script для конкретного submit.

Core залишається один:

- provider dashboard;
- paid endpoint registry;
- x402 gateway;
- agent wallet / budget policy;
- usage logs;
- payment receipts;
- SDK/API docs;
- demo agent.

## 3. Цільові користувачі

### 3.1 API Provider / Developer

Хто це:

- developer, який має API або data service;
- protocol team, яке хоче монетизувати data/inference/storage;
- хакатон-команда, яка хоче показати paid endpoint за 2 хвилини;
- AI tool builder, який хоче продавати tool calls.

Що хоче:

- швидко створити paid endpoint;
- не будувати власний billing;
- отримувати оплату stablecoin;
- бачити requests, revenue, failed calls;
- мати SDK/middleware;
- видати агенту зрозумілий machine-readable payment challenge.

### 3.2 AI Agent Operator

Хто це:

- developer, який запускає agent;
- user, який дає агенту бюджет;
- протокол, який запускає autonomous service agent.

Що хоче:

- задати agent wallet;
- обмежити spend limit;
- дозволити конкретні API/tools;
- отримувати receipts;
- бачити, на що агент витрачає гроші;
- зупинити агента при ризиковій поведінці.

### 3.3 Hackathon Judge

Що має побачити за 2 хвилини:

- конкретний paid endpoint;
- agent робить request;
- endpoint повертає `402`;
- agent платить;
- protected data відкривається;
- dashboard оновлює usage/revenue/receipt;
- зрозуміло, де використаний протокол конкретного хакатону.

## 4. Non-goals

У v1 не робити:

- повноцінний Stripe-конкурент для всіх типів business billing;
- KYC/compliance platform;
- fiat on/off-ramp;
- складну accounting систему;
- окремий frontend під кожен хакатон;
- quest/guild/mission механіку;
- токеноміку як core feature;
- custody великих коштів;
- production-grade fraud engine.

Можна згадувати як future:

- fiat cards;
- cross-chain settlement;
- marketplace revenue share;
- token incentives;
- agent reputation;
- paid tool discovery protocol.

## 5. Product modules

## 5.1 Workspace Selector

Мінімальна роль:

- вибрати режим хакатону;
- відкрити правильний workspace URL;
- показати коротко, під які треки цей режим.

Routes:

```text
/
/0g
/liquify
/qie
/arbitrum
/mantle
/eazo
/berkeley
/deepsurge
```

Для submit краще давати judges прямий workspace link, наприклад `/liquify`, а не root selector.

## 5.2 Provider Dashboard

Provider має створювати paid service:

Поля:

- service name;
- description;
- category: data / inference / storage / wallet analytics / trading signal / checkout / game intel;
- endpoint URL або internal hosted endpoint;
- price per request;
- accepted currency;
- settlement wallet;
- network;
- max requests per minute;
- optional subscription / prepaid mode;
- response preview;
- active / paused status.

Must-have actions:

- create service;
- edit service;
- pause service;
- test as free request;
- test as paid request;
- copy API URL;
- copy x402 metadata;
- view usage;
- view receipts.

## 5.3 x402 Gateway

Gateway - серце продукту.

Відповідальність:

- приймає incoming request до paid service;
- перевіряє, чи service active;
- якщо payment proof відсутній, повертає `402 Payment Required`;
- якщо proof є, перевіряє його через facilitator / chain adapter;
- захищає від replay;
- проксить request до upstream API;
- логуює usage і receipt;
- повертає protected response.

Варіанти реалізації:

- middleware для Next.js / Express / Hono;
- hosted reverse proxy;
- SDK wrapper для existing API;
- internal mock endpoints для demo.

MVP recommendation:

- зробити hosted gateway + кілька internal demo endpoints;
- окремо додати SDK snippet, який показує, як provider інтегрує middleware у свій API.

## 5.4 Agent Wallet & Budget Policy

Agent не має безмежно витрачати гроші.

Потрібно:

- agent identity;
- wallet address;
- budget per day;
- budget per service;
- max price per request;
- allowlist services;
- denylist services;
- spending status;
- emergency pause.

Policy examples:

```json
{
  "agentId": "agent_yield_researcher",
  "dailyLimitUsd": 10,
  "maxPerRequestUsd": 0.25,
  "allowedServiceIds": ["svc_wallet_risk", "svc_yield_data"],
  "networks": ["base-sepolia", "arbitrum-sepolia"],
  "autoPay": true
}
```

## 5.5 Agent SDK

SDK потрібен не для краси, а для demo і developer adoption.

SDK має вміти:

- робити request;
- розпізнавати `402`;
- читати payment challenge;
- перевіряти policy;
- підписувати / ініціювати payment;
- повторювати request з payment proof;
- повертати structured result;
- логувати receipt.

Pseudo API:

```ts
const client = new AgentPayClient({
  agentId: "agent_yield_researcher",
  wallet: agentWallet,
  policy: {
    maxPerRequestUsd: 0.25,
    dailyLimitUsd: 10
  }
});

const result = await client.fetchPaid(
  "https://app.example.com/api/gateway/svc_yield_data",
  { query: { chain: "arbitrum", asset: "USDC" } }
);
```

## 5.6 Marketplace

Marketplace не має бути великим маркетплейсом у v1. Це каталог demo endpoints.

Service cards:

- name;
- category;
- price;
- network;
- provider;
- sample input;
- sample output;
- workspace compatibility;
- "Try with agent" action.

Demo services:

- Wallet Risk API;
- Yield Risk API;
- Trading Signal API;
- Tax Classification API;
- 0G Storage Job API;
- QIE Checkout API;
- Arbitrum Invoice API;
- Mantle RWA Data API;
- Eazo Subscription Optimizer API;
- EVE Frontier Intel API.

## 5.7 Receipts & Usage

Кожен paid request має залишати слід.

Receipt fields:

- receipt ID;
- service ID;
- provider wallet;
- payer / agent wallet;
- amount;
- currency;
- network;
- tx hash або facilitator reference;
- request hash;
- response hash optional;
- status: pending / paid / verified / failed / refunded;
- createdAt;
- paidAt;
- verifiedAt.

Usage metrics:

- total requests;
- paid requests;
- failed payments;
- revenue;
- average price;
- top services;
- agent spend;
- provider revenue.

## 5.8 Admin / Operator View

Для хакатону достатньо internal/debug view.

Показати:

- all services;
- all agents;
- all receipts;
- failed verifications;
- replay attempts;
- API health;
- chain/facilitator status.

## 6. Main user flows

## 6.1 Provider creates paid endpoint

1. Provider opens workspace.
2. Connects wallet or uses demo provider.
3. Clicks `Create Paid API`.
4. Enters name, price, network, settlement wallet.
5. Selects demo endpoint type or upstream URL.
6. Saves service.
7. Gets generated gateway URL.
8. Runs test request.
9. Sees `402 Payment Required`.
10. Runs agent-paid request.
11. Sees paid usage and receipt.

Success criteria:

- service appears in marketplace;
- gateway URL works;
- unpaid request returns 402;
- paid request returns data;
- receipt is visible after refresh.

## 6.2 Agent pays for API call

1. Agent selects service.
2. Agent sends request.
3. Gateway returns payment challenge.
4. SDK checks policy.
5. SDK pays if price <= allowed budget.
6. SDK retries request with payment proof.
7. Gateway verifies payment.
8. API response is returned.
9. Receipt is saved.
10. Usage dashboard updates.

Success criteria:

- no manual API key;
- no account signup;
- payment proof cannot be replayed;
- failed payment does not unlock data;
- user sees what agent paid for.

## 6.3 Judge demo flow

Default demo:

1. Open `/liquify` or `/0g`.
2. Click `Try Demo Agent`.
3. Agent calls paid data API.
4. UI shows `402 Payment Required`.
5. Agent auto-pays.
6. Data unlocks.
7. Receipt appears.
8. Open transaction/facilitator link.
9. Show how same core becomes QIE/Arbitrum/Mantle/Eazo workspace.

Pitch line:

> We turn paid APIs into autonomous services that AI agents can discover, pay for, and use over HTTP without accounts, subscriptions, or manual checkout.

## 7. Workspace-specific requirements

## 7.1 0G APAC Workspace

Name:

> 0G Agent Payment Router

Track fit:

- Agentic Economy & Autonomous Applications;
- Agentic Infrastructure;
- Web 4.0;
- Privacy & Sovereign Infrastructure, якщо додати private job metadata.

Sidebar tabs:

- Overview
- Agents
- Compute
- Storage
- Payments
- Receipts
- Privacy
- Settings

0G-specific demo:

- Agent pays for inference job.
- Agent pays for storage/memory write.
- Payment receipt links to job metadata.
- Optional: store agent memory / receipt metadata in 0G Storage.

Must show:

- AI agent is the buyer;
- API/service is autonomous;
- payment unlocks compute/storage/data;
- receipt is verifiable.

Demo endpoint examples:

- `/api/services/0g/inference-risk-report`
- `/api/services/0g/storage-memory-write`
- `/api/services/0g/private-agent-context`

## 7.2 Liquify Workspace

Name:

> Liquify x402 Data Terminal

Track fit:

- Next-Gen Trading Tool with x402 Integration;
- Advanced Wallet Analysis Tool;
- Seamless DeFi Tax Reporting Tool.

Sidebar tabs:

- Overview
- Trading Data
- Wallet Analysis
- Tax Reports
- x402 Gateway
- Payments
- Usage
- Settings

Liquify-specific demo:

- Agent pays for wallet analytics / trading signal.
- Service returns wallet risk, PnL, labels, tax categories.
- x402 flow is visible.

Must show:

- direct x402 integration;
- paid data access;
- useful trading/wallet/tax output;
- API monetization angle.

Demo endpoint examples:

- `/api/services/liquify/wallet-risk`
- `/api/services/liquify/trading-signal`
- `/api/services/liquify/tax-classifier`

## 7.3 QIE Workspace

Name:

> QIE Agent Payment Gateway

Track fit:

- DeFi & Payments;
- AI + Web3;
- Infrastructure & Tools;
- Social & Community, якщо додати creator/merchant use case.

Sidebar tabs:

- Overview
- Checkout
- QIE Wallet
- QIE Pass
- QIEDEX Data
- Payments
- Merchant Dashboard
- Settings

QIE-specific demo:

- Merchant creates paid AI/API service.
- Agent pays through QIE payment rail.
- QIE Pass can gate access or identify merchant/user.
- Optional: QIEDEX data endpoint as paid API.

Must show:

- payment utility, not just logo;
- merchant/provider revenue;
- AI agent or developer pays for service;
- QIE wallet/payment flow.

Demo endpoint examples:

- `/api/services/qie/merchant-checkout`
- `/api/services/qie/qiedex-data`
- `/api/services/qie/pass-gated-api`

## 7.4 Arbitrum Workspace

Name:

> Arbitrum Agent Services

Track fit:

- Best Agentic Project;
- Overall Prize;
- DeFi / Payments;
- Grants;
- optional Orbit/Robinhood Chain angle.

Sidebar tabs:

- Overview
- Agent Services
- Stablecoin Payments
- Escrow
- Orbit Monitor
- Risk Rules
- Receipts
- Settings

Arbitrum-specific demo:

- Agent pays USDC for API/service on Arbitrum.
- Provider receives stablecoin.
- Optional: escrow contract for service delivery or recurring payment.
- Optional: Orbit chain monitoring endpoint is paid per request.

Must show:

- real payment action on Arbitrum testnet or compatible demo network;
- agentic workflow;
- spend limits and receipts;
- stablecoin utility.

Demo endpoint examples:

- `/api/services/arbitrum/stablecoin-invoice`
- `/api/services/arbitrum/orbit-monitor`
- `/api/services/arbitrum/agent-escrow`

## 7.5 Mantle Workspace

Name:

> Mantle Agent Wallet Economy

Track fit:

- Agentic Wallets & Economy;
- AI Trading & Strategy;
- AI Alpha & Data;
- AI x RWA;
- AI DevTools.

Sidebar tabs:

- Overview
- Agent Wallets
- Alpha Data
- mETH / USDY
- RWA Data
- Strategy Sandbox
- Payments
- Settings

Mantle-specific demo:

- Agent pays for Mantle alpha/yield/RWA data.
- Agent wallet has spend policy.
- Service returns risk/yield/asset report.
- Optional: strategy sandbox charges per backtest.

Must show:

- agent wallet;
- paid alpha/data;
- Mantle-specific assets or RWA/yield angle;
- usage and receipt.

Demo endpoint examples:

- `/api/services/mantle/rwa-risk`
- `/api/services/mantle/meth-yield-signal`
- `/api/services/mantle/strategy-backtest`

## 7.6 Eazo Workspace

Name:

> Eazo AI Subscription OS

Track fit:

- AI Companion;
- Life OS;
- Wildcard;
- Superparent, якщо робити family safety/budget.

Sidebar tabs:

- Overview
- AI Companion
- Subscriptions
- Personal Budget
- Life OS
- Approvals
- Payments
- Settings

Eazo-specific demo:

- Personal AI companion manages paid AI/API tools.
- User gives agent a weekly budget.
- Agent pays for tools only within limits.
- App explains agent spending and subscriptions.

Must show:

- consumer value;
- AI companion behavior;
- budget and permission control;
- recurring/subscription use case.

Demo endpoint examples:

- `/api/services/eazo/subscription-optimizer`
- `/api/services/eazo/personal-finance-brief`
- `/api/services/eazo/tool-purchase`

## 7.7 Berkeley AI Workspace

Name:

> Berkeley Agent Payment Playground

Track fit:

- Ddoski's Toolbox;
- Ddoski's Playground;
- Ddoski's World.

Sidebar tabs:

- Overview
- Playground
- Paid Tools
- Agent Debugger
- Transaction Explainer
- Receipts
- Settings

Berkeley-specific demo:

- AI agent pays for a tool call inside a playground.
- Developer can inspect every step of the agent/payment flow.
- Optional: transaction explainer as paid tool.

Must show:

- AI-first developer tool;
- playful but technically clear sandbox;
- agent can pay, retry, and receive output.

Demo endpoint examples:

- `/api/services/berkeley/tx-explainer`
- `/api/services/berkeley/debug-tool`
- `/api/services/berkeley/research-agent`

## 7.8 DeepSurge / EVE Frontier Workspace

Name:

> Frontier Intel Market

Track fit:

- Utility;
- Technical Implementation;
- Live Frontier Integration;
- Creative.

Sidebar tabs:

- Overview
- Intel API
- Resource Data
- Trade Safety
- Alerts
- Payments
- Receipts
- Settings

DeepSurge-specific demo:

- Player/agent pays for live intel API.
- Service returns resource/route/market/trade risk.
- Optional: trade escrow or paid alert feed.

Must show:

- useful game utility;
- technical integration;
- paid data/API angle;
- clear reason this belongs in EVE Frontier.

Demo endpoint examples:

- `/api/services/deepsurge/resource-intel`
- `/api/services/deepsurge/trade-risk`
- `/api/services/deepsurge/live-alert`

## 8. Data model

## 8.1 Workspace

```ts
type Workspace = {
  id: "0g" | "liquify" | "qie" | "arbitrum" | "mantle" | "eazo" | "berkeley" | "deepsurge";
  name: string;
  pitch: string;
  hackathonUrl: string;
  tracks: string[];
  tabs: string[];
  defaultServices: string[];
  supportedNetworks: string[];
};
```

## 8.2 Service

```ts
type Service = {
  id: string;
  workspaceId: string;
  providerWallet: string;
  name: string;
  description: string;
  category: "data" | "inference" | "storage" | "analytics" | "payment" | "game-intel" | "tax" | "trading";
  priceUsd: number;
  currency: "USDC" | "USDT" | "native" | "mock";
  network: string;
  endpointType: "internal-demo" | "external-proxy";
  upstreamUrl?: string;
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
};
```

## 8.3 Agent

```ts
type Agent = {
  id: string;
  workspaceId: string;
  name: string;
  walletAddress: string;
  status: "active" | "paused";
  autoPayEnabled: boolean;
  dailyLimitUsd: number;
  maxPerRequestUsd: number;
  allowedServiceIds: string[];
  spentTodayUsd: number;
  createdAt: string;
};
```

## 8.4 Payment Challenge

```ts
type PaymentChallenge = {
  challengeId: string;
  serviceId: string;
  amount: string;
  currency: string;
  network: string;
  payTo: string;
  expiresAt: string;
  requestHash: string;
  facilitatorUrl?: string;
};
```

## 8.5 Receipt

```ts
type Receipt = {
  id: string;
  challengeId: string;
  workspaceId: string;
  serviceId: string;
  agentId: string;
  payerWallet: string;
  providerWallet: string;
  amount: string;
  currency: string;
  network: string;
  txHash?: string;
  facilitatorReference?: string;
  requestHash: string;
  status: "pending" | "paid" | "verified" | "failed" | "replayed" | "expired";
  errorCode?: string;
  createdAt: string;
  paidAt?: string;
  verifiedAt?: string;
};
```

## 9. API contract

## 9.1 Workspace/config

```http
GET /api/workspaces
GET /api/workspaces/:workspaceId
```

Returns workspace config, tabs, tracks, demo services.

## 9.2 Services

```http
GET /api/services?workspaceId=liquify
POST /api/services
GET /api/services/:serviceId
PATCH /api/services/:serviceId
POST /api/services/:serviceId/pause
POST /api/services/:serviceId/test
```

Rules:

- service creation requires provider wallet signature or demo admin mode;
- price must be positive;
- settlement wallet must be valid for network;
- paused services return clear error, not paid challenge.

## 9.3 Gateway

```http
GET /api/gateway/:serviceId
POST /api/gateway/:serviceId
```

Unpaid response:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
```

```json
{
  "error": "payment_required",
  "challenge": {
    "challengeId": "ch_123",
    "serviceId": "svc_wallet_risk",
    "amount": "0.05",
    "currency": "USDC",
    "network": "base-sepolia",
    "payTo": "0xProviderWallet",
    "expiresAt": "2026-05-10T22:00:00Z",
    "requestHash": "0x..."
  }
}
```

Paid request:

```http
GET /api/gateway/svc_wallet_risk
X-Agent-Id: agent_demo
X-Payment-Challenge: ch_123
X-Payment-Proof: ...
```

Paid response:

```json
{
  "data": {
    "riskScore": 82,
    "summary": "Wallet has high exposure to new contracts and 2 unlimited approvals."
  },
  "receiptId": "rcpt_123"
}
```

## 9.4 Agents

```http
GET /api/agents?workspaceId=0g
POST /api/agents
PATCH /api/agents/:agentId/policy
POST /api/agents/:agentId/pause
GET /api/agents/:agentId/spend
```

Rules:

- agent cannot auto-pay above `maxPerRequestUsd`;
- agent cannot exceed `dailyLimitUsd`;
- paused agent cannot pay;
- blocked service cannot be called.

## 9.5 Receipts

```http
GET /api/receipts?workspaceId=liquify
GET /api/receipts/:receiptId
GET /api/services/:serviceId/receipts
GET /api/agents/:agentId/receipts
```

Rules:

- receipts are immutable after verified, except status metadata;
- failed payments remain visible;
- replay attempts are logged.

## 9.6 SDK docs endpoint

```http
GET /api/docs/sdk-snippet?serviceId=svc_wallet_risk&language=ts
```

Returns ready-to-copy code snippet.

## 10. Payment verification

MVP acceptable approaches:

1. **Official x402 facilitator flow** where possible.
2. **Testnet stablecoin transfer + server verification** for hackathon-specific networks.
3. **Mock facilitator mode** only for demo fallback, clearly labeled as simulation.

Do not pretend mock is real. If mock mode is used, UI/README must say:

> Demo facilitator mode simulates the 402 handshake. The production path is designed for x402 facilitator verification.

Verification requirements:

- challenge expires;
- challenge bound to service ID;
- challenge bound to request hash;
- payment amount >= required amount;
- recipient matches provider wallet;
- network matches service network;
- proof cannot be reused;
- paid response only after verification;
- failed verification logs reason.

## 11. Security and anti-abuse

Taken from the crypto hackathon checklist and adapted to this product.

## 11.1 Frontend is not source of truth

Never trust:

- `providerWallet` from frontend without signature;
- `agentId` without policy lookup;
- `price` from client;
- `receipt status` from client;
- `payment proof` without verification.

## 11.2 Signature requirements

Provider actions:

- creating service;
- changing settlement wallet;
- changing price;
- pausing service;
- exporting revenue.

Agent/operator actions:

- creating agent;
- changing budget;
- enabling auto-pay;
- adding allowlist service.

## 11.3 Replay protection

Every challenge must include:

- nonce / challenge ID;
- expiration;
- request hash;
- service ID;
- amount;
- payTo;
- network.

Used challenge cannot unlock another request.

## 11.4 Multi-click and duplicate requests

Must handle:

- user clicks `Try Demo Agent` 5 times;
- SDK retries after network issue;
- provider creates service twice;
- payment verification callback repeats.

Protections:

- idempotency key;
- unique challenge ID;
- duplicate receipt detection;
- pending lock per challenge;
- disable action while pending.

## 11.5 Spend policy

Agent cannot:

- pay more than max per request;
- exceed daily budget;
- call non-allowlisted service;
- pay after pause;
- pay expired challenge;
- pay wrong network.

## 11.6 Error states

Every important action needs:

- success state;
- pending state;
- failed state;
- rejected state;
- expired challenge state;
- insufficient funds state;
- wrong network state;
- facilitator down state;
- API down state;
- replay detected state.

## 12. Storage and source of truth

Recommended:

- Database for services, agents, policies, receipts, usage logs.
- Chain/facilitator for payment truth.
- Optional decentralized storage for workspace-specific metadata, e.g. 0G agent memory or receipts.

Source of truth:

| Data | Source of truth |
|---|---|
| Service config | database + provider signature |
| Price | database |
| Payment status | facilitator/chain verification |
| Receipt | database after verification |
| Agent policy | database + operator signature |
| Spend totals | database from verified receipts |
| Demo data | seeded internal services |
| Workspace tracks | static config |

After refresh:

- selected workspace loads from route;
- services reload from API;
- receipts reload from API;
- pending payment checks current status;
- no result disappears.

## 13. Minimum backend architecture

Recommended modules:

```text
app
  workspace config
  dashboard surfaces

api
  services controller
  gateway controller
  agents controller
  receipts controller
  sdk docs controller

core
  payment challenge service
  payment verification service
  agent policy engine
  service registry
  usage logger
  receipt ledger
  workspace adapter registry

adapters
  x402 adapter
  stablecoin transfer adapter
  mock facilitator adapter
  0G adapter
  Liquify adapter
  QIE adapter
  Arbitrum adapter
  Mantle adapter
  DeepSurge adapter
```

Implementation principle:

- workspace-specific logic must live in adapters/config;
- core payment flow must stay unchanged;
- adding a new hackathon should not require rewriting gateway.

## 14. Smart contracts

MVP can work without custom contracts if x402/facilitator verifies stablecoin payments.

Add contracts only if needed for:

- escrow;
- subscription prepayment;
- onchain receipt registry;
- spend vault;
- service marketplace registry;
- Arbitrum/Mantle-specific bounty/agent wallet flow.

If contracts are added, must include:

- testnet deployment;
- verified contract if time permits;
- explorer link;
- ABI in repo;
- README addresses;
- basic tests;
- no admin function exposed to normal users;
- no double claim/release;
- clear failure states.

## 15. Demo data

Seeded services:

```text
svc_wallet_risk
  price: 0.05 USDC
  category: wallet analytics
  returns wallet risk score

svc_yield_signal
  price: 0.10 USDC
  category: trading/data
  returns yield/risk signal

svc_tax_classifier
  price: 0.08 USDC
  category: tax
  returns categorized transactions

svc_ai_inference
  price: 0.03 USDC
  category: inference
  returns AI summary

svc_storage_write
  price: 0.02 USDC
  category: storage
  returns storage reference

svc_frontier_intel
  price: 0.04 USDC
  category: game-intel
  returns resource/trade intel
```

Seeded agents:

```text
agent_yield_researcher
  daily limit: 10 USD
  max per request: 0.25 USD

agent_wallet_analyst
  daily limit: 5 USD
  max per request: 0.10 USD

agent_life_companion
  daily limit: 3 USD
  max per request: 0.05 USD
```

## 16. README requirements

README must include:

```md
# Project Name

## Problem
AI agents can call APIs but cannot easily pay for individual API calls.

## Solution
An x402/stablecoin payment gateway for AI agents and paid APIs.

## How it works
Provider creates paid endpoint → agent requests → gateway returns 402 → agent pays → gateway verifies → data unlocks.

## Hackathon workspaces
0G, Liquify, QIE, Arbitrum, Mantle, Eazo, Berkeley, DeepSurge.

## Protocol integrations
x402, stablecoins, workspace-specific chains/APIs.

## Demo
Live link, video link, test agent flow.

## How to run
Install, env, dev, build, test.

## Environment variables
List all required envs.

## Security notes
No private keys, challenge expiry, replay protection, budget limits.

## Future plans
More networks, real facilitator support, marketplace, agent reputation, hosted SDK.
```

## 17. Demo video structure

Length: 2-3 minutes.

Structure:

1. 15 sec - problem: agents can use APIs but cannot pay per request.
2. 20 sec - solution: x402 gateway for paid APIs.
3. 60 sec - live demo: unpaid request returns 402, agent pays, data unlocks.
4. 30 sec - workspace-specific integration, e.g. Liquify or 0G.
5. 20 sec - why scalable: same core works for QIE, Arbitrum, Mantle, Eazo.
6. 15 sec - future: agent economy marketplace.

Must visibly show:

- selected workspace;
- paid endpoint;
- `402 Payment Required`;
- payment proof / tx / facilitator reference;
- unlocked response;
- receipt in dashboard;
- usage/revenue update.

## 18. Submission checklist

Before every hackathon submit:

- live demo opens;
- correct workspace URL is used;
- main demo flow works in under 2 minutes;
- wallet connect works if required;
- wrong network state exists;
- unpaid request returns 402;
- paid request unlocks data;
- receipt remains after refresh;
- provider cannot fake revenue from frontend;
- agent cannot exceed budget;
- challenge cannot be replayed;
- README has correct track mapping;
- GitHub is public;
- `.env` is not committed;
- `.env.example` exists;
- no localhost links;
- demo video opens;
- contract/API/facilitator links work;
- integration is real, not just a logo.

## 19. Competitive landscape and examples

## 19.1 CipherPay

Link: https://github.com/kravadk/cipherpay  
Website/FAQ: https://www.cipherpay.app/faq

What it is:

- privacy-first invoice and payment protocol;
- uses Fhenix FHE on Ethereum Sepolia;
- hides amounts/recipients/payment totals onchain;
- includes contracts, SDK, app pages, threat model.

Useful lessons:

- strong privacy story;
- clear creator/payer/auditor flows;
- good README depth;
- good example of showing "what is visible vs hidden";
- strong threat model artifact.

Gap / how our product differs:

- CipherPay focuses on private invoices/payments.
- Our product focuses on AI agents paying for HTTP APIs/tools via x402-style flow.
- We should borrow privacy/audit/receipt clarity, but not copy invoice-only scope.

## 19.2 NullPay

Link: https://github.com/geekofdhruv/NullPay

What it is:

- privacy payment infrastructure with merchant lifecycle;
- includes hosted checkout, SDK, CLI, MCP flow, dashboard, audit/export ideas;
- supports merchant tools and realtime payment status.

Useful lessons:

- merchant dashboard matters;
- SDK/CLI improves developer credibility;
- MCP/AI-client integration is useful for agent workflows;
- realtime payment status makes demo feel alive.

Gap / how our product differs:

- NullPay is merchant/private payment oriented.
- Our product is API/provider/agent oriented.
- We should borrow SDK, CLI, hosted checkout, realtime receipt UX ideas.

## 19.3 Coinbase x402

Links:

- Docs: https://docs.cdp.coinbase.com/x402/docs/client-server-model
- FAQ: https://docs.cdp.coinbase.com/x402/support/faq
- Network support: https://docs.cdp.coinbase.com/x402/network-support
- GitHub: https://github.com/coinbase/x402
- Product page: https://www.coinbase.com/developer-platform/products/x402/

What it is:

- open payment protocol built around HTTP `402 Payment Required`;
- supports pay-per-use APIs and AI agents;
- has TypeScript, Python and Go packages;
- official packages include server middleware and fetch/client wrappers.

Use in our product:

- core protocol reference;
- use official packages where possible;
- describe our platform as orchestration layer around x402: workspace configs, provider dashboard, agent budget policies, receipts, marketplace.

## 19.4 Crow

Link: https://www.crowpay.ai/

What it is:

- service that integrates x402 into APIs;
- focuses on agent-accessible paid APIs and USDC settlement.

Useful lessons:

- "make your API agent-accessible" is a clear positioning;
- analytics/dashboard is expected;
- integration speed matters.

Differentiation:

- our hackathon version is multi-workspace and protocol-specific;
- we add agent budget/policy and receipts as first-class demo objects.

## 19.5 Crossmint Agent Payments

Links:

- Agent docs: https://docs.crossmint.com/agents/overview
- AI agents solution: https://www.crossmint.com/solutions/ai-agents

What it is:

- payment infrastructure for AI agents;
- supports cards, stablecoin wallets, x402/MPP, spending limits and agent payments.

Useful lessons:

- agent permissions and limits are mandatory;
- payment methods should be abstracted;
- agent wallet can be a product surface by itself.

Differentiation:

- Crossmint is broader commerce/wallet infrastructure.
- Our v1 is focused on paid APIs and hackathon-specific protocol adapters.

## 19.6 Skyfire

Link: https://skyfire.xyz/

What it is:

- payments and identity network for AI agents;
- focuses on AI agents accessing services without human intervention.

Useful lessons:

- identity + budget + payment is a strong triad;
- service verification matters.

Differentiation:

- our v1 should be more transparent and developer-demo friendly;
- show full 402 request/payment/receipt lifecycle.

## 19.7 Stripe Agent Toolkit

Link: https://docs.stripe.com/agents

What it is:

- Stripe tools for agentic workflows;
- useful for payment links, invoices, subscriptions and agent-driven Stripe actions.

Useful lessons:

- agents need safe permissioned payment actions;
- existing business payment concepts are familiar to judges.

Differentiation:

- Stripe is fiat/business rails.
- Our product is stablecoin/x402/API-native and fits crypto hackathon tracks.

## 19.8 Cloudflare Pay Per Crawl

Link: https://blog.cloudflare.com/introducing-pay-per-crawl/

What it is:

- content/API access can return HTTP 402-style payment requirement;
- relevant to paid content/data access for agents/crawlers.

Useful lessons:

- 402 is intuitive for paid web resources;
- pay-per-access needs clear pricing and verification.

Differentiation:

- our product is not only crawler/content access;
- it targets AI agents, paid APIs, stablecoin settlement and hackathon-specific integrations.

## 19.9 Other x402 / agent payment examples

Useful references:

- CeyPay x402 on Solana: https://colosseum.com/agent-hackathon/projects/ceypay-x402
- ClawPurse x402 Gateway: https://gateway.clawpurse.ai/
- x402 npm package: https://www.npmjs.com/package/x402
- Stellar x402 docs: https://developers.stellar.org/docs/build/agentic-payments/x402

What to learn:

- small demos should show the full 402 cycle;
- SDK/middleware examples are important;
- chain-specific versions can win sponsor tracks if integration is real.

## 20. Hackathon and protocol resources

Hackathons:

- Mantle: https://www.competehub.dev/en/competitions/dorahacksmantleturingtesthackathon2026
- 0G APAC: https://www.hackquest.io/hackathons/0G-APAC-Hackathon
- Arbitrum: https://www.hackquest.io/en/hackathons/Arbitrum-Open-House-London-Online-Buildathon
- QIE: https://hackathon.qie.digital/
- Eazo: https://eazo-ai-hackathon.devpost.com/?ref_feature=challenge&ref_medium=discover
- Berkeley AI: https://ai.hackberkeley.org/
- Liquify: https://www.competehub.dev/en/competitions/dorahacksliquify
- DeepSurge: https://www.deepsurge.xyz/evefrontier2026

Core payment/protocol resources:

- x402 docs: https://docs.cdp.coinbase.com/x402/docs/client-server-model
- x402 FAQ: https://docs.cdp.coinbase.com/x402/support/faq
- x402 network support: https://docs.cdp.coinbase.com/x402/network-support
- x402 GitHub: https://github.com/coinbase/x402
- x402 npm: https://www.npmjs.com/package/x402
- Stripe Agents: https://docs.stripe.com/agents
- Crossmint Agents: https://docs.crossmint.com/agents/overview
- Cloudflare Pay Per Crawl: https://blog.cloudflare.com/introducing-pay-per-crawl/

User-provided examples:

- CipherPay: https://github.com/kravadk/cipherpay
- NullPay: https://github.com/geekofdhruv/NullPay

Visual / UX reference resources:

Use these only as adaptation references for the final site, workspace selector, dashboard polish, payment flow clarity, and demo presentation. They should not change the core product logic.

- Curations Supply / Branding: https://curations.supply/branding
  - For brand direction, visual systems, typography, colors, identity references.
- Webflow Made in Webflow: https://webflow.com/made-in-webflow
  - For cloneable/live website inspiration and polished landing/demo site structures.
- Motion Sites: https://motionsites.ai/
  - For motion, hero interaction, animated presentation, and high-impact demo inspiration.
- Craftwork Curated Websites: https://craftwork.design/curated/websites/
  - For curated Web3, AI, finance, SaaS, productivity and web app visual references.
- Landing Love: https://www.landing.love/
  - For SaaS, AI, crypto, DeFi, Web3, app and finance landing page references.
- Navbar Gallery: https://www.navbar.gallery/
  - For navigation patterns, sticky headers, dropdowns, workspace switching and top-bar ideas.
- Rebrand Gallery: https://www.rebrand.gallery/
  - For brand identity and rebrand references if the product needs a stronger visual direction.
- CTA Gallery: https://www.cta.gallery/
  - For primary action patterns such as `Try Demo Agent`, `Create Paid API`, `Open Workspace`, `View Receipt`.
- Bento Grids: https://bentogrids.com/
  - For modular overview sections, feature summaries and workspace cards.
- Sleek References: https://sleek.design/references
  - For app/dashboard style references, especially finance, ledger, dashboard and AI companion layouts.
- Lazyweb Checkout & Payment Flows: https://www.lazyweb.com/canvas/flows#cat-checkout-payment
  - For real checkout/payment flow references, payment confirmation, subscription, paywall and receipt UX.
- Local video reference: `C:\Users\Leonid\Downloads\cVRM-LuH3xNuItfI.mp4`
  - Use as the main motion reference for the core payment moment: `402 Payment Required -> Hold/Approve -> Verifying -> Approved`.
  - Strong fit for the payment modal, not for the whole dashboard.
  - Useful interaction details: centered payment card, large amount, merchant/service context, tactile hold-to-pay button, soft verification rings, clear approved state.
  - Adaptation for this product: replace merchant coffee payment with `Wallet Risk API`, `Yield Signal API`, `0G Storage Job`, or `Agent Tool Call`; replace card/device object with agent wallet / API key / service capsule.

## 21. MVP build phases

## Phase 1: Core demo in one workspace

Recommended first workspace: **Liquify** or **0G**.

Build:

- workspace selector;
- service registry;
- one paid endpoint;
- gateway returns 402;
- demo agent pays;
- receipt saved;
- usage dashboard;
- README/demo video.

Acceptance:

- judge can see full 402 flow in 2 minutes;
- no fake "paid" state without receipt;
- refresh keeps receipt;
- README explains protocol integration.

## Phase 2: Multi-workspace adaptation

Add:

- workspace config system;
- 0G, Liquify, QIE, Arbitrum, Mantle, Eazo modes;
- workspace-specific services;
- different tabs and pitch copy;
- track mapping in README.

Acceptance:

- same gateway powers all workspaces;
- each workspace has at least one believable demo endpoint;
- each workspace maps to at least one hackathon track.

## Phase 3: SDK and provider credibility

Add:

- TypeScript SDK snippet;
- middleware example;
- provider dashboard;
- service creation flow;
- receipts export;
- error states.

Acceptance:

- developer can understand how to integrate in 5 minutes;
- demo is not just internal mock;
- provider can create a paid endpoint.

## Phase 4: Strong hackathon polish

Add:

- video;
- README;
- track-specific submission copy;
- public GitHub;
- env example;
- deployed demo;
- source links;
- final 15-minute checklist pass.

## 22. Suggested project names

Good names:

- AgentPay Router
- MeteredAI
- PayPerAgent
- xAgentPay
- ToolPay
- API402
- AgentMeter
- PayGate AI

Best practical name for hackathons:

> AgentPay Router

One-liner:

> AgentPay Router turns any API into a paid AI-agent service using HTTP 402, stablecoin settlement, agent budgets, and verifiable receipts.

## 23. Final recommended demo path

Use this as the main pitch demo:

1. Open `/liquify`.
2. Show `x402 Trading/Data Terminal`.
3. Select `Wallet Risk API`, price `0.05 USDC`.
4. Click `Try with Demo Agent`.
5. Show first request returns `402 Payment Required`.
6. Show agent policy approves price.
7. Show payment verification.
8. Show protected data: wallet risk/PnL/tax categories.
9. Show receipt and usage dashboard.
10. Switch to `/0g` and say: same core, but now agent pays for compute/storage.
11. Switch to `/qie` and say: same core, but now merchant/API payments.

Why this works:

- Liquify gives the clearest x402 track match.
- 0G gives agent economy narrative.
- QIE gives payments narrative.
- Arbitrum/Mantle/Eazo become believable adaptations.

## 24. Final product checklist

The project is ready when this chain is visible:

> problem -> paid API/service -> agent request -> 402 challenge -> payment -> verification -> unlocked data -> receipt -> usage/revenue -> workspace-specific protocol value.

If this chain is not visible, the project will look like a random dashboard.

Minimum must-have:

- one live workspace;
- one paid service;
- one agent;
- one 402 challenge;
- one verified payment or clearly labeled demo facilitator;
- one unlocked response;
- one receipt;
- one usage dashboard;
- one README;
- one demo video.
