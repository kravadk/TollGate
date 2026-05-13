const CG_URL = "https://api.coingecko.com/api/v3/simple/price";

const CG_IDS: Record<string, string> = {
  MNT: "mantle",
  ETH: "ethereum",
  BTC: "bitcoin",
  SUI: "sui",
  USDC: "usd-coin",
  ARB: "arbitrum",
  MATIC: "matic-network",
  DEEP: "deepbook-protocol",
  "0G": "zero-gravity-labs",
};

let cache: { prices: Record<string, number>; ts: number } | null = null;
const TTL = 60_000;

export async function fetchPrices(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.ts < TTL) return cache.prices;

  const ids = Object.values(CG_IDS).join(",");
  try {
    const res = await fetch(
      `${CG_URL}?ids=${ids}&vs_currencies=usd`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as Record<string, { usd: number }>;

    const prices: Record<string, number> = {};
    for (const [sym, id] of Object.entries(CG_IDS)) {
      prices[sym] = data[id]?.usd ?? 0;
    }
    cache = { prices, ts: Date.now() };
    return prices;
  } catch {
    return cache?.prices ?? Object.fromEntries(Object.keys(CG_IDS).map(k => [k, 0]));
  }
}

export async function fetchPrice(symbol: string): Promise<number> {
  const p = await fetchPrices();
  return p[symbol] ?? 0;
}
