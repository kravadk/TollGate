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

## Operational notes

- **Key rotation:** Any private key that appeared in chat logs or source must be rotated before mainnet use. Sweep to a fresh wallet, update `.env`/Render env vars.
- **CORS:** Default `CORS_ORIGIN` should be tightened to your frontend domain in production (not `*`).
- **Rate limiting:** `/mcp` and `/api/gateway/*` are protected with `express-rate-limit`. Adjust limits in `server/src/index.ts` for higher-traffic deployments.
- **`X-PAYMENT` proof:** `txHash` in the proof is informational in this hackathon build; full on-chain settlement verification is a documented next step before production use.
