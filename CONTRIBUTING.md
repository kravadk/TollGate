# Contributing to TollGate

Thank you for your interest in TollGate! Contributions are welcome.

## Quick start

```bash
git clone https://github.com/kravadk/TollGate.git
cd TollGate
npm install
npm run dev          # http://localhost:5173
```

Server (optional, for real x402 + MCP):
```bash
cd server && npm install && npm run dev   # http://localhost:8080
```

## Project structure

```
src/                    React frontend (Vite + TypeScript)
├── components/         UI components
│   ├── widgets/        Per-feature widgets (A2A, AgentScore, etc.)
│   └── ui/             Reusable primitives
├── lib/                Helpers (og.ts, mantle.ts, arbitrum.ts, budget.ts)
├── pages/              Route pages
└── App.tsx             Router root
server/                 Express + MCP server (SQLite receipt ledger)
packages/sdk/           @tollgate/sdk — zero-dep x402 client
packages/mcp/           @tollgate/mcp-server — stdio MCP server
contracts/              Solidity contracts (Hardhat)
```

## How to contribute

1. Fork & branch: `git checkout -b feat/your-feature`
2. Make your change, add tests if applicable
3. `npx tsc --noEmit` in root **and** `server/` — must pass
4. Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`
5. Open a PR describing **what** and **why**

## Code style

- TypeScript strict mode enabled
- Prefer inline `style={{}}` for one-offs; use `src/styles.css` for repeats
- No `console.log` in production code — use the server's logger
- Wrap async ops in `try/catch`, surface errors to the UI
- Validate all user inputs (length caps, regex, type guards)

## Adding a new widget

1. Create under `src/components/widgets/<workspace>/`
2. Wrap in `<ErrorBoundary label="WidgetName">` when wiring to `WorkspaceDashboard.tsx`
3. Use existing patterns: `useLocalStore` for persistence, `useAppState` for global receipts
4. Update `README.md` Feature Spotlight section for the target hackathon

## Bug reports

[GitHub Issues](https://github.com/kravadk/TollGate/issues). Include browser + OS, steps to reproduce, console errors.

## Security

See [SECURITY.md](SECURITY.md) for responsible disclosure.
