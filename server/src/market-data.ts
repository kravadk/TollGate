export type MarketSourceStatus = "live" | "unavailable" | "skipped";

export type MarketSourceState = {
  provider: "Hyperliquid" | "Binance" | "Coinbase" | "CoinGecko";
  status: MarketSourceStatus;
  price?: number;
  detail?: string;
};

export type EthMarketPrice = {
  price: number | null;
  provider?: MarketSourceState["provider"];
  sources: MarketSourceState[];
};

function finitePrice(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchHyperliquidEth(): Promise<MarketSourceState> {
  try {
    const res = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "allMids" }),
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return { provider: "Hyperliquid", status: "unavailable", detail: `HTTP ${res.status}` };
    const data = await res.json() as Record<string, unknown>;
    const price = finitePrice(data["ETH"]);
    return price
      ? { provider: "Hyperliquid", status: "live", price }
      : { provider: "Hyperliquid", status: "unavailable", detail: "ETH mid missing" };
  } catch (err) {
    return { provider: "Hyperliquid", status: "unavailable", detail: err instanceof Error ? err.message : "fetch failed" };
  }
}

async function fetchBinanceEth(): Promise<MarketSourceState> {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", {
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return { provider: "Binance", status: "unavailable", detail: `HTTP ${res.status}` };
    const data = await res.json() as { price?: unknown };
    const price = finitePrice(data.price);
    return price
      ? { provider: "Binance", status: "live", price }
      : { provider: "Binance", status: "unavailable", detail: "price missing" };
  } catch (err) {
    return { provider: "Binance", status: "unavailable", detail: err instanceof Error ? err.message : "fetch failed" };
  }
}

async function fetchCoinbaseEth(): Promise<MarketSourceState> {
  try {
    const res = await fetch("https://api.exchange.coinbase.com/products/ETH-USD/ticker", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return { provider: "Coinbase", status: "unavailable", detail: `HTTP ${res.status}` };
    const data = await res.json() as { price?: unknown };
    const price = finitePrice(data.price);
    return price
      ? { provider: "Coinbase", status: "live", price }
      : { provider: "Coinbase", status: "unavailable", detail: "price missing" };
  } catch (err) {
    return { provider: "Coinbase", status: "unavailable", detail: err instanceof Error ? err.message : "fetch failed" };
  }
}

async function fetchCoinGeckoEth(): Promise<MarketSourceState> {
  const key = process.env.COINGECKO_API_KEY;
  if (!key) return { provider: "CoinGecko", status: "skipped", detail: "COINGECKO_API_KEY not configured" };
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", {
      headers: { "x-cg-demo-api-key": key },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return { provider: "CoinGecko", status: "unavailable", detail: `HTTP ${res.status}` };
    const data = await res.json() as { ethereum?: { usd?: unknown } };
    const price = finitePrice(data.ethereum?.usd);
    return price
      ? { provider: "CoinGecko", status: "live", price }
      : { provider: "CoinGecko", status: "unavailable", detail: "ETH USD missing" };
  } catch (err) {
    return { provider: "CoinGecko", status: "unavailable", detail: err instanceof Error ? err.message : "fetch failed" };
  }
}

export async function fetchEthMarketPrice(): Promise<EthMarketPrice> {
  const sources = await Promise.all([
    fetchHyperliquidEth(),
    fetchBinanceEth(),
    fetchCoinbaseEth(),
    fetchCoinGeckoEth(),
  ]);
  const live = sources.find((source) => source.status === "live" && typeof source.price === "number");
  return {
    price: live?.price ?? null,
    provider: live?.provider,
    sources,
  };
}
