export type ArcSignalSourceStatus = "configured" | "needs_key" | "watchlist" | "blocked";
export type ArcSignalSourceCategory = "social" | "news" | "research" | "market" | "compliance";

export type ArcSignalSource = {
  id: string;
  name: string;
  provider: string;
  category: ArcSignalSourceCategory;
  status: ArcSignalSourceStatus;
  requiredEnv?: string;
  url: string;
  rfbFit: string[];
  userValue: string;
  judgeValue: string;
  signalContribution: string;
  riskLevel: "low" | "medium" | "high";
  riskNote: string;
};

export type ArcSignalSourceRadar = {
  mode: "off" | "watchlist" | "live";
  sources: ArcSignalSource[];
  summary: {
    total: number;
    configured: number;
    needsKey: number;
    watchlist: number;
    blocked: number;
  };
  missing: string[];
  recommendedActions: string[];
  ts: string;
};

type EnvLike = Record<string, string | undefined>;

type CatalogItem = Omit<ArcSignalSource, "status"> & {
  tokenKind?: "apify" | "leader_feed";
  blocked?: boolean;
};

const APIFY_TOKEN_ENV = "APIFY_TOKEN";
const LEADER_FEED_ENV = "ARC_LEADER_FEED_URL";

const CATALOG: CatalogItem[] = [
  {
    id: "copy-leader-feed",
    name: "Copy Leader Performance Feed",
    provider: "External JSON / Nansen export",
    category: "market",
    tokenKind: "leader_feed",
    requiredEnv: LEADER_FEED_ENV,
    url: "https://docs.nansen.ai/api/hyperliquid/hyperliquid-leaderboard",
    rfbFit: ["RFB 06", "RFB 04"],
    userValue: "Shows only verified copy leaders with supplied performance metrics instead of sample personas.",
    judgeValue: "Proves the copy-trading layer has a real data boundary and does not manufacture leader profiles.",
    signalContribution: "Feeds qualityScore, degradationScore, allocation caps, STOP/REDUCE/COPY actions, and leader profile pages.",
    riskLevel: "medium",
    riskNote: "Feed must include win rate, Sharpe, drawdown, recent PnL, liquidity, and recent losses per leader.",
  },
  {
    id: "reddit-trends",
    name: "Reddit Searcher / Subreddit Scraper",
    provider: "Apify",
    category: "social",
    tokenKind: "apify",
    requiredEnv: APIFY_TOKEN_ENV,
    url: "https://github.com/cporter202/API-mega-list/tree/main/social-media-apis-3268",
    rfbFit: ["RFB 06", "RFB 02"],
    userValue: "Surfaces retail trader sentiment and early concern around copy-trading leaders.",
    judgeValue: "Makes CopyGuard feel like a monitoring agent, not a static leaderboard.",
    signalContribution: "Feeds confidenceDrop and signalDivergence before the next allocation decision.",
    riskLevel: "low",
    riskNote: "Use public posts, store provenance, and avoid personal profile enrichment.",
  },
  {
    id: "crypto-twitter-tracker",
    name: "Crypto Twitter Tracker",
    provider: "Apify",
    category: "social",
    tokenKind: "apify",
    requiredEnv: APIFY_TOKEN_ENV,
    url: "https://github.com/cporter202/API-mega-list/tree/main/news-apis-590",
    rfbFit: ["RFB 06", "RFB 02"],
    userValue: "Tracks market-moving accounts and trader narratives that can precede copy-trader decay.",
    judgeValue: "Connects social trading intelligence to real-time public market chatter.",
    signalContribution: "Adds account-level sentiment and narrative crowding to reasoning traces.",
    riskLevel: "medium",
    riskNote: "Respect platform terms and degrade cleanly when the provider is unavailable.",
  },
  {
    id: "bluesky-mastodon",
    name: "Bluesky & Mastodon Scraper",
    provider: "Apify",
    category: "social",
    tokenKind: "apify",
    requiredEnv: APIFY_TOKEN_ENV,
    url: "https://github.com/cporter202/API-mega-list/tree/main/news-apis-590",
    rfbFit: ["RFB 06"],
    userValue: "Adds non-X social signal coverage where crypto research communities often move early.",
    judgeValue: "Shows broader market-interface thinking beyond one centralized social feed.",
    signalContribution: "Provides alternative social confirmation for leader risk alerts.",
    riskLevel: "low",
    riskNote: "Keep only public post metadata and source links in traces.",
  },
  {
    id: "crypto-news",
    name: "Awesome Crypto News / Google News Scraper",
    provider: "Apify",
    category: "news",
    tokenKind: "apify",
    requiredEnv: APIFY_TOKEN_ENV,
    url: "https://github.com/cporter202/API-mega-list/tree/main/news-apis-590",
    rfbFit: ["RFB 02", "RFB 04"],
    userValue: "Explains why CopyGuard changes allocation when market regime news shifts.",
    judgeValue: "Turns the reasoning trace into a sourced market memo instead of a black-box score.",
    signalContribution: "Feeds regimeChange, fundingShock, and riskOff explanations.",
    riskLevel: "low",
    riskNote: "Prefer headlines, summaries, timestamps, and links; avoid republishing full articles.",
  },
  {
    id: "article-extractor",
    name: "Article Text Extractor",
    provider: "Apify",
    category: "research",
    tokenKind: "apify",
    requiredEnv: APIFY_TOKEN_ENV,
    url: "https://github.com/cporter202/API-mega-list/tree/main/news-apis-590",
    rfbFit: ["RFB 02", "RFB 03"],
    userValue: "Normalizes user-supplied article links into concise source snippets for decisions.",
    judgeValue: "Shows trace provenance and source hygiene, which matters for asynchronous review.",
    signalContribution: "Attaches source summaries and hashes to paid reasoning traces.",
    riskLevel: "medium",
    riskNote: "Summarize and link; do not store or expose copyrighted full-text payloads.",
  },
  {
    id: "ai-search",
    name: "AI Search / Real-Time Web Search",
    provider: "Apify",
    category: "research",
    tokenKind: "apify",
    requiredEnv: APIFY_TOKEN_ENV,
    url: "https://github.com/cporter202/API-mega-list/tree/main/ai-apis-1208",
    rfbFit: ["RFB 02", "RFB 03"],
    userValue: "Lets users ask why a leader is risky and get current supporting sources.",
    judgeValue: "Makes the agent interface more useful while keeping evidence visible.",
    signalContribution: "Backfills source discovery for replay steps when primary feeds are sparse.",
    riskLevel: "low",
    riskNote: "Show retrieved links and confidence, not unsourced generated claims.",
  },
  {
    id: "crypto-arbitrage-scanner",
    name: "Crypto Arbitrage Scanner",
    provider: "Apify",
    category: "market",
    tokenKind: "apify",
    requiredEnv: APIFY_TOKEN_ENV,
    url: "https://github.com/cporter202/API-mega-list/tree/main/news-apis-590",
    rfbFit: ["RFB 05", "RFB 04"],
    userValue: "Flags venue stress that can make copy allocations fragile or expensive.",
    judgeValue: "Gives ArcMind a credible bridge toward cross-platform execution later.",
    signalContribution: "Adds spreadStress and slippageRisk to what-if simulation and allocation caps.",
    riskLevel: "medium",
    riskNote: "Use for warning and routing research first; do not auto-trade without exchange-specific safeguards.",
  },
  {
    id: "ai-finance-monitoring-agent",
    name: "AI Finance Monitoring Agent",
    provider: "Apify",
    category: "research",
    tokenKind: "apify",
    requiredEnv: APIFY_TOKEN_ENV,
    url: "https://github.com/cporter202/API-mega-list/tree/main/agents-apis-697",
    rfbFit: ["RFB 04"],
    userValue: "Adds macro and public-company spillover context for risk-off allocation.",
    judgeValue: "Shows the portfolio manager can reason across markets, not only crypto charts.",
    signalContribution: "Feeds macroRisk and institutionalFlow notes in the reasoning trace.",
    riskLevel: "low",
    riskNote: "Keep it advisory; do not present generated analysis as verified fact without sources.",
  },
  {
    id: "bloomberg-link-extractor",
    name: "Bloomberg News Link Extractor",
    provider: "Apify",
    category: "news",
    tokenKind: "apify",
    requiredEnv: APIFY_TOKEN_ENV,
    url: "https://github.com/cporter202/API-mega-list/tree/main/news-apis-590",
    rfbFit: ["RFB 02", "RFB 04"],
    userValue: "Adds institutional headline discovery for macro-sensitive copy positions.",
    judgeValue: "Demonstrates market-news coverage while staying within a safer link-only boundary.",
    signalContribution: "Adds headline-level institutionalNews events to decision replay.",
    riskLevel: "medium",
    riskNote: "Use links/headlines only. Do not bypass subscriptions or mirror paywalled content.",
  },
  {
    id: "bloomberg-paywall-bypass",
    name: "Bloomberg News Scraper with subscription bypass",
    provider: "Apify",
    category: "compliance",
    url: "https://github.com/cporter202/API-mega-list/tree/main/news-apis-590",
    rfbFit: [],
    userValue: "Not used.",
    judgeValue: "Blocked intentionally to keep the product legally and ethically clean.",
    signalContribution: "Excluded from all decision inputs.",
    riskLevel: "high",
    riskNote: "The listed description advertises subscription bypass behavior, so ArcMind should not integrate it.",
    blocked: true,
  },
];

function normalizeMode(v: string | undefined): ArcSignalSourceRadar["mode"] {
  if (v === "off" || v === "watchlist" || v === "live") return v;
  return "watchlist";
}

function statusFor(item: CatalogItem, env: EnvLike, mode: ArcSignalSourceRadar["mode"]): ArcSignalSourceStatus {
  if (item.blocked) return "blocked";
  if (mode === "off") return "watchlist";
  if (item.tokenKind === "apify" && !env[APIFY_TOKEN_ENV]) return "needs_key";
  if (item.tokenKind === "leader_feed" && !env[LEADER_FEED_ENV]) return "needs_key";
  if (mode === "live") return "configured";
  return "watchlist";
}

export function buildArcSignalSourceRadar(env: EnvLike = process.env): ArcSignalSourceRadar {
  const mode = normalizeMode(env.ARC_SIGNAL_SOURCE_MODE);
  const sources = CATALOG.map((item) => {
    const { tokenKind: _tokenKind, blocked: _blocked, ...source } = item;
    return {
      ...source,
      status: statusFor(item, env, mode),
    };
  });

  const summary = sources.reduce(
    (acc, source) => {
      acc.total += 1;
      if (source.status === "configured") acc.configured += 1;
      if (source.status === "needs_key") acc.needsKey += 1;
      if (source.status === "watchlist") acc.watchlist += 1;
      if (source.status === "blocked") acc.blocked += 1;
      return acc;
    },
    { total: 0, configured: 0, needsKey: 0, watchlist: 0, blocked: 0 },
  );

  const missing = new Set<string>();
  if (sources.some((source) => source.status === "needs_key" && source.requiredEnv === APIFY_TOKEN_ENV)) missing.add(APIFY_TOKEN_ENV);
  if (sources.some((source) => source.status === "needs_key" && source.requiredEnv === LEADER_FEED_ENV)) missing.add(LEADER_FEED_ENV);
  if (mode !== "live") missing.add("ARC_SIGNAL_SOURCE_MODE=live");

  const recommendedActions = [
    ...(missing.has(APIFY_TOKEN_ENV) ? ["Add APIFY_TOKEN to enable Apify-backed social/news source checks."] : []),
    ...(missing.has(LEADER_FEED_ENV) ? ["Add ARC_LEADER_FEED_URL to enable real copy-leader scoring; synthetic leaders stay hidden until then."] : []),
    ...(mode !== "live" ? ["Set ARC_SIGNAL_SOURCE_MODE=live after validating quotas, caching, and source terms."] : []),
    "Persist source ids, timestamps, and links in each paid reasoning trace.",
    "Keep paywalled/bypass actors blocked; use headline/link discovery instead.",
  ];

  return {
    mode,
    sources,
    summary,
    missing: Array.from(missing),
    recommendedActions,
    ts: new Date().toISOString(),
  };
}
