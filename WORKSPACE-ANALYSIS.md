# TollGate — Аналіз воркспейсів

_Оновлено: 2026-05-14_

---

## Ядро — однакове для всіх (~70%)

Всюди одна ідея: **x402 payment rail for AI agents** — агент знаходить сервіс, платить, отримує receipt. Це TollGate.

---

## Диференціація (~30%) — де вона є, де немає

| Workspace | Унікальне | Наскільки відрізняється |
|---|---|---|
| **0G** | 4 компоненти (Compute + Storage + DA + Chain), TEE inference, agent self-funding | ⭐⭐⭐⭐ Сильно — технічно інший стек |
| **Mantle** | AgentCreditRegistry (FICO score з receipts), mETH yield, RWA | ⭐⭐⭐⭐ Сильно — унікальний credit angle |
| **Sui** | Move VM, Walrus, zkLogin, PTBs — повністю інший блокчейн | ⭐⭐⭐⭐⭐ Найбільш відрізняється |
| **Agora** | CCTP cross-chain arb, Circle Paymaster, Arc L1 | ⭐⭐⭐ Добре — Circle-специфічні інструменти |
| **Arbitrum** | AgentEscrow, AgentBudgetController (on-chain spend limits), ServiceRegistry, Dispute Resolution, Agent Credit Score, Stylus/Rust | ⭐⭐⭐⭐ Добре — унікальні on-chain spend controls |
| **Polygon** | UAE trade finance, merchant mode, SME focus | ⭐⭐⭐ Добре — інша аудиторія (commerce, not DeFi) |
| **QIE** | QIE Pass gating, QieAgentCredit (FICO), QieOracleFeed (live prices), задеплоєно на mainnet (chainId 1990) | ⭐⭐⭐ Прийнятно — credit angle + deployed contracts |

---

## Реальний ризик

**Нуль ризику** — хакатони абсолютно різні з різними суддями. Ніхто з Agora не дивиться на Polygon submissions.

**Реальна проблема** — не схожість, а те що деякі workspace виглядають "порожньо" (Agora, Polygon, QIE) — немає кастомного віджету, немає унікального demo момента. Судді відкривають `/app/qie` і бачать generic таблицю сервісів — це слабо.

---

## Що важливіше зараз, ніж рефакторинг

Не те що вони схожі — а те що не всі мають **"wow demo moment"**:

- **0G** → OgAgentToAgentLoop є ✅ + **реальний inference** ✅ (`OG_COMPUTE_PRIVATE_KEY` + `OG_STORAGE_INDEXER` виставлені на Render)
- **Agora** → AgoraTradingWidget побудований ✅
- **QIE** → QieCreditWidget + QieOracleFeed є ⚠ — є, але слабкий wow-момент

---

## Env vars на Render (server) — підтверджено активним

| Змінна | Статус | Що це дає |
|---|---|---|
| `OG_COMPUTE_PRIVATE_KEY` | ✅ | Реальний 0G inference (не mock) |
| `OG_STORAGE_INDEXER` | ✅ | Реальний upload на 0G Storage |
| `OG_PRIVATE_KEY` / `OG_RPC_URL` | ✅ | On-chain 0G tx підпис |
| `MINTER_PRIVATE_KEY` | ✅ | Receipt NFT mint на Mantle |
| `MANTLE_RPC_URL` | ✅ | Mantle RPC live |
| `USDC_BASE_SEPOLIA` | ✅ | Base Sepolia USDC адреса |
| `X402_ASSET` / `X402_NETWORK` / `X402_PAYOUT_ADDRESS` | ✅ | x402 gateway активний |
| `CORS_ORIGIN` | ✅ | Frontend може робити API calls |
