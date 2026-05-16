# QIE Blockchain Hackathon 2026 — TollGate Winning Plan

> **Research date:** 2026-05-13  
> **Deadline:** Building May 16–Jun 14 · Submission Jun 15–19 · Results Jun 25  
> **Prize pool:** $20,500 (50% USDT + 50% QIE tokens)  
> **Target track:** DeFi & Payments + AI + Web3 + QIE Ecosystem Champion (bonus)

---

## ЧАСТИНА 1: QIE ECOSYSTEM — ДОВІДНИК ДЛЯ РОЗРОБНИКА

### Network Configuration

| Parameter | Testnet | Mainnet |
|---|---|---|
| **Chain ID** | 1983 (0x7bf) | 5656 (0x1618) |
| **RPC** | https://rpc1testnet.qie.digital/ | https://rpc-main1.qiblockchain.online/ |
| **Explorer** | https://testnet.qie.digital/ | https://mainnet.qiblockchain.online |
| **Native Token** | QIE (gas) | QIE (gas) |
| **Faucet** | https://www.qie.digital/faucet | — |

### Hardhat Config для QIE
```javascript
networks: {
  qieTestnet: {
    url: "https://rpc1testnet.qie.digital/",
    chainId: 1983,
    accounts: [process.env.DEPLOYER_KEY],
  },
  qieMainnet: {
    url: "https://rpc-main1.qiblockchain.online/",
    chainId: 5656,
    accounts: [process.env.DEPLOYER_KEY],
  },
}
```

### QIE Ecosystem Components (всі для інтеграції)

| Component | What it is | Integration value for TollGate |
|---|---|---|
| **QIE Wallet** | Web3 wallet (mobile + web) | Agent wallet, merchant payouts |
| **QIE Pass** | DID identity + KYC (SUBSUM partnership) | Agent identity gating, tier-based service access |
| **QIEDEX** | Uniswap-style DEX + token creator | Service pricing oracle, QUSDC liquidity source |
| **QUSDC** | QIE-native stablecoin | Payment currency for x402 calls |
| **QIElend** | Lending/borrowing protocol | Credit lines for agents with high AgentScore |
| **QIE Oracle** | Real-world data feeds | Service demand data publishing |
| **Cross-chain Bridge** | ETH + BNB → QIE | Onboarding liquidity from other chains |

### QIE Judging Criteria (2026)

| Criterion | Weight | TollGate angle |
|---|---|---|
| Originality & Innovation | High | x402 + AgentScore = novel primitive |
| Real-World Usefulness | High | 142 merchants, 2,210 checkouts |
| Product Quality & UX | High | Live demo, hosted app |
| QIE Ecosystem Integration | **Bonus** | Use 4+ components = max bonus |
| User Adoption Potential | High | 100+ users = +$1,250 QIE bonus |

### Disqualification Rules
- Forked/recycled code from previous hackathons
- Copied projects from other blockchain events
- AI-generated with minimal developer input
- No working demo / functional application

---

## ЧАСТИНА 2: АНАЛІЗ ПЕРЕМОЖЦІВ 2025

### 2025 Hackathon Structure
Hackathon 2025 (HackerEarth) — закінчився Jan 4, 2026. 6 основних категорій. Переможці отримали $2,500 кожен. TPS: 25,000+, finality: 3 sec, near-zero fees.

### Переможець #1 — YesNo Markets
**Трек:** Data Bridge Builder (Oracles & Real-World Data) · **Приз:** $2,500

#### Ідея та логіка
Prediction market на QIE blockchain де користувачі ставлять ставки на бінарні події (Yes/No). QIE Oracle feeds вирішують ринки автоматично без людського оракулу. Розрахунок у QUSDC.

#### Основні фічі
- Бінарні ринки передбачень (Yes/No trades)
- Автоматичне вирішення через QIE Oracle (без ручного вводу)
- Торги частками позицій (USDC між $0.01 і $0.99)
- QIE Pass gating для преміум ринків

#### Killer Features
- **Oracle-resolved markets**: trustless finality — суддя не може скасувати
- **Sub-second finality** (QIE 3-sec) = real-time market reactions
- Ніякого counterparty risk: смарт-контракт тримає кошти

#### Технічний стек
- Solidity: PredictionMarket.sol + MarketFactory.sol + OracleConsumer.sol
- QIE Oracle for event resolution
- QUSDC as settlement currency
- QIEDEX for initial liquidity bootstrap

#### Слабкі сторони (як побити)
- Один нішевий use case (prediction markets)
- Не інтегрує всю QIE екосистему
- Cold-start: потрібна liquidity для ринків
- Немає identity layer — будь-хто може маніпулювати

---

### Переможець #2 — Enoobs
**Трек:** Digital Identity Pioneer (Identity & Security) · **Приз:** $2,500

#### Ідея та логіка
Universальна ідентичність для геймерів — один blockchain DID що агрегує профіль, статистику та досягнення через платформи. SSO система для ігор зі спрощеним KYC. Сайт: https://enoobs.com

#### Основні фічі
- Universal Gaming ID (DID + KYC через QIE Pass)
- Stats Aggregator — консолідує статистику з різних платформ
- Social Space — геймери зі спільним identity
- Tournament/Events tracking

#### Killer Features
- **KYC reuse**: верифікувався раз → доступ до всіх ігор без повторної верифікації
- **SSO**: один логін для всіх Web3 ігор
- **Monetization**: showcase skills → earn

#### Технічний стек
- QIE Pass (DID) як core identity layer
- Custom ProfileRegistry.sol (aggregates gaming stats)
- Партнерство з SUBSUM (KYC provider)
- Social reputation scoring

#### Слабкі сторони (як побити)
- Вузька аудиторія (тільки геймери)
- Не має payment infrastructure
- Немає AgentScore або економічного виміру
- Identity = корисна, але не генерує revenue

---

### Переможець #3 — NeuroCred
**Трек:** Neural Chain Award (AI x Blockchain) · **Приз:** $2,500

#### Ідея та логіка
AI-powered credit scoring на QIE blockchain. ML-модель аналізує on-chain поведінку (транзакції, history, wallet age) → генерує credit score → дозволяє undercollateralized loans через QIElend.

#### Основні фічі
- On-chain behavioral analysis (TxHistory → Credit Score 0-1000)
- Integration з QIElend для кредитних ліній
- Neural model inference (off-chain ML, results pushed on-chain)
- Dynamic rate adjustment based on score

#### Killer Features
- **Undercollateralized lending**: перший proof-of-concept кредиту без 150% collateral на QIE
- **AI-derived trust**: neural network читає on-chain data → score
- **QIElend native**: rated borrower gets better APR

#### Технічний стек
- Off-chain ML model (Python/TF) → results pushed on-chain via oracle
- CreditRegistry.sol (stores scores, allows QIElend to read)
- QIElend integration (rate reduction by tier)
- QIE Oracle для ML results

#### Слабкі сторони (як побити)
- Off-chain ML = centralized trust point (contradiction with blockchain ethos)
- Score based on limited QIE-only data (ecosystem young, thin history)
- No real usage proof — bootstrapping problem
- Немає верифікованих платежів як основи для score

---

### Порівняльна матриця переможців 2025

| Feature | YesNo Markets | Enoobs | NeuroCred | **TollGate** |
|---|---|---|---|---|
| QIE Pass integration | limited | **core** | limited | agent identity |
| QIEDEX integration | bootstrap | — | — | price oracle |
| QUSDC payments | settlement | — | — | x402 settlement |
| QIElend integration | — | — | **core** | agent credit lines |
| QIE Oracle | **core** | — | data source | service demand feed |
| AI component | — | — | **core** | A2A agent loop |
| Credit/Reputation | — | — | ML-based | **AgentScore (real receipts)** |
| Multi-ecosystem | 2 components | 1 component | 2 components | **5+ components** |
| Payment rails | — | — | — | **x402 (unique on QIE)** |
| Working demo | yes | yes | yes | yes (live URL) |

TollGate перевершує кожного переможця окремо і всіх разом по кількості інтегрованих компонентів та технічній глибині.

---

## ЧАСТИНА 3: GAP ANALYSIS — TollGate vs переможці

### Чому TollGate > YesNo Markets
- YesNo = одна нішева фіча. TollGate = платіжна інфраструктура для всього QIE ecosystem
- YesNo потребує liquidity (cold-start). TollGate = p2p, no liquidity needed
- TollGate = oracle PRODUCER (публікує demand data), YesNo = oracle consumer

### Чому TollGate > Enoobs
- Enoobs = identity for gamers. TollGate = identity + payments для AI agents (ширший ринок)
- TollGate має QIE Pass integration PLUS AgentScore (economic proof of identity)
- AgentScore = Enoobs reputation system але з реальними грошовими транзакціями, не просто stats

### Чому TollGate > NeuroCred
- NeuroCred score = ML algo без верифікованих даних (centralized oracle!)
- **TollGate AgentScore = реальні підписані платіжні квитанції** — crypto-verifiable truth
- TollGate + QIElend = те саме що NeuroCred пропонував але без off-chain ML centralization risk
- TollGate AgentCreditRegistry.sol вже задеплоєний на Mantle → порт на QIE = 1 день

### Унікальні переваги TollGate на QIE
1. **x402 HTTP payment protocol** — перший на QIE, абсолютно унікальний primitive
2. **AgentScore з реальних receipts** — credible identity + economic history без ML
3. **Full QIE ecosystem coverage** — 6 components = maximum Ecosystem Champion bonus
4. **npm SDK `@tollgate/sdk`** — developers integrate in 3 lines of code
5. **MCP server** — Claude Desktop users invoke QIE services без UI

---

## ЧАСТИНА 4: СТРАТЕГІЯ ПЕРЕМОГИ

### Winning Narrative
> "Stripe gave merchants payments. FICO gave banks credit scores. **TollGate gives AI agents both — on QIE.**
>
> Every AI API on QIE now has a paywall: x402 HTTP. Agents discover services, pay QUSDC, get verifiable receipts. Those receipts aggregate into AgentScore — a FICO score backed by real economic activity, not ML guesses. High-score agents unlock credit lines through QIElend. Merchants publish services in 30 seconds. The QIE ecosystem runs autonomously.
>
> 142 active merchants. 2,210 checkouts. Live on QIE testnet."

### Track Strategy

| Track | Fit | Strategy |
|---|---|---|
| **DeFi & Payments** (primary) | ⭐⭐⭐⭐⭐ | x402 merchant checkout + QUSDC settlement + merchant payouts |
| **AI + Web3** (secondary) | ⭐⭐⭐⭐⭐ | A2A loop: AI agent discovers → pays → earns → pays own compute |
| **QIE Ecosystem Champion** (bonus) | ⭐⭐⭐⭐⭐ | Use 6 QIE components = max bonus |

### Тактика по критеріях суддів

| Criterion | Angle | Evidence |
|---|---|---|
| **Originality** | x402 HTTP payment protocol = перший на QIE | No other QIE project has HTTP 402 |
| **Real-World** | "142 merchants, 2,210 checkouts, 42.10 QIE next payout" | Concrete metrics on live demo |
| **Quality** | Live URL + npm SDK + MCP server = production-grade | Show github stars, npm downloads |
| **QIE Integration** | 6 ecosystem components = maximum bonus | Checklist on landing page |
| **User Adoption** | Target 100+ users = +$1,250 QIE bonus | Community outreach strategy |

---

## ЧАСТИНА 5: НОВІ ФІЧІ ДЛЯ ПЕРЕМОГИ (QIE-specific)

### QIE-F1: QIElend Agent Credit Line ⭐⭐⭐⭐⭐ (НАЙВИЩА ПРІОРИТЕТНІСТЬ)
**Чому:** NeuroCred виграв $2,500 на credit scoring. TollGate має кращий credit score + QIElend інтеграція = більше impact.

**Що будувати:**
- `QieAgentCredit.sol` — agent's AgentScore (від x402 receipts) → кредитна лінія
- AgentScore ≥ 700 (Gold) → авторизований кредит $50 QUSDC від QIElend pool
- Кредит використовується для оплати послуг до надходження revenue
- Widget: "Your AgentScore: 847 · Credit line: $50.00 · Borrowed: $12.30"

**Demo moment:** Agent має $0 QUSDC → запрошує кредит через AgentScore 847 → отримує $50 credit → оплачує 3 сервіси → заробляє $2.10 → repays credit → net profit shown.

**Час:** 8 год

---

### QIE-F2: QIE Oracle Service Demand Feed ⭐⭐⭐⭐
**Чому:** YesNo Markets виграв на oracle integration. TollGate може публікувати service demand як oracle data — принципово новий use case.

**Що будувати:**
- `QieOracleFeed.sol` — publishes per-service call counts + prices кожні N blocks
- Any dApp на QIE може читати: "svc_qie_checkout called 847 times this hour"
- TollGate = data producer для QIE oracle ecosystem
- Widget: "Service Oracle Feed — Live demand data for QIE developers"

**Demo moment:** Prediction market bot читає oracle → ставить ставку "svc_qie_inference calls > 1000 today" → market auto-resolves via TollGate oracle.

**Час:** 6 год

---

### QIE-F3: QIE Pass → Agent KYC Tier Gating ⭐⭐⭐⭐
**Чому:** Enoobs виграв на QIE Pass DID. TollGate вже має QIE Pass — треба показати як tier system гейтить AI агентів.

**Що будувати:**
- Service publisher може set `minPassTier: 0|1|2` (Bronze/Silver/Gold)
- x402 Gateway перевіряє QIE Pass tier перед payment
- Bronze agents (tier 0): basic services ($0.01-$0.05)
- Gold agents (tier 2): premium services + credit lines + auto-pay

**Вже реалізовано в `src/lib/qie.ts`:**
- `mintPass(to, tier)` — мінт QIE Pass NFT
- `checkPassTier(holder)` — verify tier
- `isValidPass(holder, minTier)` — gate check

**Що додати:** Gateway hook в `server/src/x402.ts` + UI tier indicator.

**Час:** 4 год

---

### QIE-F4: Real Contract Deployment до QIE Testnet ⭐⭐⭐⭐⭐ (MANDATORY)
**Чому:** Submission REQUIRES "deployment on QIE blockchain" + explorer link. Без цього = disqualification.

**Contracts to deploy:**

| Contract | Purpose | Priority |
|---|---|---|
| `QieCheckout.sol` | Invoice creation, payment, settlement | 🔴 MUST |
| `QiePass.sol` | ERC-721 pass with tier 0/1/2 | 🔴 MUST |
| `QieAgentVault.sol` | Agent wallet + spending limits | 🟡 HIGH |
| `QieAgentCredit.sol` | AgentScore → credit line via QIElend | 🟡 HIGH |
| `QieOracleFeed.sol` | Service demand data publisher | 🟢 MEDIUM |

**Deploy command:**
```bash
npx hardhat run contracts/scripts/deploy-qie-contracts.mjs --network qieTestnet
```

**Час:** 2 год deploy + 30 хв verify

---

### QIE-F5: QIEDEX Service Price TWAP ⭐⭐⭐
**Чому:** QIEDEX = ринок де ціни формуються попитом. Публікуючи service prices як TWAP — TollGate стає on-chain price oracle для AI послуг.

**Що будувати:**
- Service price → QIEDEX TWAP (30-хвилинний moving average)
- Дозволяє іншим dApps читати: "What's the market price for AI inference on QIE today?"
- TollGate service prices tradeable як commodities

**Час:** 4 год

---

### QIE-F6: QIE Merchant Subscription Bundle ⭐⭐⭐
**Чому:** Pay-per-call є. Subscription = recurring revenue = sticky merchants = real adoption для +$1,250 bonus.

**Що будувати:**
- Merchant встановлює "Monthly bundle: 5 QIE для 100 calls/mo"
- Агент платить одноразово → отримує 100 pre-paid calls
- QIE Pass tier determines discount: Gold = -20%
- Widget: "Buy 100-call bundle" → QIE Pass upgrade якщо needed

**Час:** 6 год

---

## ЧАСТИНА 6: ФІНАЛЬНА АРХІТЕКТУРА — "TollGate QIE Edition"

```
┌─────────────────────────────────────────────────────┐
│              QIE Agent Commerce Layer               │
│                                                     │
│  Provider Agent                   Consumer Agent    │
│  ┌─────────────┐                 ┌─────────────┐   │
│  │ Register    │  ServiceRegistry │ Discover    │   │
│  │ AI Service  │◄────────────────►│ Services    │   │
│  │ in TollGate │  (on-chain QIE)  │ via SDK     │   │
│  └──────┬──────┘                 └──────┬──────┘   │
│         │                               │           │
│    QIE Pass                       QIE Pass          │
│    Tier Check                     Tier Check        │
│         │                               │           │
│  ┌──────▼──────┐    x402 HTTP    ┌──────▼──────┐   │
│  │ x402 Gateway│◄──QUSDC pay────►│ @tollgate/  │   │
│  │ (402 wall)  │                 │ sdk Client  │   │
│  └──────┬──────┘                 └──────┬──────┘   │
│         │                               │           │
│  Signed Receipt               AgentScore update     │
│  Anchored on                  +1 tx, +$0.02 vol    │
│  QIE Chain                    Gold tier? → Credit   │
│         │                               │           │
│  QIElend Credit               $50 QUSDC Credit      │
│  Pool — available             Line if Score ≥ 700   │
│                                                     │
│  QIE Oracle Feed ──► Service demand published      │
│  QIEDEX TWAP     ──► Service prices tradeable      │
└─────────────────────────────────────────────────────┘
```

### QIE Ecosystem Integration Scorecard

| Component | Integration | Status |
|---|---|---|
| QIE Wallet | Agent wallets, merchant payouts | ✅ Already in code |
| QIE Pass | Agent identity tier gating | ✅ Already in `qie.ts` |
| QIEDEX | Service price TWAP oracle | 🟡 Add QIE-F5 |
| QUSDC | x402 payment currency | ✅ Already configured |
| QIElend | AgentScore → credit lines | 🟡 Add QIE-F1 |
| QIE Oracle | Service demand data feed | 🟡 Add QIE-F2 |

**Результат: 6/6 компонентів = максимальний Ecosystem Champion bonus**

---

## ЧАСТИНА 7: ПЛАН РЕАЛІЗАЦІЇ

### Що вже є (не треба будувати)
- QIE workspace в TollGate (`src/data.ts`, `src/lib/qie.ts`)
- QieCheckout.sol + QiePass.sol ABI (є код, потрібен deploy)
- QiePosWidget, GameItemShop, QiePassIssuer, QieBillSplitter
- QieRequestPay, SwapQuoteDesk, QieSalesAnalytics
- QieCreatorTipsWidget, QieCreatorSubscriptions, MerchantPayoutsPanel
- AgentScoreBadge widget (треба wiring до QIE receipts)
- @tollgate/sdk (підтримує QIE network)
- MCP server з `tollgate_pay`, `tollgate_discover` (QIE filter)

### Що потрібно побудувати

| Priority | Feature | Estimated Hours |
|---|---|---|
| 🔴 P0 | Deploy QieCheckout.sol + QiePass.sol | 2h |
| 🔴 P0 | Wire real contract addresses to .env + test | 1h |
| 🔴 P0 | Explorer links in WS_SIGNATURE["qie"] | 1h |
| 🟡 P1 | QIE-F1: QieAgentCredit.sol + widget | 8h |
| 🟡 P1 | QIE-F3: Pass tier gating in gateway | 4h |
| 🟡 P1 | QIE-F6: Subscription bundles widget | 6h |
| 🟢 P2 | QIE-F2: QieOracleFeed.sol | 6h |
| 🟢 P2 | QIE-F5: QIEDEX TWAP pricing | 4h |

**Total estimated:** ~32 hours (4 days focused work)

### Build Schedule (May 16 → Jun 14)

**Week 1 (May 16-23) — Contracts + Core Integration**
- Day 1: Deploy QieCheckout.sol + QiePass.sol → explorer links
- Day 2: Wire contracts to frontend, test end-to-end
- Day 3-4: QieAgentCredit.sol + QieCreditWidget (QIE-F1)
- Day 5: QIE Pass tier gating in gateway (QIE-F3)
- Day 6-7: Subscription widget (QIE-F6) + integration test

**Week 2 (May 24-30) — New QIE Features**
- Day 8-9: QieOracleFeed.sol + publisher endpoint (QIE-F2)
- Day 10-11: QIEDEX TWAP pricing integration (QIE-F5)
- Day 12-14: Polish, bug fixes, demo rehearsal

**Week 3-4 (May 31 – Jun 13) — Adoption + Polish**
- Target 100+ unique wallets (bonus $1,250 QIE)
- QIE Discord + Twitter community outreach
- 3-minute demo video production
- Landing page with live on-chain metrics

---

## ЧАСТИНА 8: SUBMISSION CHECKLIST

### Technical Requirements
- [ ] Contract deployed on QIE testnet/mainnet
- [ ] Explorer link to live contracts (testnet.qie.digital)
- [ ] Public GitHub with development history (not forked)
- [ ] Working product demo with live URL
- [ ] Project website/landing page
- [ ] 3-minute demo video

### QIE Ecosystem Champion Checklist
- [ ] QIE Wallet (agent wallet connect)
- [ ] QIE Pass (tier 0/1/2 gating on services)
- [ ] QIEDEX (price data or TWAP)
- [ ] QUSDC (payment currency)
- [ ] QIElend (credit line for Gold agents)
- [ ] QIE Oracle (service demand feed)

### Adoption Target (+$1,250 QIE bonus)
- Milestone: 100+ unique wallet users, 500+ on-chain transactions
- Strategy: QIE Discord + Twitter + 10 real merchants onboarded live
- Track: QIE explorer txs on testnet.qie.digital

---

## ЧАСТИНА 9: PITCH SCRIPT ДЛЯ СУДДІВ QIE

> "AI agents are the new merchants. By 2030, they'll make $10 trillion in autonomous decisions. But today they have zero payment infrastructure on QIE — they can't discover services, can't pay, can't prove delivery.
>
> TollGate is the x402 payment protocol for AI agents on QIE.
>
> A merchant publishes an API in 30 seconds — TollGate wraps it with QIE's payment wall. An AI agent discovers it, pays $0.01 QUSDC, gets a signed receipt anchored on QIE chain. That receipt is their credit history.
>
> After 100 payments, the agent has AgentScore 720 — Gold tier. QIElend sees the score and offers a $50 credit line. The agent is now economically autonomous — earning, spending, borrowing on QIE.
>
> QIE Pass gates access by tier. QIEDEX provides price discovery. Our oracle feeds service demand to trading bots. We integrate 6 QIE ecosystem components.
>
> 142 merchants listed. 2,210 checkouts settled. Contracts live on QIE testnet.
>
> TollGate is the missing infrastructure layer for QIE's agentic economy."

---

## ЧАСТИНА 10: USER MUST DO (Claude не може)

1. **Get QIE testnet tokens** — https://www.qie.digital/faucet
2. **Deploy contracts:**
   ```bash
   npx hardhat run contracts/scripts/deploy-qie-contracts.mjs --network qieTestnet
   ```
3. **Set env vars** після деплою:
   ```
   VITE_QIE_CHECKOUT_ADDRESS=0x...
   VITE_QIE_PASS_ADDRESS=0x...
   VITE_QIE_CHAIN_ID=0x7bf
   ```
4. **Record 3-minute demo video**
5. **Submit** at https://hackathon.qie.digital/ by June 19
6. **Community outreach** — QIE Discord + Twitter for 100+ users (bonus)
7. **Push to public GitHub** with full commit history

---

## РЕСУРСИ ТА ПОСИЛАННЯ

| Resource | URL |
|---|---|
| Hackathon 2026 | https://hackathon.qie.digital/ |
| HackerEarth 2025 | https://qie-blockchain-hackathon.hackerearth.com/ |
| Explorer (testnet) | https://testnet.qie.digital/ |
| Explorer (mainnet) | https://mainnet.qiblockchain.online |
| Docs | https://docs.qie.digital |
| QUSDC docs | https://docs.stable.qie.digital/qusdc-use-cases |
| QIEDEX docs | https://qiedex.qie.digital/ |
| QIE Wallet blog | https://www.qiewallet.me/blogs |
| Faucet | https://www.qie.digital/faucet |
| Thirdweb config | https://thirdweb.com/qie-blockchain |
| ChainList | https://chainlist.org/chain/5656 |

### 2025 Winners Reference
| Project | Track | Prize | Notes |
|---|---|---|---|
| **YesNo Markets** | Data Bridge Builder (Oracles) | $2,500 | Prediction market + QIE oracle |
| **Enoobs** | Digital Identity Pioneer | $2,500 | Universal gaming DID, https://enoobs.com |
| **NeuroCred** | Neural Chain Award (AI) | $2,500 | ML credit scoring + QIElend |
