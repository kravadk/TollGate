/** ServiceRegistry client — discover and register paid x402 services.
 *
 * Live path: calls GET /api/services (with optional workspace filter).
 * Simulation path (no API): uses localStorage "registry.services" seeded by DiscoveryWidget.
 */

const API_BASE = (import.meta.env as Record<string, string | undefined>)["VITE_API_BASE"]?.replace(/\/+$/, "") ?? "";

export type RegistryEntry = {
  serviceId: string;
  name: string;
  priceUsd: number;
  currency?: string;
  network?: string;
  endpoint: string;      // gateway URL
  provider?: string;     // wallet address of provider
  description?: string;
  status?: string;
};

/** Discover services. Tries the live API, falls back to localStorage. */
export async function discoverServices(opts: {
  query?: string;
  maxPriceUsd?: number;
  workspace?: string;
} = {}): Promise<RegistryEntry[]> {
  if (API_BASE) {
    try {
      const params = new URLSearchParams();
      if (opts.workspace) params.set("workspace", opts.workspace);
      const res = await fetch(`${API_BASE}/api/services?${params}`);
      if (res.ok) {
        const j = (await res.json()) as { services?: RegistryEntry[] };
        let pool = j.services ?? [];
        if (opts.query) {
          const q = opts.query.toLowerCase();
          pool = pool.filter((s) =>
            s.name.toLowerCase().includes(q) ||
            s.serviceId.toLowerCase().includes(q) ||
            (s.description ?? "").toLowerCase().includes(q)
          );
        }
        if (typeof opts.maxPriceUsd === "number") {
          pool = pool.filter((s) => s.priceUsd <= (opts.maxPriceUsd as number));
        }
        return pool.sort((a, b) => a.priceUsd - b.priceUsd);
      }
    } catch { /* fall through to localStorage */ }
  }

  // Simulation: read from DiscoveryWidget's localStorage key
  try {
    const raw = localStorage.getItem("registry.services");
    const all: RegistryEntry[] = raw ? JSON.parse(raw) : [];
    let pool = all;
    if (opts.query) {
      const q = opts.query.toLowerCase();
      pool = pool.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.serviceId.toLowerCase().includes(q)
      );
    }
    if (typeof opts.maxPriceUsd === "number") {
      pool = pool.filter((s) => s.priceUsd <= (opts.maxPriceUsd as number));
    }
    return pool.sort((a, b) => a.priceUsd - b.priceUsd);
  } catch {
    return [];
  }
}

/** Get a single service by id. */
export async function getService(serviceId: string): Promise<RegistryEntry | null> {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/services/${encodeURIComponent(serviceId)}`);
      if (res.ok) return (await res.json()) as RegistryEntry;
    } catch { /* fall through */ }
  }

  try {
    const raw = localStorage.getItem("registry.services");
    const all: RegistryEntry[] = raw ? JSON.parse(raw) : [];
    return all.find((s) => s.serviceId === serviceId) ?? null;
  } catch {
    return null;
  }
}

/** Get the USD price for a service (returns null if not found). */
export async function getPrice(serviceId: string): Promise<number | null> {
  const s = await getService(serviceId);
  return s ? s.priceUsd : null;
}

/** Register a service in the local registry (simulation — no on-chain tx from the browser).
 *  Real on-chain registration: `npx hardhat run contracts/scripts/deploy-service-registry.mjs` */
export function registerService(entry: RegistryEntry): void {
  try {
    const raw = localStorage.getItem("registry.services");
    const all: RegistryEntry[] = raw ? JSON.parse(raw) : [];
    const idx = all.findIndex((s) => s.serviceId === entry.serviceId);
    if (idx >= 0) { all[idx] = entry; } else { all.unshift(entry); }
    localStorage.setItem("registry.services", JSON.stringify(all));
  } catch { /* storage unavailable */ }
}
