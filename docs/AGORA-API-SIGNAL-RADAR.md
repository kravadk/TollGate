# ArcMind API Signal Radar

Status date: 2026-05-18

Source reviewed: https://github.com/cporter202/API-mega-list

This document turns API Mega List into an ArcMind-specific integration plan. The goal is not to attach random APIs. The goal is to make CopyGuard better at one job: detect when copy-trading leaders are decaying before users blindly follow them.

## Product Rule

No source is allowed to appear live unless it is actually configured. If a token, quota, or provider contract is missing, the UI must say `needs key` or `watchlist`.

## Prioritized Sources

| Priority | Source | Why it matters | Product surface |
| --- | --- | --- | --- |
| 1 | Reddit Searcher / Subreddit Scraper | Retail traders often discuss leaders, losses, exchange issues, and narrative shifts before those appear in a clean leaderboard. | Adds `confidenceDrop` and `signalDivergence` evidence to CopyGuard decisions. |
| 1 | Crypto Twitter Tracker | Crypto leader reputation and crowding shifts happen fastest on X-style feeds. | Adds narrative crowding and account-level alerts to Decision Replay. |
| 1 | Awesome Crypto News / Google News Scraper | Market-regime news explains why CopyGuard moves into USDC/USYC. | Adds sourced news bullets to paid reasoning traces. |
| 1 | Article Text Extractor | Users and judges need trace provenance that is readable and compact. | Normalizes links into summarized trace evidence without exposing full copyrighted text. |
| 2 | Bluesky & Mastodon Scraper | Gives a less centralized social signal source and avoids overfitting to one platform. | Adds secondary confirmation for social-trading alerts. |
| 2 | AI Search / Real-Time Web Search | Helps the agent find sources when a specific leader or market term is queried. | Makes “why is this leader risky?” answers source-backed. |
| 2 | Crypto Arbitrage Scanner | Venue spreads and slippage can make copied strategies fragile. | Feeds `slippageRisk` and what-if simulator warnings. |
| 2 | AI Finance Monitoring Agent | Macro and equity-market shocks can affect risk-off allocation. | Improves RFB 04 portfolio-manager narrative. |
| 3 | Bloomberg News Link Extractor | Institutional headlines can matter, but content rights are sensitive. | Link/headline discovery only. |

## Blocked Sources

Do not integrate actors that advertise subscription bypass or paywall bypass. The Bloomberg bypass-style scraper from the list is explicitly excluded. ArcMind can use headline/link discovery and public summaries, but it should not mirror paywalled content into traces.

## Implementation Path

1. Source catalog and health endpoint.
   - Done in `/api/arc-signal-sources`.
   - Shows configured, needs-key, watchlist, and blocked states.
   - Requires no fake data and does not claim live provider usage without credentials.

2. Frontend source radar.
   - Done in `/live`.
   - Shows judge-visible provider status, RFB fit, and source policy.

3. Provider adapters.
   - Create `server/src/arc-signal-adapters/`.
   - Start with Apify-backed adapters behind `APIFY_TOKEN`.
   - Add caching and rate limits before any live provider is called.

4. Trace provenance.
   - Store source id, source URL, collected timestamp, summary, and hash in each paid reasoning trace.
   - Never store private keys, full paywalled article bodies, or unsourced model claims.

5. Scoring integration.
   - Map Reddit/X/Bluesky social signals into `confidenceDrop` and `signalDivergence`.
   - Map news/search signals into regime/risk-off notes.
   - Map arbitrage/spread signals into `slippageRisk` for what-if simulation.

## Environment

Optional backend variables:

```bash
APIFY_TOKEN=<optional-apify-token>
ARC_SIGNAL_SOURCE_MODE=watchlist
```

Use `ARC_SIGNAL_SOURCE_MODE=live` only after quota, caching, and provider terms are validated.

## Judge Story

This feature helps the submission because it shows ArcMind is a real market-interface agent, not a static dashboard:

- Agentic Sophistication: more source-backed decisions and replay steps.
- Traction: users can understand which data providers are configured before trusting the agent.
- Circle Usage: source-backed decisions make paid USDC reasoning traces more valuable.
- Innovation: CopyGuard can monetize “why the agent thinks this leader is decaying,” not only the final copy/stop signal.
