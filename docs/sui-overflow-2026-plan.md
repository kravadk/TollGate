# Sui Overflow 2026 — Competitive Analysis & Winning Plan

> Дедлайн сабмісій: **23 травня 2026** · Demo Days: **13–14 червня 2026** · Призовий фонд: **$500,000+**
> Цільовий виграш: **$290K+** (5 sponsor треків одночасно)

---

## 1. Sui Overflow 2025 — Аналіз переможців

### 1.1 AI Track

| Місце | Проект | Ідея | Killer Feature | Sui Primitives |
|-------|--------|------|----------------|----------------|
| 🥇 1 | **Suithetic** | Marketplace синтетичних даних для ML | Atoma + Walrus + Seal = повний on-chain data pipeline; HuggingFace-сумісний вивід | Atoma, Walrus, Seal, SuiNS |
| 🥈 2 | **OpenGraph** | On-chain ML inference (шар за шаром) | Кожен forward-pass — це верифікований блокчейн-транзакт; повна прозорість AI | Move smart contracts, Walrus |
| 🥉 3 | **RaidenX** | DeFAI trading terminal + data API | "DeFAI data layer" — структурований фід для AI-агентів і людей одночасно; DEX routing | Cetus, Turbos, FlowX DEX |
| 4 | **Hyvve** | Crowdsourced data → model pipeline | POC fine-tuning: F1 +9.7 на реальних даних; AI quality gates підписані ED25519 | Atoma, Walrus, Move |

**Що виграло AI трек:**
- Глибока інтеграція Sui-native інфраструктури (Walrus + Atoma + Seal), а не "AI-обгортка поверх Web2"
- Нові data-economy моделі де блокчейн вирішує проблему краще за centralized аналог
- Вимірюваний ML-результат (Hyvve: конкретний F1 score)

**Gaps / що можна покращити:**
- Жоден не побудував **AI agent-to-agent payment protocol** — агенти платять агентам без людини
- OpenGraph обмежений крихітними моделями (on-chain газ не масштабується на LLM)
- RaidenX = Telegram-only, немає web SDK для розробників
- Suithetic: немає верифікації якості даних; регулятори не розглянуті

---

### 1.2 Payments & Wallets Track

| Місце | Проект | Ідея | Killer Feature | Tech |
|-------|--------|------|----------------|------|
| 🥇 1 | **PIVY** | Stealth-адреси + payment links | Secp256k1 ECDH stealth addresses; CCTP cross-chain (10+ chains); 0% fee; sponsored gas | Move, CCTP, secp256k1 |
| 🥈 2 | **Sui Multisig** | Мультипідпис з покращеним UX | Спрощений UI для складних multisig-гаманців | Move, Sui multisig |
| 🥉 3 | **SeaWallet** | Programmable smart contract wallet | Asset inheritance on-chain (хто отримає активи після смерті/інактивності) | Slush, Move |
| 4 | **Coindrip** | Token streaming як NFT | Stream NFT = ліквідна застава; composable DeFi; per-second unlock | Move, Sui objects |

**Що виграло Payments трек:**
- PIVY виграв завдяки **privacy + cross-chain + UX** одночасно — конкуренти давали лише одне з трьох
- Cryptographically rigorous (реальна крипто, не "fake privacy")
- Sponsored gas — користувач не думає про газ

**Gaps / що можна покращити:**
- Ніхто не побудував **machine-to-machine / AI-agent payment protocol** (HTTP-рівень, x402-стиль)
- Немає **programmable payment conditions** для AI агентів (якщо задача виконана → розблокуй оплату)
- Escrow кошти мертвий капітал — ніхто не поєднав escrow з DeFi yield
- Coindrip: yield і flash loans "coming soon", топ-фічі не живі

---

### 1.3 Infra & Tooling Track

| Місце | Проект | Ідея | Killer Feature | Tech |
|-------|--------|------|----------------|------|
| 🥇 1 | **SuiSQL** | SQL database on-chain + Walrus | SQL поверх Sui objects; Walrus як verifiable blob store; JS SDK | Move, Walrus, TypeScript |
| 🥈 2 | **Sui Provenance Suite** | SLSA + Sigstore deployment провенанс | End-to-end supply-chain security від GitHub commit до deployed bytecode | SLSA, Sigstore, Walrus, zkLogin |
| 🥉 3 | **Suipulse** | "Kafka для Web3" — on-chain pub/sub | Named data streams з access control, sub-second latency, TypeScript SDK | Move, TypeScript |
| 4 | **Noodles.FI** | Sui analytics + neutral data API | Незалежний B2B data feed; підтримка від Sui Foundation, Cetus, Suilend | Indexer, Next.js |

**Що виграло Infra трек:**
- Судді нагороджували **novel on-chain primitives** — не просто "ще один дашборд"
- Глибока Walrus-інтеграція була загальною темою топ-2
- Developer experience: справжній SDK з npm-пакетом, реальна документація

**Gaps / що можна покращити:**
- Ніхто не побудував **agent infrastructure** — SDK для AI-агентів що платять і отримують оплату
- SuiSQL: немає standalone repo, поганий onboarding
- Відсутній: gasless agent deployment (розробник без SUI стартує агента)

---

## 2. Sui Tech Stack — Ключові примітиви для розробника

### Мова та рантайм
| Примітив | Опис | Docs |
|----------|------|------|
| **Sui Move** | Object-oriented smart contracts; об'єкти = first-class citizens | https://docs.sui.io/concepts/sui-move-concepts |
| **PTBs** | Programmable Transaction Blocks — compose multiple calls atomically | https://docs.sui.io/concepts/transactions/prog-txn-blocks |
| **Objects** | Owned / Shared / Immutable; паралельне виконання | https://docs.sui.io/concepts/object-model |
| **On-chain Randomness** | Native verifiable randomness on-chain | https://docs.sui.io/guides/developer/advanced/randomness-onchain |

### Identity & Auth
| Примітив | Опис | Docs |
|----------|------|------|
| **zkLogin** | OAuth (Google/Apple) → Sui wallet; ZK proof, без seed phrase | https://docs.sui.io/standards/zklogin |
| **Passkey** | WebAuthn device-based auth | https://docs.sui.io/concepts/cryptography/passkey |
| **SuiNS** | Human-readable names on-chain | https://suins.io |

### Storage & Privacy
| Примітив | Опис | Docs |
|----------|------|------|
| **Walrus** | Decentralized verifiable storage; WAL token; verifiable blob IDs | https://docs.wal.app / https://walrus.xyz |
| **Walrus Sites** | Decentralized web app hosting | https://docs.wal.app/walrus-sites |
| **Seal** | On-chain access control + threshold encryption; time-locks, token-gating, RBAC | https://seal-docs.wal.app |

### DeFi & Compute
| Примітив | Опис | Docs |
|----------|------|------|
| **DeepBook V3** | Fully on-chain CLOB; shared liquidity; audited OtterSec | https://docs.sui.io/onchain-finance/deepbookv3/deepbook |
| **Atoma Network** | Decentralized LLM inference on Sui | https://atomanetwork.xyz |
| **Nautilus** | Verifiable off-chain compute (TEE); bring results on-chain | https://sui.io/nautilus |

### SDKs
| SDK | Опис | Docs |
|-----|------|------|
| `@mysten/sui` | TypeScript SDK: RPC, transactions, BCS, crypto, multisig | https://sdk.mystenlabs.com/typescript |
| `@mysten/dapp-kit` | React hooks для Sui dApps | https://sdk.mystenlabs.com/dapp-kit |
| `@mysten/enoki` | Спрощений zkLogin + sponsored transactions | https://sdk.mystenlabs.com/enoki |
| `@mysten/zksend` | Gasless token sending / linkdrops | https://sdk.mystenlabs.com/zksend |

---

## 3. Sui Overflow 2026 — Треки та призи

### Основні треки ($30K / $15K / $10K / $7.5K)
| Трек | Фокус |
|------|-------|
| **Agentic Web (AI)** | Autonomous AI agents що діють, транзакують, координують on-chain |
| **DeFi & Payments** | Фінансові примітиви, payment rails, yield, composability |
| **Infra & DevX** | Developer tooling, protocol improvements, SDKs |

### Sponsor треки
| Трек | Пул | Фокус |
|------|-----|-------|
| **Walrus** | **$70,000** | Apps що використовують Walrus для великих/verifiable даних |
| **DeepBook** | **$70,000** | Trading / liquidity на DeepBook order book |
| **EVE Frontier** | **$50,000** | Decentralized web payment infrastructure |
| **ONE Championship** | **$70,000** | Consumer apps — gaming, NFTs, sports |
| University Award | $25,000 | 10 × $2,500 (Scallop-спонсор) |
| Community Award | $25,000 | Hippo-спонсор |

**Дедлайн: 23 травня 2026**

---

## 4. Gap Analysis — Що відсутнє на ринку

| Gap | Проблема | Потенціал |
|-----|---------|-----------|
| **AI-agent-to-agent payments** | Агенти не мають нативного способу платити один одному | 🔥🔥🔥 |
| **Escrow як мертвий капітал** | Гроші заморожені в escrow не заробляють нічого | 🔥🔥🔥 |
| **Агент = чорна скринька** | Неможливо довести що агент виконав задачу правильно | 🔥🔥🔥 |
| **Web payment friction** | Додати crypto оплату на сайт = 3 тижні розробки | 🔥🔥🔥 |
| **Агент без пам'яті** | Кожен виклик = нуль контексту про попередню роботу | 🔥🔥 |
| **Агент без репутації** | Немає способу довести що агент хороший до того як найняти | 🔥🔥 |
| **Cross-chain agent gap** | Агент на Arbitrum не може найняти агента на Sui | 🔥🔥 |

---

## 5. Проект: **SuiAgent OS — Agent Economy Operating System**

> **Концепція:** Перша повноцінна операційна система для AI-agent economy на Sui.
> Не просто "платежі для агентів" — це інфраструктурний шар де агенти живуть, заробляють, конкурують, пам'ятають і взаємодіють, а розробники onboard за 5 хвилин.

### 5.1 Elevator Pitch

```
Проблема:  AI агенти існують, але не можуть брати участь в економіці.
           Вони не можуть найняти один одного. Їх гроші мертві в escrow.
           Їх репутація нульова. Їх пам'ять зникає після кожного запиту.

Рішення:   SuiAgent OS — повна операційна система для agent economy на Sui.
           Агент реєструється → отримує NFT-ідентичність → приймає HTTP-платежі
           → гроші в escrow заробляють yield через DeepBook LP
           → задача верифікується через Nautilus TEE → receipt на Walrus
           → пам'ять персистентна між сесіями → репутація накопичується on-chain

Унікально: Перший проект що вирішує всі 5 основних проблем agent economy одночасно.
```

---

## 6. Killer Features — Проблема → Рішення → Трек

### F1 — x402 Agent Payment Protocol (CORE)
**Проблема:** Агент не може прийняти оплату без централізованого сервера або людини-посередника.

**Рішення:** HTTP заголовок-протокол де агент виставляє рахунок, клієнт автоматично сплачує через PTB.
```
→ Request:  GET /analyze HTTP/1.1
← Response: 402 Payment Required
            X-Sui-Pay: 0.01 USDC → 0xAgentAddress
→ Request:  GET /analyze + PTB signed payment
← Response: 200 OK + X-Sui-Receipt: walrus://blob_id
```
**Треки:** Agentic Web ✅ · DeFi & Payments ✅ · EVE Frontier ✅

---

### F2 — DeepBook Yield Escrow (НОВИНКА)
**Проблема:** Коли агент отримує передоплату за складну задачу, гроші "сплять" в escrow. При ринку $1B в locked agent payments це мільйони $ мертвого капіталу.

**Рішення:** Sealed escrow автоматично розміщує заморожені кошти в DeepBook LP поки задача в роботі.
- Задача призначена → USDC → DeepBook LP → заробляє trading fees
- Задача виконана → LP position withdraws → агент отримує payment + earned yield
- Задача провалена → LP withdraws → клієнт отримує refund + earned yield

**Чому це ніде немає:** Жоден протокол не з'єднав escrow + DeFi yield + agent payments. Три окремі примітиви — перший раз composable.

**Треки:** DeepBook $70K ✅✅ · DeFi & Payments ✅ · Agentic Web ✅

---

### F3 — AgentNFT — Living Reputation Token (НОВИНКА)
**Проблема:** Як вибрати хорошого агента? Немає on-chain track record. Всі агенти виглядають однаково на старті.

**Рішення:** Кожен задеплоєний агент = Sui NFT з динамічним metadata що оновлюється після кожної транзакції:
- Tasks completed: 1,247
- Success rate: 94.3%
- Total revenue earned: 892 USDC
- Avg response time: 1.2s
- Client satisfaction score: 4.8/5 (on-chain verified)

NFT "левелапається" при досягненні milestone → змінюється artwork (Common → Rare → Epic → Legendary).

Інвестори можуть **купити AgentNFT** що представляє % від майбутніх доходів агента (agent-as-startup).

**Чому це ніде немає:** Поєднання живого reputation NFT + investment vehicle + dynamic artwork — новий примітив.

**Треки:** ONE Championship $70K ✅✅ (NFT + gaming) · Agentic Web ✅ · DeFi & Payments ✅

---

### F4 — Sui Pay Button — One-Tag Web Integration (НОВИНКА)
**Проблема:** Додати криптооплату на сайт = тижні розробки, вимагає від юзерів знання crypto, seed phrase, gas tokens. 99% web developers не можуть інтегрувати.

**Рішення:** Drop-in browser widget — один рядок HTML на будь-якому сайті:
```html
<script src="https://cdn.suiagent.os/widget.js"></script>
<sui-pay
  agent="analyzer.sui"
  price="0.01"
  asset="USDC"
  on-result="showOutput">
  Analyze with AI — $0.01
</sui-pay>
```
- Юзер клікає → popup wallet → вибирає Google sign-in (zkLogin, без seed phrase)
- Оплата + AI call → результат повертається на сайт
- Sponsored gas — юзер не потребує мати SUI
- Site owner отримує SDK dashboard з analytics

**Чому це ніде немає:** Stripe-подібний DX для AI payments на блокчейні — не існує ніде.

**Треки:** EVE Frontier $50K ✅✅ (decentralized web payment infra = БУКВАЛЬНО ЦЕ) · DeFi & Payments ✅ · Infra & DevX ✅

---

### F5 — Agent Memory Network on Walrus (НОВИНКА)
**Проблема:** AI агенти страждають на "синдром золотої рибки" — після кожного запиту вся пам'ять зникає. Агент що ти найняв 100 разів не знає хто ти.

**Рішення:** Persistent encrypted agent memory на Walrus — кожен агент має власний "brain":
- **Private memory:** encrypted через Seal, тільки агент читає (task history, learned preferences, client profiles)
- **Shared memory:** агент продає read-access іншим агентам за мікроплатіж (accumulated domain knowledge)
- **Vector embeddings:** capabilities stored на Walrus — semantic search "знайди агента для legal analysis"

Архітектура:
```
Agent Brain (Walrus blob, Seal-encrypted):
  - client_contexts: {address → preferences, history}
  - learned_patterns: {task_type → optimal_approach}
  - knowledge_base: {domain → accumulated_insights}

Shared Knowledge Market:
  - Agent A needs: "crypto tax calculation approach"
  - Agent B has it (stored on Walrus)
  - Agent A pays 0.001 USDC → Seal access granted → knowledge transferred
```

**Чому це ніде немає:** Agent persistent memory on-chain + knowledge marketplace = новий DePIN для AI.

**Треки:** Walrus $70K ✅✅ (великі binary blobs = perfect Walrus use case) · Agentic Web ✅✅

---

### F6 — Agent Battle Arena + DeepBook Prediction Markets (НОВИНКА)
**Проблема:** Як об'єктивно оцінити якість агентів? Суб'єктивні огляди не працюють. Потрібен ринковий механізм.

**Рішення:** Gamified arena де агенти змагаються публічно, а ринок оцінює якість через betting:

**Як це працює:**
1. Arena оголошує "Challenge: analyze this dataset, winner = most accurate result"
2. 5+ агентів беруть участь, результати sealed (Seal encryption) до дедлайну
3. Результати розкриваються, on-chain judge contract визначає переможця (Nautilus TEE)
4. Глядачі ставили ставки через **DeepBook prediction market** на кожного агента
5. Переможці ставок ділять prize pool; переможець-агент отримує:
   - Prize money
   - Legendary arena NFT (рідкісний колекційний предмет)
   - Reputation boost (AgentNFT level up)

**Сезони та турніри:**
- Weekly challenges (малі ставки, швидко)
- Monthly Championships (великі пули, залучає spectators)
- Annual Grand Prix (гранд-фінал, $10K+ prize pools)

**Consumer angle:** глядачі = fans, агенти = спортсмени, ставки = sports betting — масовий продукт.

**Чому це ніде немає:** AI agent competition + prediction market + NFT rewards = абсолютно новий жанр.

**Треки:** ONE Championship $70K ✅✅ (gaming + sports + NFTs = буквально трек) · DeepBook $70K ✅ (prediction markets on DeepBook)

---

### F7 — Proof of Useful Work via Nautilus TEE (НОВИНКА)
**Проблема:** Агент каже "я виконав задачу правильно" — але як це перевірити? Без верифікації агенти можуть шахраювати, повертати кешований сміття, або взагалі не виконувати роботу.

**Рішення:** Агент виконує задачу всередині Nautilus TEE (Trusted Execution Environment):
- TEE генерує **attestation report** (криптографічний proof виконання)
- Proof містить: input hash, output hash, execution timestamp, TEE identity
- Proof зберігається на **Walrus** (постійний verifiable архів)
- Move contract верифікує proof on-chain перед release payment

```
Task Flow з PoUW:
  Client sends task → Agent receives in TEE
  → TEE executes computation
  → TEE signs attestation (input_hash + output_hash + timestamp)
  → attestation stored on Walrus
  → Move contract: verify(attestation) → release_escrow()
  → Client: proof available forever at walrus://proof_blob_id
```

**Чому це ніде немає:** Nautilus + Walrus + agent payments = перше поєднання. "Don't trust the agent, cryptographically verify its work."

**Треки:** Infra & DevX ✅✅ · Walrus $70K ✅ · Agentic Web ✅

---

### F8 — Intent Engine — Natural Language → Multi-Agent Workflow (НОВИНКА)
**Проблема:** Щоб автоматизувати складний workflow (моніторинг + аналіз + торгівля) потрібен розробник. Бізнес-юзер не може сам скласти multi-agent pipeline.

**Рішення:** Природня мова → автоматична композиція multi-agent PTB:

```
User types: "Monitor BTC sentiment daily. If bullish → buy $50 SUI via DeepBook.
             Alert me via email. Store all analysis on my Walrus storage."

Intent Engine:
  1. Parses intent → identifies required agents:
     - sentiment-agent.sui (monitoring)
     - deepbook-trader.sui (execution)
     - notifier.sui (alerts)
     - walrus-archivist.sui (storage)
  2. Composes PTB: chain calls with conditional logic
  3. Sets up recurring execution (Sui clock objects)
  4. Deploys workflow — runs autonomously

Result: working autonomous workflow, zero coding required
```

**Treба:** Walrus embeddings для semantic agent discovery — великі binary vector files = perfect Walrus use case.

**Чому це ніде немає:** NLP → multi-agent PTB composer на будь-якому блокчейні = абсолютно новий примітив.

**Треки:** Agentic Web ✅✅ · Walrus $70K ✅ · DeFi & Payments ✅ (autonomous trading)

---

## 7. Track Coverage Matrix

| Feature | Agentic Web | DeFi & Payments | Infra & DevX | Walrus $70K | DeepBook $70K | EVE Frontier $50K | ONE Championship $70K |
|---------|:-----------:|:---------------:|:------------:|:-----------:|:-------------:|:-----------------:|:---------------------:|
| **F1** x402 Protocol | ✅ | ✅ | | ✅ | | ✅ | |
| **F2** DeepBook Yield Escrow | ✅ | ✅ | | | ✅✅ | | |
| **F3** AgentNFT Living Reputation | ✅ | ✅ | | | | | ✅✅ |
| **F4** Sui Pay Button | | ✅ | ✅ | | | ✅✅ | |
| **F5** Agent Memory Network | ✅✅ | | | ✅✅ | | | |
| **F6** Battle Arena + Prediction Markets | ✅ | | | | ✅✅ | | ✅✅ |
| **F7** Proof of Useful Work | ✅ | | ✅✅ | ✅ | | | |
| **F8** Intent Engine | ✅✅ | ✅ | | ✅ | | | |
| **Покриття треку** | ✅ STRONG | ✅ STRONG | ✅ STRONG | ✅✅ CORE | ✅✅ CORE | ✅✅ CORE | ✅✅ CORE |

### Призовий потенціал
| Трек | Приз | Чому ми виграємо |
|------|------|-----------------|
| Agentic Web (AI) | $30,000 | F1+F5+F8: єдина agent economy OS, не просто "AI app" |
| Walrus sponsor | $70,000 | F5+F7: agent memory + proof archive — найбільший Walrus use case в хакатоні |
| DeepBook sponsor | $70,000 | F2+F6: yield escrow + prediction markets — реальний trading volume |
| EVE Frontier sponsor | $50,000 | F4: Sui Pay Button = буквально "decentralized web payment infrastructure" |
| ONE Championship | $70,000 | F3+F6: AgentNFT + Battle Arena = gaming + NFTs + sports betting |
| Community Award | $25,000 | F4: будь-який сайт може додати AI payments = масова аудиторія |
| **TOTAL** | **$315,000+** | 6 треків одночасно |

---

## 8. Архітектура системи

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SuiAgent OS                                      │
├──────────────┬──────────────┬──────────────┬───────────────────────────┤
│ Agent Registry│ Payment Gate │ Escrow Engine│   Battle Arena            │
│ (Sui Objects) │ (x402 HTTP) │ (Seal+Move)  │   (DeepBook markets)      │
│ + AgentNFT   │ + Sui Pay Btn│ + DeepBook LP│   + Nautilus judge        │
├──────────────┴──────────────┴──────────────┴───────────────────────────┤
│                   @suiagent/sdk (TypeScript, npm)                        │
├─────────────────────────────────────────────────────────────────────────┤
│ Walrus Memory │ Proof Archive│ Vector Search │ Intent Engine             │
│ (encrypted)   │ (Nautilus TE)│ (embeddings) │ (NL → PTB composer)       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Move Smart Contracts
| Contract | Функція |
|----------|---------|
| `AgentRegistry` | Реєстрація агентів, AgentNFT mint, reputation scoring |
| `PaymentGateway` | x402 atomic payments via PTBs, sponsored gas |
| `YieldEscrow` | Escrow → DeepBook LP → yield distribution |
| `BattleArena` | Challenges, Nautilus verdict, prediction markets |
| `MemoryMarket` | Seal-gated knowledge purchase between agents |

### TypeScript SDK (@suiagent/sdk)
```typescript
// Сервер-агент: приймає платежі
const agent = new SuiAgent({
  name: 'analyzer.sui',
  zkLogin: { provider: 'google' },
  pricing: { base: 0.01, asset: 'USDC' },
  memory: { walrus: true, seal: true },
});
agent.serve('/analyze', async (task, ctx) => {
  // ctx.memory = persistent context from Walrus
  // ctx.proofMode = 'nautilus' → auto TEE wrapping
  return analyzeData(task.input, ctx.memory);
});

// Клієнт: наймає агента
const client = new SuiAgentClient({ budget: 0.10 });
const result = await client.hire('analyzer.sui', {
  task: 'Analyze this dataset',
  escrowMode: 'yield', // funds earn DeepBook yield while waiting
});
// result.output, result.proof, result.walrusReceiptId, result.yieldEarned

// Web: one-line HTML integration
// <sui-pay agent="analyzer.sui" price="0.01 USDC">Run AI</sui-pay>
```

---

## 9. Конкурентний аналіз "чим краще за 2025"

| Вимір | 2025 переможці | SuiAgent OS |
|-------|---------------|-------------|
| Хто платить | Люди | AI агенти (machine-to-machine) |
| Мертвий capital | Escrow нічого не заробляє | DeepBook yield на locked funds |
| Довіра до агентів | Нульова (trust-me-bro) | Nautilus TEE cryptographic proof |
| Web інтеграція | Потребує тижні розробки | Один `<script>` tag |
| Пам'ять агентів | Відсутня (goldfish syndrome) | Persistent Walrus memory + knowledge market |
| Репутація агентів | Непрозора | AgentNFT living on-chain track record |
| Consumer product | Відсутній | Battle Arena: AI sports betting + NFT rewards |
| Треків покрито | 1-2 на проект | 6 sponsor треків одночасно |

---

## 10. Timeline — 10 днів до дедлайну

| Дата | MVP Milestone | Priority |
|------|--------------|---------|
| **13 трав** | Finalize architecture, setup Sui dev env, Move project scaffold | 🔴 |
| **14 трав** | Move: AgentRegistry + AgentNFT mint | 🔴 |
| **15 трав** | Move: PaymentGateway (x402 atomic payment via PTB) | 🔴 |
| **16 трав** | Move: YieldEscrow (Seal + DeepBook LP integration) | 🔴 |
| **17 трав** | TypeScript SDK: SuiAgent.serve() + SuiAgentClient.hire() | 🔴 |
| **18 трав** | Walrus: agent memory read/write + receipt storage | 🟡 |
| **19 трав** | Sui Pay Button widget (HTML + JS) + zkLogin sponsored gas | 🟡 |
| **20 трав** | Dashboard UI: registry + live tx feed + AgentNFT viewer | 🟡 |
| **21 трав** | Battle Arena MVP: 2 agents compete + spectator view | 🟢 |
| **22 трав** | Live demo polish + README + demo video (3 min) | 🔴 |
| **23 трав** | 🚀 Submit to DoraHacks/Devfolio — всі 6 треків | 🔴 |

**Легенда:** 🔴 критично для submission · 🟡 важливо для sponsor треків · 🟢 bonus

---

## 11. MVP Scope — Мінімум для перемоги

### Must-have (без цього немає submission)
- [ ] Move: AgentRegistry з AgentNFT mint
- [ ] Move: PaymentGateway — x402 atomic payment
- [ ] Move: YieldEscrow — Seal + DeepBook LP
- [ ] TypeScript SDK: serve() + hire()
- [ ] Walrus: receipt blob write/read
- [ ] Demo: live agent-to-agent tx на testnet
- [ ] Dashboard: registry + tx feed

### Should-have (sponsor треки)
- [ ] Sui Pay Button HTML widget (EVE Frontier)
- [ ] AgentNFT dynamic metadata update (ONE Championship)
- [ ] DeepBook LP integration в escrow (DeepBook track)
- [ ] Agent Memory: Walrus encrypted blob (Walrus track)

### Nice-to-have (bonus impressions)
- [ ] Battle Arena MVP (2 agents, simple challenge)
- [ ] Proof of Useful Work skeleton (Nautilus)
- [ ] Intent Engine NL parser demo

---

## 12. Технічний стек

```
Frontend:        React + @mysten/dapp-kit + TailwindCSS + Framer Motion
Smart contracts: Sui Move (testnet → mainnet)
SDK:             TypeScript (@suiagent/sdk, npm-published)
Storage:         Walrus (memory blobs + receipt archive + vector embeddings)
Encryption:      Seal (escrow conditions + memory access control)
Identity:        zkLogin via @mysten/enoki (Google OAuth, no seed phrase)
Yield:           DeepBook V3 LP positions (escrow yield)
TEE:             Nautilus (proof of useful work)
HTTP Protocol:   x402-style headers (custom Sui variant)
Deploy:          Vercel (frontend) + Walrus Sites (decentralized mirror)
```

---

## 13. Submission Strategy

### DoraHacks / Devfolio Fields
- **Project name:** SuiAgent OS
- **Tagline:** "The Operating System for AI Agent Economy on Sui"
- **Primary track:** Agentic Web (AI)
- **Sponsor tracks:** Walrus · DeepBook · EVE Frontier · ONE Championship
- **GitHub:** public repo з clean README
- **Live demo:** Vercel URL
- **Demo video:** 3 хвилини — показати живу tx між 2 агентами

### Demo Script (3 хвилини)
```
0:00 — Problem: "AI agents can't participate in economy"
0:30 — Live: Claude agent registers, gets AgentNFT
1:00 — Live: user hires agent via Sui Pay Button (one HTML tag)
1:30 — Live: payment goes to DeepBook yield escrow
2:00 — Live: agent delivers, Nautilus proof verified, payment released + yield
2:30 — Live: Battle Arena — 2 agents compete, spectator bets
2:50 — Dashboard: AgentNFT level-up, Walrus receipt, yield earned
3:00 — CTA: "Install SDK in 5 minutes, earn from day one"
```

---

## 14. Sui Documentation Reference

| Ресурс | URL |
|--------|-----|
| Docs root | https://docs.sui.io/ |
| Sui Move concepts | https://docs.sui.io/concepts/sui-move-concepts |
| PTBs guide | https://docs.sui.io/concepts/transactions/prog-txn-blocks |
| zkLogin | https://docs.sui.io/standards/zklogin |
| Walrus docs | https://docs.wal.app |
| Seal docs | https://seal-docs.wal.app |
| DeepBook V3 | https://docs.sui.io/onchain-finance/deepbookv3/deepbook |
| Nautilus | https://sui.io/nautilus |
| TypeScript SDK | https://sdk.mystenlabs.com/typescript |
| dapp-kit | https://sdk.mystenlabs.com/dapp-kit |
| enoki (zkLogin) | https://sdk.mystenlabs.com/enoki |
| Awesome Sui | https://github.com/sui-foundation/awesome-sui |
| Awesome Seal | https://github.com/MystenLabs/awesome-seal |
| Sui Overflow 2026 | https://overflow.sui.io/ |
| Walrus cost calc | https://costcalculator.wal.app |

---

*Документ оновлено: 2026-05-13 (v2 — розширений feature set, 6 sponsor треків)*
*Аналіз: blog.sui.io/2025-sui-overflow-hackathon-winners + прямі дані з сайтів переможців*
