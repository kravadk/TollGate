# Hackathon Ideas Playbook

Хакатони: Mantle, 0G APAC, Arbitrum, QIE, Eazo, Berkeley AI, Liquify, DeepSurge / EVE Frontier.

Ціль: ідеї, які можна реально подати на хакатони і переробляти між треками без риторики guild / missions / quest board.

## Короткий висновок

Найсильніший напрям для більшості треків: **AI Wallet Safety Copilot**.

Чому:
- проблема зрозуміла кожному crypto user: люди не розуміють, що підписують;
- легко показати live demo;
- підходить під AI, DeFi, infra, wallet, consumer, privacy, developer tools;
- можна рескінити під Mantle, 0G, Arbitrum, QIE, Eazo, Berkeley і Liquify;
- для DeepSurge можна перетворити в EVE Frontier Intel / Trade Safety Terminal.

Три основні reusable product cores:
1. **AI Wallet Safety Copilot** - transaction explanation, approval risk, scam detection, simulation before signing.
2. **Onchain Intelligence Engine** - wallet clustering, smart money, tax, anomaly detection, risk/PnL dashboards.
3. **Agent Payments / x402 API Economy** - paid APIs, pay-per-use, subscriptions, invoices, autonomous agent payments.

## Core 1: AI Wallet Safety Copilot

### Проблема

Користувачі підписують транзакції, approvals, swaps, bridge actions і smart contract calls, не розуміючи:
- що саме зміниться після підпису;
- які токени або NFT можуть бути списані;
- чи є infinite approval;
- чи контракт новий, ризиковий або схожий на scam;
- чи дія може привести до liquidation, loss або tax/reporting issue.

### Продукт

AI Copilot, який перед підписом транзакції:
- декодує calldata;
- симулює результат;
- показує assets in / assets out;
- оцінює approval risk;
- пояснює дію простою мовою;
- дає risk label: `Safe`, `Caution`, `Danger`;
- пропонує safer alternative: limited approval, revoke, lower amount, delay, check contract.

### Demo flow

1. User підключає wallet або paste raw transaction.
2. App декодує дію: approve / swap / bridge / mint / contract call.
3. App показує human-readable explanation.
4. App показує risk score і конкретні причини.
5. User бачить simulation: balance before / after.
6. App генерує safe version: limited approval або cancel/revoke.

### Технічне ядро

- `Transaction Decoder`: ABI decoding, method signatures, token approvals.
- `Simulation Layer`: Tenderly-like simulation або власний lightweight симулятор для demo.
- `Risk Engine`: rules + AI explanation.
- `Wallet/Chain Adapter`: Mantle, Arbitrum, QIE, 0G, Ethereum-like chains.
- `Data Adapter`: Liquify Indexer, block explorers, RPC, event logs.
- `AI Layer`: explanation, risk summary, user-facing guidance.

### Як рескінити під хакатони

| Хакатон | Назва | Подача |
|---|---|---|
| Mantle | Mantle Risk Copilot | Safety layer для mETH, USDY, RWA, DeFi і AI agent wallets |
| 0G APAC | Private AI Wallet Analyst | Аналіз транзакцій із 0G Storage/Compute і privacy-preserving execution |
| Arbitrum | Arbitrum Transaction Guardian | Pre-sign safety для Arbitrum One / Sepolia / Orbit / Robinhood Chain |
| QIE | QIE Wallet Copilot | Safety + QIE Wallet + QIE Pass + QIEDEX transaction explanations |
| Eazo | AI Finance Companion | Consumer AI assistant для crypto spending, risk, subscriptions, taxes-lite |
| Berkeley AI | Wallet Safety Tutor | AI tool, який навчає і захищає користувача перед onchain діями |
| Liquify | Wallet Risk Investigator | Використовує Liquify Indexer для wallet analysis і risk history |
| DeepSurge | EVE Frontier Trade Guardian | Перевіряє player trades, contracts, resource transfers, market risk |

## Core 2: Onchain Intelligence Engine

### Проблема

Onchain data є, але вона погано перетворюється в корисні рішення:
- складно зрозуміти wallet behavior;
- важко відстежити PnL і tax lots;
- складно знайти smart money або suspicious activity;
- проєктам потрібні analytics, але raw events не дають відповіді;
- developers витрачають час на indexing замість продукту.

### Продукт

Data engine, який бере wallet / contract / protocol і будує:
- wallet profile;
- PnL;
- tax report draft;
- counterparty graph;
- anomaly alerts;
- smart money score;
- risk score;
- protocol usage analytics.

### Demo flow

1. User вводить wallet або contract address.
2. Engine індексує події.
3. Dashboard показує: assets, PnL, approvals, risk, counterparties.
4. AI пояснює: що це за wallet, які патерни, які ризики.
5. Export: CSV / PDF / API response.

### Як рескінити під хакатони

| Хакатон | Назва | Подача |
|---|---|---|
| Liquify | Advanced Wallet Investigator | Пряме попадання в Wallet Analysis Tool |
| Liquify | AI Tax Report Generator | Пряме попадання в DeFi Tax Reporting Tool |
| Mantle | Smart Money Telegram Agent | AI Alpha & Data: anomaly detection, smart money tracking |
| 0G APAC | Verifiable Onchain Intelligence | 0G Storage для data persistence, 0G Compute для AI analysis |
| QIE | QIEDEX Analytics Dashboard | Analytics для QIE Dex, Wallet, Pass, stablecoin usage |
| Arbitrum | Orbit Chain Monitor | Monitoring і analytics для Orbit chains / Arbitrum apps |
| Berkeley | AI Research Assistant for Crypto Data | Toolbox / World: explainable onchain research |

## Core 3: Agent Payments / x402 API Economy

### Проблема

AI agents можуть викликати API, купувати data, платити за inference, storage, tools, але нормальної payment UX майже нема:
- API monetization складна;
- agent-to-agent payments не стандартизовані;
- subscriptions і pay-per-use для agents незручні;
- важко показати usage, billing, limits, receipts;
- developers хочуть paid endpoints без складної billing інфраструктури.

### Продукт

Payment layer для AI agents і API providers:
- create paid API endpoint;
- x402 / stablecoin payment gate;
- pay-per-call, subscription, prepaid credits;
- agent wallet permissions;
- receipts і usage dashboard;
- SDK для developers.

### Demo flow

1. Developer створює paid API endpoint.
2. AI agent пробує викликати endpoint.
3. API повертає payment required.
4. Agent платить через x402 / stablecoin.
5. API відкриває доступ.
6. Dashboard показує usage, revenue, receipts.

### Як рескінити під хакатони

| Хакатон | Назва | Подача |
|---|---|---|
| 0G APAC | Agent Payment Router | Agentic Economy + autonomous applications |
| Liquify | x402 Trading/Data Terminal | Пряме попадання в x402 trading tool |
| QIE | AI Payment Link Builder | QIE payments, stablecoin rails, merchant tools |
| Arbitrum | Stablecoin Invoice + Agent Escrow | Best Agentic Project + real-world payments |
| Mantle | Agentic Wallet Economy | Agent wallets, paid alpha, AI trading/data services |
| Eazo | Personal AI Subscription Manager | Consumer Life OS для paid AI tools і crypto subscriptions |

## Ідеї по кожному хакатону

## Mantle

Треки: AI Trading & Strategy, AI Alpha & Data, AI x RWA, Consumer & Viral DApps, AI DevTools, Agentic Wallets & Economy.

### 1. Mantle Risk Copilot

Проблема: користувачі не розуміють ризики mETH, USDY, RWA, DeFi стратегій і approvals.

Рішення: AI copilot для transaction simulation, RWA/yield risk, approval warnings і plain-English explanations.

Треки: AI x RWA, AI DevTools, Agentic Wallets, Consumer DApps.

Demo: user робить approve / swap / yield action, copilot показує risk і safe alternative.

### 2. Smart Money Telegram Agent

Проблема: alpha data розкидана по explorers, DEX, wallets і Twitter.

Рішення: Telegram agent, який відстежує smart wallets, whale moves, anomalies, new RWA/yield flows на Mantle.

Треки: AI Alpha & Data, Consumer & Viral DApps.

Demo: bot надсилає alert, пояснює причину і показує wallet graph.

### 3. Agentic Yield Simulator

Проблема: AI trading/yield agents можуть втрачати гроші через непрозорий risk.

Рішення: sandbox, де agent запускає стратегію на історичних або live даних, а система оцінює drawdown, risk, fees.

Треки: AI Trading & Strategy, AI x RWA.

Demo: agent порівнює 3 стратегії для mETH/USDY і вибирає найменш ризикову.

### 4. Mantle Audit Assistant

Проблема: builders швидко пишуть smart contracts, але пропускають risk patterns.

Рішення: AI audit assistant для Mantle contracts: permissions, oracle risk, upgradeability, token approvals.

Треки: AI DevTools.

Demo: upload contract, assistant знаходить issue і пропонує patch.

### 5. Agent Wallet Firewall

Проблема: AI agents можуть виконати небезпечну onchain дію без людського контролю.

Рішення: policy firewall для agent wallets: spend limits, contract allowlist, risk approval gates.

Треки: Agentic Wallets & Economy, AI DevTools.

Demo: agent пробує виконати risky call, firewall блокує і пояснює.

Найкращий вибір: **Mantle Risk Copilot**.

## 0G APAC

Треки: Agentic Infrastructure, Agentic Trading Arena, Agentic Economy, Web 4.0, Privacy & Sovereign Infrastructure.

### 1. Private AI Wallet Analyst

Проблема: wallet analysis корисний, але приватність користувача ламається.

Рішення: AI analyst, який зберігає history/memory в 0G Storage, робить inference через 0G Compute і дає privacy-aware risk report.

Треки: Agentic Infrastructure, Privacy, Agentic Economy.

Demo: user аналізує wallet, дані зберігаються як persistent private memory, AI повертає risk report.

### 2. Agent Payment Router

Проблема: AI agents не мають нормального способу платити за tools, storage, APIs.

Рішення: router для pay-per-use AI services з wallet permissions, receipts і usage limits.

Треки: Agentic Economy, Autonomous Applications.

Demo: AI agent платить за API call і отримує результат.

### 3. Verifiable Trading Strategy Simulator

Проблема: AI trading bots важко перевірити, а proprietary strategies потребують privacy.

Рішення: simulator з sealed inference / TEE-style privacy, який показує verifiable performance без розкриття strategy logic.

Треки: Agentic Trading Arena, Privacy.

Demo: strategy запускається, результат верифікується, strategy params не розкриваються.

### 4. AI Memory Layer for dApps

Проблема: dApps не мають persistent AI memory між сесіями і chains.

Рішення: SDK для dApps, що дає agent memory, user preferences, history і context storage через 0G.

Треки: Agentic Infrastructure, Web 4.0.

Demo: dApp памʼятає користувацькі preferences і пояснює наступні дії.

### 5. TEE-based DeFi Risk Agent

Проблема: DeFi risk analysis може розкривати sensitive portfolio data.

Рішення: private risk agent, який аналізує portfolio і видає тільки risk output.

Треки: Privacy, Agentic Trading.

Demo: user отримує liquidation / exposure risk без публічного розкриття повного портфеля.

Найкращий вибір: **Private AI Wallet Analyst** або **Agent Payment Router**.

## Arbitrum

Треки: Overall Prize, Best Agentic Project, Grants. Теми: DeFi, Gaming, Social Applications, DePIN, Stylus, Solidity, Orbit, Robinhood Chain.

### 1. Arbitrum Transaction Guardian

Проблема: Arbitrum users підписують risky approvals і contract calls без розуміння.

Рішення: pre-sign transaction safety layer для Arbitrum One, Sepolia, Orbit chains.

Треки: Overall, Best Agentic Project.

Demo: користувач підписує swap/approve, guardian декодує і попереджає.

### 2. AI Agent for Robinhood / Arbitrum Assets

Проблема: retail users не розуміють tokenized assets, yield і settlement risk.

Рішення: AI assistant для tokenized assets: пояснення, risk, portfolio impact, compliance-lite.

Треки: Best Agentic Project, Overall.

Demo: user питає про asset, agent показує risk і onchain state.

### 3. Orbit Chain Monitor

Проблема: custom Orbit chains потребують monitoring, alerts і developer visibility.

Рішення: dashboard для RPC health, contract events, bridge flows, abnormal transactions.

Треки: Infra, Grants, Overall.

Demo: deploy sample contract, monitor бачить events і anomalies.

### 4. Stablecoin Invoice + Escrow App

Проблема: freelancers, small teams і AI services не мають простого stablecoin billing.

Рішення: invoices, milestone escrow, subscriptions, receipts on Arbitrum.

Треки: DeFi, Real Problem Solving, Overall.

Demo: create invoice, pay stablecoin, release escrow.

### 5. Stylus Smart Contract Debugger

Проблема: Rust/Stylus developers потребують кращих debugging tools.

Рішення: AI debugger для Stylus contracts: errors, gas, ABI, deployment checks.

Треки: DevTools, Grants.

Demo: upload Stylus error, debugger знаходить issue і дає fix.

Найкращий вибір: **Arbitrum Transaction Guardian**.

## QIE

Треки: DeFi & Payments, AI + Web3, Gaming & Metaverse, Infrastructure & Tools, Social & Community.

### 1. QIE Wallet Copilot

Проблема: нові QIE users не розуміють QIE Wallet, QIEDEX, QIE Pass і transaction risk.

Рішення: AI assistant для wallet actions, DEX swaps, identity/pass checks і transaction explanation.

Треки: AI + Web3, Infrastructure & Tools, DeFi & Payments.

Demo: connect QIE wallet, зробити QIEDEX swap, отримати explanation і risk score.

### 2. Merchant Stablecoin Checkout

Проблема: merchants важко приймати stablecoin/QIE payments без Web3 знань.

Рішення: checkout links, POS page, receipts, stablecoin payment rails.

Треки: DeFi & Payments.

Demo: merchant створює product link, buyer платить, merchant бачить receipt.

### 3. AI Payment Link Builder

Проблема: малим creators/builders складно створити payment flow.

Рішення: AI генерує payment page, invoice, product checkout і deploy на QIE.

Треки: AI + Web3, DeFi & Payments.

Demo: prompt "sell a consultation for 50 USDT", app створює live payment link.

### 4. QIE Pass Identity + Wallet Risk Score

Проблема: apps хочуть identity/reputation signals без складної інтеграції.

Рішення: API, який комбінує QIE Pass + wallet history + risk score.

Треки: Infrastructure & Tools, Social & Community.

Demo: dApp перевіряє user risk і identity status.

### 5. QIEDEX Analytics Dashboard

Проблема: DEX users і builders не бачать зрозумілої аналітики liquidity, volume, wallet flows.

Рішення: dashboard для DEX pools, wallets, swaps, PnL, alerts.

Треки: DeFi & Payments, Infrastructure & Tools.

Demo: показати pool analytics і wallet behavior.

Найкращий вибір: **QIE Wallet Copilot** або **Merchant Stablecoin Checkout**.

## Eazo

Треки: Superparent, AI Companion, Life OS, Body Intelligence, Wildcard. Важливо: потрібен live product, не просто prototype.

### 1. Crypto Life OS

Проблема: crypto users губляться між wallets, payments, subscriptions, risk, taxes.

Рішення: personal AI finance assistant для crypto життя: spending, risk, tax-lite, reminders, portfolio notes.

Треки: Life OS, AI Companion, Wildcard.

Demo: user підключає wallet, бачить spending, risky approvals, subscriptions і next actions.

### 2. AI Finance Companion

Проблема: людям потрібен простий персональний помічник, який не звучить як dashboard.

Рішення: conversational finance companion: пояснює wallet, нагадує про ризики, формує weekly summary.

Треки: AI Companion, Life OS.

Demo: chat: "чи безпечно це підписувати?", "скільки я витратив?", "що сталося з портфелем?"

### 3. Family Crypto Safety App

Проблема: родини/пари/новачки не мають safety rails для crypto wallets.

Рішення: shared safety alerts, spending limits, risky transaction warnings, emergency revoke.

Треки: Superparent, AI Companion.

Demo: один user отримує alert, коли family wallet має dangerous approval.

### 4. Founder / Builder Operating System

Проблема: indie builders втрачають контекст: tasks, users, payments, feedback, metrics.

Рішення: AI OS для solo founders: inbox, roadmap, customer notes, payments, analytics.

Треки: Life OS, Wildcard.

Demo: connect Stripe/crypto wallet/GitHub, app генерує daily founder brief.

### 5. Personal Risk & Subscription Tracker

Проблема: люди забувають recurring payments і approvals.

Рішення: AI tracker для subscriptions, recurring crypto payments, token allowances.

Треки: Life OS, AI Companion.

Demo: app знаходить recurring expenses і risky approvals.

Найкращий вибір: **Crypto Life OS**.

## Berkeley AI

Треки: Ddoski's World, Ddoski's Toolbox, Ddoski's Lab, Ddoski's Playground.

### 1. AI DevTool for Onchain Debugging

Проблема: developers не розуміють failed transactions, revert reasons, event logs.

Рішення: AI debugger, який перетворює tx hash у зрозуміле пояснення і fix suggestions.

Треки: Toolbox.

Demo: paste failed tx, tool пояснює причину і дає code fix.

### 2. Wallet Safety Tutor

Проблема: новачки втрачають гроші через approvals, phishing, fake mints.

Рішення: навчальний AI simulator, де user тренується розпізнавати risky transactions.

Треки: World, Toolbox.

Demo: user проходить 3 transaction scenarios, AI пояснює помилки.

### 3. AI Research Assistant for Crypto Data

Проблема: crypto research займає години ручного перегляду wallets, protocols, docs.

Рішення: AI assistant, який збирає onchain evidence, джерела і summary.

Треки: Toolbox, World.

Demo: prompt "analyze this protocol", assistant робить structured report.

### 4. Interactive Transaction Explainer

Проблема: blockchain UX занадто технічний.

Рішення: візуальний explainer: before/after balances, arrows, risk labels, natural language.

Треки: Toolbox, Playground.

Demo: paste tx, app показує інтерактивну схему.

### 5. AI Playground for Agent Payments

Проблема: people do not understand how AI agents will pay for tools.

Рішення: sandbox, де agents купують API calls, data, storage через simulated stablecoin/x402 payments.

Треки: Playground, Toolbox.

Demo: agent викликає paid API і платить.

Найкращий вибір: **AI DevTool for Onchain Debugging** або **Wallet Safety Tutor**.

## Liquify

Треки: Advanced Wallet Analysis Tool, Next-Gen Trading Tool with x402 Integration, Seamless DeFi Tax Reporting Tool.

### 1. Advanced Wallet Investigator

Проблема: wallet analysis tools або дорогі, або не дають швидкого custom indexing.

Рішення: Liquify-powered wallet investigator: labels, clusters, flows, approvals, PnL, anomalies.

Треки: Advanced Wallet Analysis Tool.

Demo: input wallet, app показує flow graph, high-risk approvals, counterparties.

### 2. AI Tax Report Generator

Проблема: DeFi tax reports важко робити через swaps, LP, bridges, staking, custom contracts.

Рішення: multi-chain DeFi tax draft з event decoding, categorization і export.

Треки: Seamless DeFi Tax Reporting Tool.

Demo: wallet -> transactions -> categorized taxable events -> CSV/PDF.

### 3. x402 Trading/Data Terminal

Проблема: trading tools потребують live data і paid execution/data APIs.

Рішення: terminal, де AI/trader платить за data/API через x402 і отримує indexed signals.

Треки: Next-Gen Trading Tool with x402 Integration.

Demo: paid endpoint returns market/wallet signal after x402 payment.

### 4. Multi-wallet PnL + Risk Dashboard

Проблема: power users мають багато wallets і не бачать consolidated PnL/risk.

Рішення: dashboard для multi-wallet PnL, token exposure, approvals, taxable events.

Треки: Wallet Analysis, Tax Reporting.

Demo: import 3 wallets, dashboard показує aggregate picture.

### 5. Contract-specific Indexer Builder

Проблема: builders хочуть швидко індексувати custom contract без повного subgraph setup.

Рішення: UI/API: paste contract address + ABI, отримай database-ready indexed events і API endpoint.

Треки: Infrastructure angle within Liquify API theme.

Demo: paste contract, generate indexed table і query endpoint.

Найкращий вибір: **Advanced Wallet Investigator** або **AI Tax Report Generator**.

## DeepSurge / EVE Frontier

Треки: Utility, Technical Implementation, Creative, Weirdest Idea, Live Frontier Integration.

### 1. EVE Frontier Intel Terminal

Проблема: players не мають зручного інтерфейсу для market/resource/world intelligence.

Рішення: terminal для resources, locations, prices, risks, player activity, alerts.

Треки: Utility, Technical Implementation, Live Integration.

Demo: player відкриває terminal і бачить live useful intel для рішення.

### 2. Onchain Item / Resource Market Analyzer

Проблема: в ігровій економіці складно зрозуміти справедливу ціну і liquidity.

Рішення: analyzer для trades, item flows, price anomalies, arbitrage opportunities.

Треки: Utility, Technical Implementation.

Demo: item selected -> price history -> warning if trade is bad.

### 3. Survival Route Optimizer

Проблема: players втрачають ресурси через погане планування маршрутів.

Рішення: route planner, який враховує fuel, danger, resources, distance, known events.

Треки: Utility, Creative.

Demo: choose origin/destination, app показує safe route і cost.

### 4. Live World Event Alert Bot

Проблема: важливі зміни в live world пропускаються.

Рішення: alert bot для resource changes, attacks, market movement, player-created events.

Треки: Live Frontier Integration, Utility.

Demo: live event triggers notification.

### 5. Player Contract / Trade Escrow Tool

Проблема: player-to-player deals потребують trust.

Рішення: escrow для trades, resource delivery, service agreements.

Треки: Technical Implementation, Utility.

Demo: player creates deal, counterparty accepts, escrow releases after condition.

Найкращий вибір: **EVE Frontier Intel Terminal**.

## Реюз між хакатонами

### Один core, багато подач

Якщо робити один продукт:

**AI Wallet Safety Copilot**.

База:
- transaction decoder;
- approval scanner;
- risk scoring;
- AI explanations;
- simulation view;
- chain adapters;
- dashboard.

Reskin:
- Mantle: mETH/USDY/RWA risk.
- 0G: privacy + storage/compute + agent memory.
- Arbitrum: Arbitrum/Orbit/Robinhood Chain safety.
- QIE: QIE Wallet/QIE Pass/QIEDEX integration.
- Eazo: consumer finance/life companion.
- Berkeley: AI devtool / tutor.
- Liquify: indexer-powered wallet risk analytics.
- DeepSurge: trade/resource safety terminal.

### Три шаблони

Якщо робити 3 окремі заготовки:

1. **Safety Copilot Template**
   - Wallet safety, tx simulation, approvals, scam/risk.
   - Найкраще: Mantle, Arbitrum, QIE, Eazo, Berkeley.

2. **Onchain Intelligence Template**
   - Indexing, wallet analytics, tax, smart money, anomaly.
   - Найкраще: Liquify, Mantle, QIE, Arbitrum, Berkeley.

3. **Agent Payments Template**
   - x402, paid APIs, agent wallets, billing, subscriptions.
   - Найкраще: 0G, Liquify, QIE, Arbitrum, Mantle.

## Рейтинг шансів

| Ранг | Ідея | Чому сильна |
|---|---|---|
| 1 | AI Wallet Safety Copilot | Ясна проблема, live demo, багато треків, consumer + infra |
| 2 | Agent Payments / x402 API Economy | Дуже актуально для AI agents і paid APIs |
| 3 | Onchain Intelligence Engine | Сильний tech fit, особливо Liquify/Mantle/QIE |
| 4 | Crypto Life OS | Добре для Eazo, але слабше для hard crypto tracks |
| 5 | EVE Frontier Intel Terminal | Сильно для DeepSurge, погано реюзиться |

## Рекомендований фінальний вибір

Будувати: **AI Wallet Safety Copilot**.

Позиціонування:

> An AI safety layer that explains, simulates, and risk-scores wallet actions before users or AI agents sign them.

Українською:

> AI-шар безпеки для гаманців, який пояснює, симулює і оцінює ризик транзакцій до підпису користувачем або AI-агентом.

### Основний demo script

1. Show unsafe approval transaction.
2. Copilot decodes calldata.
3. Copilot explains: "This gives unlimited access to your USDC."
4. Copilot simulates potential asset movement.
5. Copilot shows risk: `Danger`.
6. Copilot suggests limited approval.
7. User signs safer transaction.
8. Dashboard logs protected action.

### Демо для judges

Короткий pitch:

> Crypto UX fails at the most dangerous moment: right before signing. We built an AI copilot that turns raw wallet actions into understandable, simulated, risk-scored decisions.

Що показати:
- реальна decoded transaction;
- risk reasons, не просто score;
- before/after balance simulation;
- chain-specific integration;
- one-click safer alternative.

## Джерела

- Mantle: https://www.competehub.dev/en/competitions/dorahacksmantleturingtesthackathon2026
- 0G APAC: https://www.hackquest.io/hackathons/0G-APAC-Hackathon
- Arbitrum: https://www.hackquest.io/en/hackathons/Arbitrum-Open-House-London-Online-Buildathon
- QIE: https://hackathon.qie.digital/
- Eazo: https://eazo-ai-hackathon.devpost.com/?ref_feature=challenge&ref_medium=discover
- Berkeley AI: https://ai.hackberkeley.org/
- Liquify: https://www.competehub.dev/en/competitions/dorahacksliquify
- DeepSurge: https://www.deepsurge.xyz/evefrontier2026
