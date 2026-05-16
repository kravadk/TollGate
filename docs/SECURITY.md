# Security Policy

## Supported Versions

| Version | Status |
|---|---|
| `main` branch | ✅ Actively supported |
| Older commits | ❌ No security backports |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, email: **dkravchuk680@gmail.com** with subject `[TollGate Security]`.

Include:
- A description of the issue
- Steps to reproduce
- Impact (what an attacker could achieve)
- Suggested fix (if you have one)

You'll get an acknowledgement within 48 hours. We aim to ship a fix within 7 days for critical issues.

## In-scope

- Smart contract vulnerabilities in `contracts/contracts/*.sol`
- Server-side issues in `server/src/*`: x402 challenge replay, MCP tool injection, RPC abuse, rate-limit bypass
- Frontend issues: XSS, prototype pollution, localStorage tampering
- Supply chain: malicious dependencies, lockfile poisoning

## Out-of-scope

- Demo wallets seeded in `data.ts`
- Dependencies' known CVEs already patched upstream (please report to the upstream maintainer first)
- Issues that require physical access to the user's device

## Bug bounty

We don't currently offer a paid bug bounty, but valid reports will be credited in `CHANGELOG.md` and the README acknowledgements section.

---

## Security controls (server)

### HTTP security headers

All responses from the Express server carry:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Block MIME-sniffing attacks |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referer leakage |
| `X-Permitted-Cross-Domain-Policies` | `none` | Block Flash/PDF cross-domain reads |

Vercel (frontend CDN) mirrors the same headers via `vercel.json`.

### Rate limiting

| Endpoint | Limit | Window |
|---|---|---|
| `POST /api/og/upload` | 10 req | 60 s / IP |
| `GET\|POST /api/gateway/:serviceId` | 30 req | 60 s / IP+serviceId |
| `POST /mcp` | 60 req | 60 s / IP |

Limits are enforced by `express-rate-limit`. Tune in `server/src/index.ts` and `server/src/routes.ts` before production.

### Input sanitisation

- **`X-Agent-Id` header** — truncated to 128 characters and stripped of non-printable bytes (`/[^\x20-\x7E]/g`) before being written to the receipt store or x402 log. Applies to `routes.ts`, `feeds.ts`, and `x402.ts`.
- **`X-Request-Id` header** — validated against `/^[a-zA-Z0-9_-]{1,64}$/` to prevent log injection. Invalid values are replaced with a server-generated UUID.
- **`/api/og/upload` body** — hard-capped at 50 KB (`content.length > 51200 → 413`).

### CORS

Default `CORS_ORIGIN=*` is intentional for the hackathon demo. **Tighten to your frontend domain** in any production deployment by setting the `CORS_ORIGIN` environment variable.

### x402 payment verification

- Each challenge is single-use, bound to a `requestHash` (SHA-256 of method + path + query + agent), and expires after 5 minutes.
- `txHash` in the payment proof is informational in this build; **full on-chain settlement verification** (Base Sepolia `eth_getTransactionReceipt` check against the challenge's `payTo` and `amount`) is a documented next step before production use.
- The `X-PAYMENT: dev-bypass` shortcut is **disabled in production** (`NODE_ENV=production`).

### MCP SSRF surface

`create_service` in `server/src/mcp.ts` accepts an arbitrary `endpoint` URL. In production, add an allowlist or blocklist of internal/metadata URLs (e.g. `169.254.169.254`, `localhost`, `::1`) before enabling the MCP server publicly.

### Receipt NFT mint

The server mints an ERC-721 receipt NFT to the `payer` address extracted from the `X-PAYMENT` header. The header is client-supplied; there is no ownership proof beyond the on-chain `txHash`. Treat minted receipts as informational, not as proof of identity.

---

## Operational notes

### Private key hygiene

**Critical:** Any private key that appeared in `.env` files, chat logs, or source code must be rotated before mainnet use.

Steps:
1. Generate a new deployer wallet (`cast wallet new` or Hardhat).
2. Sweep remaining balance from the old key to the new wallet.
3. Redeploy contracts from the new key (or transfer ownership if contracts support `Ownable`).
4. Update `.env`, `server/.env`, and all Render/Vercel environment variables.
5. Revoke the old key from any CI/CD secrets store.

Never commit private keys to git. Add `*.env` and `.env.*` to `.gitignore` and confirm with `git diff --cached` before every push.

### Batch payout address validation

`BatchPayoutConsole` in `ArbitrumExtraWidgets.tsx` validates recipient addresses with a full hex regex (`/^0x[0-9a-fA-F]{40}$/`) before submitting on-chain transactions.

### Dependency supply chain

- Run `npm audit` and `cd server && npm audit` periodically.
- Pin dependency versions in `package.json` for the server (the gateway handles real on-chain flows).
- Never `npm install` from untrusted private registries.

### Secrets in environment variables

All sensitive values must be in `.env.local` (frontend) or `server/.env` (server), **never** in `vite.config.ts`, source files, or commit history. The `.gitignore` already excludes `.env*` at the root level; verify it excludes `server/.env` too.
