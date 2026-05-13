# Sui Overflow 2026 — Competitive Analysis & Winning Plan

> Дедлайн сабмісій: **23 травня 2026** · Demo Days: **13–14 червня 2026** · Призовий фонд: **$500,000+**

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
- Suithetic: немає верифікації якості даних людиною; регулятори (HIPAA) не розглянуті

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
- SeaWallet: сайт без SSL, слабка документація — погана UX
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
- Судді нагороджували **novel on-chain primitives** (SQL, provenance, pub/sub) — не просто "ще один дашборд"
- Глибока Walrus-інтеграція була загальною темою топ-2
- Developer experience: справжній SDK з npm-пакетом, реальна документація

**Gaps / що можна покращити:**
- SuiSQL: немає standalone repo, поганий onboarding; gas cost для складних JOIN незрозумілий
- Suipulse: немає Walrus для persistent archival; 53 commits, 10 stars — мала екосистема
- Ніхто немає в зоні **agent infrastructure** — SDK для AI-агентів що можуть сплачувати і отримувати оплату

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

### Корисні посилання
- **Docs root:** https://docs.sui.io/
- **Awesome Sui:** https://github.com/sui-foundation/awesome-sui
- **Awesome Seal examples:** https://github.com/MystenLabs/awesome-seal
- **Starter template:** https://github.com/MystenLabs/sui-stack-hello-world
- **Sui Overflow 2026:** https://overflow.sui.io/
- **Walrus cost calculator:** https://costcalculator.wal.app
- **GraphQL RPC** (JSON-RPC deprecated July 2026): https://docs.sui.io/references/sui-graphql

---

## 3. Sui Overflow 2026 — Треки та призи

### Основні треки ($30K / $15K / $10K / $7.5K)
| Трек | Фокус |
|------|-------|
| **Agentic Web (AI)** | Autonomous AI agents що діють, транзакують, координують on-chain |
| **DeFi & Payments** | Фінансові примітиви, payment rails, yield, composability |
| **Infra & DevX** | Developer tooling, protocol improvements, SDKs |

### Sponsor треки (фіксовані пули)
| Трек | Пул | Фокус |
|------|-----|-------|
| **Walrus** | $70,000 | Apps що використовують Walrus для великих/verifiable даних |
| **DeepBook** | $70,000 | Trading / liquidity на DeepBook order book |
| **EVE Frontier** | $50,000 | Decentralized web payment infrastructure |
| **ONE Championship** | $70,000 | Consumer apps — gaming, NFTs, sports |
| University Award | $25,000 | 10 × $2,500 (Scallop-спонсор) |
| Community Award | $25,000 | Hippo-спонсор |

**Дедлайн: 23 травня 2026**

---

## 4. Gap Analysis — Що відсутнє на ринку

На основі аналізу переможців 2025 визначено критичні білі плями:

| Gap | Чому ніхто не зробив | Потенціал |
|-----|---------------------|-----------|
| **AI-agent-to-agent payments** | x402/HTTP payment протокол не існує на Sui | 🔥🔥🔥 |
| **Programmable escrow для агентів** | Умовний release: "заплати якщо задача виконана" | 🔥🔥🔥 |
| **Agent Identity на Sui** | zkLogin для агентів (не людей) | 🔥🔥 |
| **Verifiable agent receipts** | Walrus для незмінних payment receipts агентів | 🔥🔥🔥 |
| **Cross-chain agent payments** | Агент на Arbitrum → сервіс на Sui | 🔥🔥 |
| **Agent SDK** | TypeScript SDK для швидкого onboarding розробників | 🔥🔥 |
| **DeepBook-aware agents** | AI-агент що сам виконує trades через DeepBook | 🔥 |

---

## 5. Запропонований Проект: **SuiAgent Pay**

> **Концепція:** Перший нативний HTTP-рівневий payment protocol для AI-агентів на Sui — агенти наймають агентів, сплачують автономно, отримують verifiable receipts, а розробники onboard за 5 хвилин.

### 5.1 Elevator Pitch

```
Будь-який AI-агент може:
  → виставити рахунок через HTTP заголовок (x402 / Sui-Pay)
  → отримати оплату в USDC/SUI атомарно через PTB
  → зберегти verifiable receipt на Walrus
  → перевірити виконання задачі через Seal escrow
без seed phrases (zkLogin), без людини в петлі, без централізованого процесора
```

### 5.2 Чому це переможе

| Критерій | Як SuiAgent Pay відповідає |
|----------|--------------------------|
| Sui-native depth | zkLogin (agent identity) + Walrus (receipts) + Seal (escrow conditions) + PTBs (atomic payments) |
| Novelty | Ніхто в 2025 не побудував agent-to-agent payment layer на Sui |
| Real use case | Збігається з глобальним трендом MCP + A2A (Claude, OpenAI, Google agents) |
| Cross-track appeal | Закриває Agentic Web + Walrus ($70K) + DeFi & Payments + можливо EVE Frontier |
| Developer experience | npm SDK, 5-хвилинний quickstart, TypeScript-first |
| Demo-ability | Live demo: GPT агент → платить Claude агенту → Walrus receipt → on-chain proof |

---

## 6. Детальна архітектура

### 6.1 Компоненти

```
┌─────────────────────────────────────────────────────────────────┐
│                        SuiAgent Pay                             │
├──────────────────┬──────────────────┬───────────────────────────┤
│  Agent Registry  │  Payment Gateway │    Escrow Engine          │
│  (Sui Objects)   │  (x402 HTTP)     │    (Seal + Move)          │
├──────────────────┴──────────────────┴───────────────────────────┤
│                     @suiagent/sdk (TypeScript)                  │
├─────────────────────────────────────────────────────────────────┤
│  Walrus Receipts │  zkLogin Identity │  DeepBook Liquidity       │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Ключові фічі (MVP для дедлайну 23 травня)

#### F1 — Agent Registry (Sui Objects)
- Кожен агент реєструється як Sui Object з metadata (name, endpoint, price per call, supported tasks)
- Пошук агентів за типом задачі
- On-chain reputation score (кількість виконаних задач)

#### F2 — x402 HTTP Payment Protocol
- HTTP заголовок `X-Sui-Payment-Required: <amount> <asset> <move_call>`
- Агент-клієнт автоматично підписує PTB і надсилає оплату
- Response: `X-Sui-Receipt: <walrus_blob_id>` — незмінний proof

#### F3 — Seal Escrow
- Умовна оплата: кошти заморожені в Seal-контракті
- Release умова прописується в Move: `if task_verified() { transfer() }`
- Агент-верифікатор підписує результат → автоматичний release

#### F4 — Walrus Receipts
- Кожна транзакція між агентами → blob на Walrus
- Verifiable blob ID on-chain (незмінна historical record)
- Легко аудитувати: хто кому платив, за що, коли

#### F5 — zkLogin Agent Identity
- Агент отримує Sui keypair через Google OAuth (без seed phrase)
- Один додаток → одна агентна ідентичність
- Multisig: human oversight key + agent ephemeral key

#### F6 — TypeScript SDK (@suiagent/sdk)
```typescript
// Виставити рахунок (server-side)
const agent = new SuiAgent({ zkLoginProvider: 'google' });
agent.serve('/analyze', { price: 0.01, asset: 'USDC' }, async (task) => {
  return await analyzeData(task.input);
});

// Найняти агента (client-side)
const client = new SuiAgentClient({ walletKey: process.env.PRIVATE_KEY });
const result = await client.hire('https://agent.example.com/analyze', {
  input: myData,
  maxBudget: 0.05,
});
console.log(result.output, result.walrusReceiptId);
```

#### F7 — Demo Dashboard
- React UI: список зареєстрованих агентів
- Live transaction feed: агент A → агент B → receipt
- Walrus receipt explorer
- AgentScore лідерборд

### 6.3 Stretch features (якщо встигнемо)

| Фіча | Цінність |
|------|---------|
| DeepBook router | Агент сам купує потрібний токен через DeepBook перед оплатою |
| Cross-chain bridge | Агент на Arbitrum/0G → платить Sui-агенту через CCTP/Wormhole |
| Atoma inference | Агент викликає on-chain LLM через Atoma + платить через SuiAgent Pay |
| SuiNS integration | `agent.sui` замість адреси |

---

## 7. Стратегія по треках

### Основна подача: Agentic Web (AI)
- SuiAgent Pay = інфраструктура для agentic economy
- Демо: автономний AI-агент платить іншому без людини

### Sponsor треки (додаткові призи)
| Трек | Аргумент |
|------|---------|
| **Walrus ($70K)** | Walrus Receipts = core feature, кожна транзакція → Walrus blob |
| **EVE Frontier ($50K)** | Decentralized web payment infrastructure = exactly the track description |
| **DeFi & Payments** | x402 protocol + programmable escrow |

**Потенційний виграш:** Agentic Web ($30K) + Walrus sponsor ($70K) + Community Award = $100K+

---

## 8. Конкурентний аналіз "чим краще за 2025"

| Критерій | 2025 переможці | SuiAgent Pay |
|----------|---------------|--------------|
| AI агенти | Інструменти для людей що використовують AI | Агенти є першокласними платниками |
| Privacy | PIVY: stealth для людей | Seal escrow: умовна приватна оплата для агентів |
| Cross-chain | PIVY: CCTP для людей | Агенти на будь-якій мережі → Sui агенти |
| Walrus | SuiSQL + Suithetic: storage | Verifiable immutable receipts for auditability |
| Developer tooling | SuiSQL: SQL primitive | SDK + x402 standard = developer-first від дня 0 |
| Data pipeline | Suithetic, Hyvve | + payment layer on top of data marketplace |

---

## 9. Timeline — 10 днів до дедлайну (23 травня)

| Дата | Milestone |
|------|-----------|
| **13 трав** | Finalize concept, start Move contracts (Registry + Payment) |
| **14–15 трав** | Move contracts: Registry, basic Payment PTB, Escrow skeleton |
| **16–17 трав** | TypeScript SDK (@suiagent/sdk): serve() + hire() + Walrus receipts |
| **18–19 трав** | zkLogin agent identity integration + Seal escrow conditions |
| **20 трав** | Demo dashboard UI (React + dapp-kit) |
| **21 трав** | Live demo: Agent A (Claude) hires Agent B (custom) → Walrus receipt |
| **22 трав** | Documentation + quickstart README + video |
| **23 трав** | Submit to DoraHacks / Devfolio |

---

## 10. MVP Scope (що точно потрібно для submission)

- [ ] Move smart contract: AgentRegistry (register, lookup, score)
- [ ] Move smart contract: PaymentGateway (atomic USDC/SUI transfer via PTB)
- [ ] Move smart contract: SealEscrow (conditional release)
- [ ] Walrus integration: write receipt blob, read by ID
- [ ] TypeScript SDK: `SuiAgent.serve()` + `SuiAgentClient.hire()`
- [ ] Demo: one real agent-to-agent transaction live on testnet
- [ ] Dashboard: registry list + tx feed + receipt explorer
- [ ] Documentation: README + quickstart + architecture diagram
- [ ] Demo video (2–3 хв)

---

## 11. Технічний стек проекту

```
Frontend:       React + @mysten/dapp-kit + TailwindCSS
Smart contracts: Sui Move (testnet → mainnet)
SDK:            TypeScript (@suiagent/sdk на npm)
Storage:        Walrus (receipts + agent metadata)
Encryption:     Seal (escrow conditions)
Identity:       zkLogin via @mysten/enoki
HTTP protocol:  x402-style headers (Sui variant)
Deploy:         Vercel (frontend) + Walrus Sites (decentralized mirror)
```

---

## 12. Submission Checklist (DoraHacks / Devfolio)

- [ ] Project name + tagline
- [ ] Track selection: Agentic Web + Walrus sponsor + EVE Frontier
- [ ] GitHub repo (public, clean README)
- [ ] Live demo URL (Vercel)
- [ ] Demo video (Loom / YouTube)
- [ ] Smart contract addresses (testnet)
- [ ] Walrus blob IDs (example receipts)
- [ ] Team info

---

*Документ створено: 2026-05-13*
*Аналіз базується на: blog.sui.io/2025-sui-overflow-hackathon-winners + прямі дані з сайтів переможців*
