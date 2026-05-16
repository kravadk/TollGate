# Changelog

All notable changes documented here. Format: [Keep a Changelog](https://keepachangelog.com).

## [Unreleased]

### Production polish (2026-05-13)
- `NotFound` 404 page with branded 402-themed design
- Favicon SVG, OG image (1200×630), Twitter Card meta, theme-color
- PWA manifest (`public/manifest.webmanifest`)
- `robots.txt` + `sitemap.xml`
- `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`
- `<noscript>` fallback in `index.html`

### Mantle complete (2026-05-13)
- `AgentCreditLine` widget: borrow USDC against AgentScore on Mantle
- Mantle ServiceRegistry deploy script
- DiscoveryWidget, MerchantWidget, AgentScoreCard wired to Mantle

### Arbitrum complete (2026-05-13)
- `AgentIntentWidget`: ERC-7683 cross-chain intent settlement UI
- Stylus gas benchmark panel: Solidity 142,000 vs Stylus 2,800 (50.7×)
- AgentScore local fallback (reads `budget.txLog` when API offline)

### MCP tools (2026-05-13)
- `tollgate_create_service`: agents register paid APIs at runtime
- `tollgate_verify`: receipt lookup by ID
- Server-side: `userServices[]` mutable store

### Hardening
- `ErrorBoundary` isolates widget crashes
- `try/finally` wrappers around `runDemo` flows
- Strict input validation across forms and MCP `create_service`

## [0.1.0] — 2026-05-12

### Initial release
- x402 HTTP 402 payment gateway (server)
- Multi-chain: 0G mainnet, Mantle mainnet, Arbitrum Sepolia, Galileo testnet, QIE
- `@tollgate/sdk` zero-dep npm package
- `@tollgate/mcp-server` stdio MCP server (7 tools initial)
- A2A Marketplace widget (autonomous agent loop)
- AgentReceiptRegistry on 0G mainnet
- AgentIdentityRegistry (ERC-8004) + AgentVault on Mantle mainnet
- ServiceRegistry, AgentBudget, DeliveryVerifier on Arbitrum Sepolia
