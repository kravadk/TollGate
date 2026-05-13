# ARC × AGORA AGENTS HACKATHON — WINNING PLAN
**Хакатон:** Agora Agents · Canteen × Circle × Arc  
**Дати:** 11–25 травня 2026  
**Призовий фонд:** $50K  
**Критерії:** 30% Agentic Sophistication · 30% Traction · 20% Circle tool usage · 20% Innovation

---

## ЧАСТИНА 1: АНАЛІЗ КОНКУРЕНТІВ — МИНУЛІ ХАКАТОНИ

### 1.1 Попередні хакатони Arc (хронологія)

| Назва хакатону | Дата | Учасники | Призи |
|---|---|---|---|
| AI Agents on Arc with USDC | Жовт–Лист 2025 | 2 400+ | $5K USDC + credits |
| Agentic Commerce on Arc | Січень 2026 | 1 200+ / 222 teams | $5.5K USDC + $30K GCP |
| Agentic Economy on Arc | Бер–Квіт 2026 | 2 048 / 602 teams | $6.5K USDC + Featherless credits |
| **Agora Agents (ПОТОЧНИЙ)** | **11–25 Трав 2026** | — | **$50K** |

---

### 1.2 Детальний аналіз переможців

#### AI Agents on Arc (Oct–Nov 2025)

**1-е місце: Tiba — AI Medical Billing Assistant**
- **Ідея:** Автоматизація медичного білінгу через USDC
- **Ключові фічі:** Автоматичне виставлення рахунків, страхові звіти через AI
- **Killer feature:** Реальний домен (медицина) + USDC settlement без посередників
- **Чому виграв:** Вирішує реальну $3.8T проблему; демо з реальними транзакціями

**2-е місце: Arc Pay — "Apple Pay for AI Agents"**
- **Ідея:** Єдиний API для AI агентів робити платежі
- **Ключові фічі:** SDK для будь-якого агента, один рядок коду
- **Killer feature:** Абстракція складності — агент просто "платить"
- **Чому виграв:** Горизонтальна інфраструктура; кожен проект може використати

**3-є місце: SOLRARC — AI-Managed USDC RWA**
- **Ідея:** AI агент, що управляє портфелем реальних активів (RWA) в USDC
- **Ключові фічі:** Автоматичне ребалансування, yield optimization
- **Killer feature:** RWA (private credit) + AI = інституційний yield

---

#### Agentic Commerce on Arc (Jan 2026) — IRL фінал SF

**1-е місце: NewsFacts ($3,000 USDC)**
- **Ідея:** Новинний агент що продає верифіковані факти через Nanopayments
- **Ключові фічі:** Агент шукає, верифікує, монетизує новини в реальному часі
- **Killer feature:** Кожен API-запит = реальна on-chain транзакція (~$0.001)
- **Що використовував:** Arc Nanopayments, x402, Developer Wallets

**2-е місце: AIsaEscrow ($1,500 USDC)**
- **Ідея:** Pay-per-use escrow з AI-валідацією deliverables
- **Ключові фічі:** AI перевіряє роботу → автоматично відпускає USDC
- **Killer feature:** Zero-trust, zero-human escrow
- **Що використовував:** Arc Smart Contracts, EIP-712, OpenAI Vision

**3-є місце: VibeCard ($1,000 USDC)**
- **Ідея:** Viral rewards network, моментальні USDC виплати
- **Ключові фічі:** Соціальна механіка, meme-friendly UX
- **Killer feature:** Viral loop — юзери самі розповсюджують продукт

**Google Track 1st: OmniAgentPay ($20,000 GCP)**
- **Ідея:** Payment infrastructure для будь-яких AI агентів
- **Ключові фічі:** Universal API, multi-model support, автоматичні платежі
- **Killer feature:** Middleware позиція — захоплює весь agent-payment трафік

**Google Track 2nd: Arc Merchant ($10,000 GCP)**
- **Ідея:** Autonomous x402 micropayments для мерчантів
- **Ключові фічі:** Один рядок коду для прийому USDC платежів
- **Killer feature:** Dropshipping-простота для Web3 commerce

---

#### Agentic Economy on Arc (Mar–Apr 2026) — 178 проектів

**Топ проекти з детальним аналізом:**

| Назва | Ідея | Killer Feature | Технологія |
|---|---|---|---|
| **AgentMesh** | A2A payment loop | Sub-cent micropayments без batching | Arc, Circle, Gemini AI |
| **AlphaDrip** | Pay-per-alpha trading signals | 163 settlements за 5 хв. | Circle, Claude, Cloudflare |
| **AgentGuard** | Governance layer для agent payments | 5 детерміністичних шарів до settle | Claude, Gemini, Arc |
| **AlphaLoop** | A2A USDC loop + arb bot | Real production arbitrage bot | Arc, Circle, Claude Code |
| **Sentinel** | Developer-first trust layer for APIs | Per-call reputation на Arc L1 | Arc, Claude, x402 |
| **Gyasss** | Bidirectional Nanopayments oracle | Агенти платять → юзери заробляють | Circle, Arc, x402 |
| **AgentCop** | MLSecOps protocol for A2A | AI аудитує AI за L402 micropayments | Arc testnet, Claude |
| **MEV Shield** | Micropayment-gated mempool AI | Real-time sandwich risk scoring | Circle, Arc, Claude Code |
| **NeuralMarket** | High-speed autonomous task marketplace | Реальний real-time bidding між AI | Claude, Gemini 3 pro |
| **AESTREA** | Nano-payment intelligence market | Платежі за reasoning branches | Circle, Arc |
| **AlphaDrip** | Pay-per-alpha signal | 163 settlements in 5-min demo | Circle, Claude, Cloudflare |
| **Autonomint** | Natural language spending controller | NLP → immutable onchain rules | Arc, Circle Nanopayments |
| **AgentWork** | AI agent marketplace | 5 deployed contracts, 35,000x cheaper | AI Studio, AI/ML API |
| **CareRoute** | Clinical intake routing | Healthcare + per-task payments | Arc, Circle, x402 |
| **Pulse** | Pay-as-you-read | Per-character payment streaming | Arc, Circle, Vercel |
| **SkillBid** | Agent marketplace + competitive bidding | Real-time competitive bid selection | Arc, AI/ML API, Circle |

---

### 1.3 Шаблони переможців — що спільне

```
PATTERN 1: Реальні транзакції > красивий UI
  → 50+ on-chain транзакцій в демо = обов'язкова вимога
  → Judges перевіряють arc scan

PATTERN 2: Вертикальний домен + горизонтальна оплата
  → NewsFacts = новини (вертикаль) + nanopayments (горизонталь)
  → Tiba = медицина (вертикаль) + USDC billing (горизонталь)

PATTERN 3: Autonomous loop, не manual trigger
  → Агент сам приймає рішення
  → Людина тільки спостерігає + approve threshold

PATTERN 4: Killer metric для traction
  → AlphaDrip: "163 settlements за 5 хв"
  → Jarvis: "55 confirmed transactions, 100% success rate"
  → AgentWork: "35,000× дешевше ніж Ethereum"

PATTERN 5: Максимальне використання Circle stack
  → CCTP + Gateway + Nanopayments + Wallets + x402
  → 20% балів = прямий бонус за кожен продукт Circle
```

---

### 1.4 Що НЕ спрацювало у конкурентів

| Помилка | Чому провалилось |
|---|---|
| Тільки UI без реальних транзакцій | Judges перевіряють Arc scan → нуль балів Traction |
| Generic agent marketplace | Занадто схоже на AgentMesh, Axon Layer, AgentWork |
| Один Circle продукт | 20% балів за tooling = треба мінімум 3-4 продукти |
| Відсутність domain knowledge | "Агент що робить щось" ≠ "Агент що вирішує реальну проблему $X млрд" |
| Складний onboarding | VibeCard виграв завдяки вірусному UX, не технічній складності |

---

## ЧАСТИНА 2: ARC ТЕХНІЧНИЙ АНАЛІЗ — ЩО УНІКАЛЬНО

### 2.1 Arc vs конкуруючі L1

| Параметр | Arc | Ethereum | Solana | Base |
|---|---|---|---|---|
| **Gas token** | USDC (стабільний) | ETH (volatile) | SOL (volatile) | ETH (volatile) |
| **Finality** | <1 сек детерміністична | ~12 блоків | ~0.4 сек | ~2 сек |
| **Min fee** | ~$0.01 (фіксований) | $0.50–$50 | $0.0005 | $0.01+ |
| **Nanopayments** | $0.000001 через x402 | Неможливо | Не native | Ні |
| **Agent identity** | ERC-8004 native | Немає стандарту | Немає | Немає |
| **USDC issuer** | Circle (native) | Third-party bridge | Third-party | Circle (native) |
| **Privacy** | Opt-in confidential tx | Публічно | Публічно | Публічно |

### 2.2 Circle Primitives — повний стек

```
PAYMENT LAYER
├── Nanopayments     → $0.000001 min, gasless, batched settlement
├── x402             → HTTP 402 payment protocol, per-request billing
├── CCTP (v2)        → Native USDC bridge до 19+ chains
└── Gateway          → Unified USDC balance cross-chain (<500ms)

WALLET LAYER
├── Developer Controlled → Server-side MPC wallets (agent treasury)
├── User-Controlled      → Embedded wallets (Google/Apple/email login)
└── Modular Wallets      → ERC-4337 smart wallets (passkey, gasless)

SETTLEMENT LAYER
├── Smart Contracts  → Deploy Solidity, templates (ERC-20/721/1155)
├── ERC-8004         → Onchain AI agent identity + reputation
├── ERC-8183         → Job escrow (deliverables → settlement)
└── StableFX         → USDC↔EURC onchain FX trading engine

CROSS-CHAIN LAYER
├── App Kit Bridge   → 10-line crosschain USDC transfer
├── App Kit Swap     → Same-chain token swap
└── Paymaster        → Gas in USDC for any transaction
```

### 2.3 RFBs — відкриті задачі від організаторів

| RFB | Задача | Arc Advantage |
|---|---|---|
| **RFB 01** | Perpetual Futures Trading Agent | Sub-second finality для liquidation prevention |
| **RFB 02** | Prediction Market Trader Intelligence | Nanopayments для Kelly-sized micro-bets |
| **RFB 03** | Prediction Market Verticals | Multi-currency EURC/USDC settlement |
| **RFB 04** | Adaptive Portfolio Manager | Gateway Unified Balance для cross-chain rebalance |
| **RFB 05** | Cross-Platform Arbitrage Agent | CCTP + sub-second finality = winning combo |
| **RFB 06** | Social Trading Intelligence | Onchain strategy attribution via ERC-8004 |

---

## ЧАСТИНА 3: GAP ANALYSIS — ЩО НІХТО НЕ ЗБУДУВАВ

На основі аналізу 200+ проектів і Canteen research (стаття "Unbundling the Prediction Market Stack"):

```
GAP 1: REFERENCE MARKET MAKER VACUUM
  → Polymarket V2 вийшов 28 квітня 2026
  → Стара reference implementation більше не працює
  → Ніхто не збудував V2-aware market maker
  → Хто зробить перший = instant authority status

GAP 2: CHAIN-AGNOSTIC AGENT IDENTITY REGISTRY
  → 3 venues (Polymarket/Hyperliquid/Pump.fun) = 3 різних attribution механізми
  → AI агент мусить підписувати по-різному на кожному
  → Потрібен: Arc-based canonical bytes32 builder code registry
  → Ніхто не збудував cross-venue identity primitive

GAP 3: STRATEGY DEGRADATION DETECTION
  → Всі copytrading проекти = статичні "copy this wallet"
  → Ніхто не робить autonomous kill switch при strategy decay
  → Підхід "Kelly Criterion + drawdown threshold + auto-exit" = відсутній

GAP 4: PAID REASONING TRACES AS PRODUCT
  → Trading-R1 paper (arXiv 2509.11420) показує: reasoning traces = цінний актив
  → Ніхто не монетизує самі reasoning traces агента
  → Агент міг би продавати ЧОМУ він зробив рішення, не тільки рішення

GAP 5: MULTI-VENUE UNIFIED SETTLEMENT ON ARC
  → Агенти торгують на Hyperliquid + Polymarket + spot DEX окремо
  → Profit/loss не агрегований в єдиному USDC балансі на Arc
  → Gateway Unified Balance = ідеальний інструмент, ніхто не використав для trading
```

---

## ЧАСТИНА 4: WINNING PROJECT — "ARCMIND"

### 4.1 Концепція

> **ArcMind** — Autonomous Multi-Strategy Trading Intelligence з соціальним копітрейдингом, що агрегує сигнали з perps + prediction markets + арбітражу, приймає рішення автономно, і дозволяє будь-кому копіювати стратегію в реальному часі — все розраховано через Arc USDC з sub-second finality.

**Одна фраза для pitch:** "ArcMind is the first autonomous trading agent that shows you its reasoning, lets you copy-trade with $1, and kills itself when it starts losing."

### 4.2 Чому це виграє

| Критерій | Вага | Оцінка ArcMind | Чому |
|---|---|---|---|
| Agentic Sophistication | 30% | ★★★★★ | Multi-strategy autonomous loop + reasoning traces + kill switch |
| Traction | 30% | ★★★★★ | Copy-traders = реальні юзери; кожна копітрейд = транзакція |
| Circle tool usage | 20% | ★★★★★ | CCTP + Gateway + Nanopayments + Dev Wallets + ERC-8004/8183 |
| Innovation | 20% | ★★★★★ | Paid reasoning traces + chain-agnostic identity registry |

### 4.3 Архітектура системи

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCMIND ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────┘

INTELLIGENCE LAYER (AI Decision Making)
├── Signal Aggregator
│   ├── Hyperliquid: funding rates, OI, liq levels (free API)
│   ├── Polymarket: market probabilities, volume, orderbook
│   ├── News Sentiment: Paid via x402 Nanopayments ($0.001/query)
│   └── On-chain Analytics: Paid via x402 ($0.005/query)
│
├── Strategy Engine (Claude Sonnet 4.6)
│   ├── RFB01: Perp Futures → long/short/hedge signals
│   ├── RFB02: Prediction Markets → +EV bet detection
│   ├── RFB05: Arbitrage → cross-venue price gap detection
│   └── RFB04: Portfolio → allocation + rebalance decisions
│
├── Risk Manager (deterministic rules)
│   ├── Kelly Criterion position sizing
│   ├── Max drawdown threshold (auto-kill at -15%)
│   └── Strategy degradation detection (Sharpe decay alert)
│
└── Reasoning Export
    ├── Every decision = structured JSON with WHY
    ├── Sold via x402 Nanopayments ($0.01/reasoning trace)
    └── Archived on Arc L1 (ERC-8004 agent history)

SETTLEMENT LAYER (Circle Stack)
├── Arc L1 (primary settlement chain)
│   ├── All PnL settled in native USDC
│   ├── ERC-8004: ArcMind agent identity registered onchain
│   └── ERC-8183: Job contracts for copy-trader agreements
│
├── Circle Gateway (cross-chain aggregation)
│   ├── Hyperliquid profits → CCTP → Arc USDC
│   ├── Polymarket profits → CCTP → Arc USDC
│   └── Unified Balance: single USDC balance for all venues
│
├── Nanopayments (micro-economy)
│   ├── Agent BUYS: news data ($0.001), analytics ($0.005)
│   ├── Agent SELLS: reasoning traces ($0.01), signals ($0.005)
│   └── Copy-traders PAY: performance fee (5% of profits)
│
└── Developer Controlled Wallets
    ├── ArcMind Treasury Wallet (agent capital)
    ├── Per-copy-trader Wallets (isolated positions)
    └── Intelligence Marketplace Wallet (x402 purchases)

SOCIAL LAYER (Traction Engine)
├── Copy-Trading Dashboard
│   ├── Real-time agent decisions with reasoning traces
│   ├── "Follow ArcMind" → stake USDC → agent allocates
│   ├── Performance metrics: PnL, Sharpe, win rate
│   └── Kill switch: if strategy degrades → auto-unwind + refund
│
├── Builder Code Registry (GAP #2 fix)
│   ├── Arc smart contract: canonical bytes32 agent ID
│   ├── Cross-venue: same ID works on Polymarket + Hyperliquid
│   └── Attribution: all trades linked to ArcMind identity
│
└── Intelligence Marketplace
    ├── Buy: verified signal feeds (x402-gated)
    ├── Sell: ArcMind reasoning traces (x402-gated)
    └── Rating: per-signal accuracy score (on-chain reputation)
```

### 4.4 Технічний стек

```
FRONTEND
├── React/TypeScript (існуючий проект)
├── Real-time dashboard (WebSocket updates)
├── Reasoning trace viewer (formatted JSON → human-readable)
└── Copy-trade flow (connect wallet → stake USDC → follow agent)

BACKEND (Node.js)
├── Agent Loop (runs every 30 seconds)
│   ├── Fetch signals (Hyperliquid API, Polymarket API)
│   ├── Call Claude API (strategy decision)
│   ├── Execute trade (if confidence > threshold)
│   └── Record decision on Arc (ERC-8004 history)
│
├── x402 Server (intelligence marketplace)
│   ├── GET /signals/:id → returns signal (needs payment)
│   ├── GET /reasoning/:id → returns trace (needs payment)
│   └── POST /subscribe → copy-trader registration
│
└── Circle Integration
    ├── Developer Controlled Wallets API
    ├── Gateway Unified Balance API
    └── CCTP transfer triggers

SMART CONTRACTS (Solidity on Arc testnet)
├── ArcMindRegistry.sol (ERC-8004 compliant)
│   ├── registerAgent(bytes32 builderId, string metadata)
│   ├── recordDecision(bytes32 agentId, bytes decisionHash)
│   └── getReputation(bytes32 agentId) → score
│
├── CopyTradeEscrow.sol (ERC-8183 compliant)
│   ├── stake(uint256 amount) → allocates to agent
│   ├── settle(uint256 pnl) → distributes profits/losses
│   └── killSwitch() → emergency unwind + refund
│
└── IntelligenceMarketplace.sol
    ├── listSignal(bytes32 id, uint256 price)
    ├── purchaseSignal(bytes32 id) → via Nanopayments
    └── rateSignal(bytes32 id, uint8 accuracy)
```

### 4.5 Фази розробки (12 днів, 13–25 травня)

```
ДНІ 1–3: CORE AGENT LOOP
  [ ] Arc CLI setup + testnet USDC faucet
  [ ] Інтеграція Hyperliquid API (безкоштовний, публічний)
  [ ] Інтеграція Polymarket API (публічний)
  [ ] Claude API → structured trading decisions (JSON output)
  [ ] Developer Controlled Wallet для agent treasury
  Goal: Агент робить перші 10 реальних рішень

ДНІ 4–6: SETTLEMENT LAYER
  [ ] ArcMindRegistry.sol → деплой на Arc testnet
  [ ] CopyTradeEscrow.sol → деплой на Arc testnet
  [ ] Gateway Unified Balance integration
  [ ] CCTP: cross-chain profit consolidation demo
  Goal: 50+ on-chain транзакцій видимі на testnet.arcscan.app

ДНІ 7–9: INTELLIGENCE MARKETPLACE + x402
  [ ] x402 server для /signals + /reasoning endpoints
  [ ] Nanopayments: agent купує data feeds ($0.001)
  [ ] IntelligenceMarketplace.sol деплой
  [ ] Builder Code Registry (bytes32 canonical ID)
  Goal: Агент купує і продає intelligence autonomously

ДНІ 10–11: SOCIAL LAYER (TRACTION)
  [ ] Copy-trade dashboard UI (existing React project)
  [ ] "Follow ArcMind" flow (connect wallet → stake → follow)
  [ ] Real-time reasoning trace viewer
  [ ] Kill switch UI + auto-unwind logic
  Goal: 5+ real copy-traders onboarded

ДЕНЬ 12: DEMO + SUBMISSION
  [ ] Demo video (5 хв): agent loop → trade → settlement → copy-trade
  [ ] GitHub repo public + README
  [ ] Traction metrics screenshots (arcscan.app)
  [ ] Submission на agora.thecanteenapp.com
```

### 4.6 Killer metrics для Traction (30% балів)

```
ЦІЛЬОВІ ПОКАЗНИКИ ЗА 2 ТИЖНІ:
├── 500+ on-chain transactions (testnet.arcscan.app proof)
├── 10+ copy-traders (Discord outreach + friends)
├── $500+ USDC total volume (testnet USDC безкоштовно)
├── 100+ reasoning traces sold via x402 Nanopayments
└── 5+ intelligence signals purchased autonomously by agent

ЯК ДОСЯГТИ:
├── Arc CLI автоматично відстежує traction
├── Agent loop кожні 30 сек = 2,880 loops/день
├── Кожен loop = мінімум 1 transaction (recordDecision)
├── Додати leaderboard: "Top Copy Traders" на dashboard
└── Discord post: "Copy ArcMind in 60 seconds" tutorial
```

### 4.7 Circle Tool Usage Checklist (20% балів)

```
ОБОВ'ЯЗКОВІ (базові 15%):
├── Developer Controlled Wallets (agent treasury)
├── Arc USDC (native settlement)
├── Nanopayments (intelligence marketplace)
└── x402 (per-request API billing)

ДОДАТКОВІ БАЛИ (повні 20%):
├── CCTP v2 (cross-chain profit consolidation)
├── Gateway Unified Balance (multi-venue aggregation)
├── ERC-8004 (agent identity registry)
├── ERC-8183 (copy-trade escrow)
└── Modular Wallets (copy-trader passkey onboarding)
```

---

## ЧАСТИНА 5: ДИФЕРЕНЦІАТОРИ від КОНКУРЕНТІВ

### 5.1 Чим ArcMind краще за кожного попереднього переможця

| Проект | Їх сила | ArcMind робить краще |
|---|---|---|
| **NewsFacts** | Nanopayments для новин | + також торгує на основі новин autonomous |
| **AlphaDrip** | Pay-per-alpha signals | + reasoning traces (WHY) + kill switch |
| **OmniAgentPay** | Universal payment infra | + спеціалізований trading intelligence |
| **SOLRARC** | AI RWA portfolio | + перпетуальні ф'ючерси + prediction markets |
| **AlphaLoop** | A2A USDC loop + arb bot | + social copy-trading + full Circle stack |
| **AgentGuard** | Security layer | + native risk management всередині агента |

### 5.2 Нові концепти яких не було раніше

```
НОВЕ #1: CHAIN-AGNOSTIC BUILDER CODE REGISTRY
  → Arc L1 smart contract видає canonical bytes32 agent ID
  → Той самий ID підходить для Polymarket, Hyperliquid, Pump.fun
  → Перший cross-venue attribution primitive

НОВЕ #2: PAID REASONING TRACES MARKETPLACE
  → Агент продає ЧОМУ він прийняв рішення, не тільки рішення
  → $0.01/trace через Nanopayments
  → Reasoning як продукт = перший такий usecase на Arc

НОВЕ #3: AUTONOMOUS STRATEGY DEGRADATION KILL SWITCH
  → Sharpe ratio decay detection
  → Auto-unwind всіх copytrader positions при деградації
  → Повернення USDC через CopyTradeEscrow.sol

НОВЕ #4: UNIFIED MULTI-VENUE SETTLEMENT ON ARC
  → Hyperliquid PnL + Polymarket PnL + Arb PnL
  → Все агрегується через Gateway Unified Balance
  → Single USDC balance на Arc для всього
```

---

## ЧАСТИНА 6: PITCH FRAMEWORK

### 6.1 One-liner

> "ArcMind is the first autonomous trading agent that shows you its reasoning, lets you copy-trade with $1, and kills itself when it starts losing — all settled in USDC on Arc."

### 6.2 Problem → Solution

**Проблема:** Традиційні trading боти — чорні ящики. Ти не знаєш чому вони прийняли рішення. Не можеш копіювати з малим капіталом. Коли починають втрачати — дізнаєшся запізно. Кожен venue = окремий wallet, окремий PnL.

**ArcMind вирішує 4 проблеми:**
1. **Transparency** → Reasoning traces на продаж ($0.01/trace via Nanopayments)
2. **Accessibility** → Copy-trade з $1 USDC через ERC-8183 escrow
3. **Risk Management** → Autonomous kill switch при drawdown > 15%
4. **Unified Settlement** → Всі venues → Gateway → єдиний Arc USDC баланс

### 6.3 Demo Script (5 хвилин)

```
00:00–01:00  Покажи agent loop живий: "Агент прийняв рішення кожні 30 секунд"
01:00–02:00  arcscan.app: "500+ transactions, всі мої, всі реальні"
02:00–03:00  Reasoning trace купити: "Заплатив $0.01 → отримав ЧОМУ агент купив BTC"
03:00–04:00  Copy-trade: "Поставив $10 USDC → агент автоматично розподілив"
04:00–05:00  Kill switch demo: "Drawdown -16% → агент сам закрив позиції → повернув USDC"
```

---

## ЧАСТИНА 7: ПОСИЛАННЯ ТА РЕСУРСИ

### 7.1 Документація

| Ресурс | URL |
|---|---|
| Arc Docs | https://docs.arc.network/ |
| Circle Developer Docs | https://developers.circle.com/ |
| Arc Node / Canteen Docs | https://arc-node.thecanteenapp.com/ |
| Arc CLI (GitHub) | https://github.com/the-canteen-dev/ARC-cli |
| Agora Hackathon | https://agora.thecanteenapp.com/ |
| Arc Community | https://community.arc.network/ |
| Arc Testnet Explorer | https://testnet.arcscan.app |
| Arc Testnet RPC | https://rpc.testnet.arc-node.thecanteenapp.com/v1/{key} |
| Arc Chain ID | 5042002 |

### 7.2 Sample Repos (відправна точка)

| Repo | Що використати |
|---|---|
| arc-escrow | CopyTradeEscrow.sol pattern + EIP-712 signing |
| arc-multichain-wallet | Gateway Unified Balance integration |
| arc-p2p-payments | Modular Wallets для copy-trader onboarding |
| arc-commerce | Developer Controlled Wallets pattern |

### 7.3 Data Sources для Agent

| API | Використання | Ціна |
|---|---|---|
| Hyperliquid | Funding rates, positions, historical | Безкоштовно |
| Polymarket | Market probabilities, orderbook | Безкоштовно |
| Nansen HL Leaderboard | Top trader analytics | API key |
| Claude API (Sonnet 4.6) | Trading decisions + reasoning JSON | ~$3/1M tokens |

### 7.4 Research References

| Назва | URL |
|---|---|
| Trading-R1 Paper | https://arxiv.org/abs/2509.11420 |
| TradingAgents GitHub | https://github.com/TauricResearch/TradingAgents |
| Polymarket Builder Codes | https://docs.polymarket.com/trading/clients/builder |
| Hyperliquid Historical Data | https://hyperliquid.gitbook.io/hyperliquid-docs/historical-data |
| Canteen PM Stack Analysis | https://thecanteenapp.com/analysis/2026/05/01/unbundling-the-prediction-market-stack.html |

---

## ЧАСТИНА 8: РИЗИКИ І МИТИГАЦІЯ

| Ризик | Ймовірність | Митигація |
|---|---|---|
| Arc testnet нестабільний | Середня | Localnet fallback + retry logic |
| Реальні trades неможливі (testnet) | Висока | Paper trading + показуй logic + cost comparison |
| Мало copy-traders | Висока | Сам створи 5 test accounts; Discord outreach день 10 |
| Claude API latency > 30s | Низька | Async loop; display "thinking..." state |
| Недостатньо transactions | Середня | Agent loop кожні 30 сек = 2,880/день автоматично |

---

## ВИСНОВОК

**ArcMind** закриває 5 критичних ринкових пробілів, використовує повний стек Circle (9 продуктів), і будує вірусний traction через copy-trading механіку. Жоден з 200+ попередніх проектів не поєднав ці елементи.

**Перший крок:**
```bash
npm install -g @canteen/arc-cli
arc login
arc context sync
arc rpc eth_chainId
```

---
*Останнє оновлення: 2026-05-13 | Аналіз: 200+ проектів, 4 хакатони, всі Circle/Arc docs*
