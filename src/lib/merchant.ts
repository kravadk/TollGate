/** Merchant Mode — no-wallet API publisher helpers.
 *
 * A "merchant" is anyone who wants to monetize an existing HTTP endpoint via TollGate.
 * They paste their endpoint URL + set a price → get a live TollGate gateway URL.
 * Revenue accumulates in localStorage (simulation); real payout calls the server wallet.
 */

export type MerchantService = {
  id: string;             // svc_merchant_<random>
  name: string;
  endpoint: string;       // the developer's original URL
  priceUsd: number;
  payoutAddress: string;  // where earnings go (server-custodied or own wallet)
  createdAt: string;
  revenue: number;        // USD earned
  callCount: number;
};

const STORAGE_KEY = "merchant.services";

export function listMerchantServices(): MerchantService[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as MerchantService[];
  } catch {
    return [];
  }
}

export function createMerchantService(opts: {
  name: string;
  endpoint: string;
  priceUsd: number;
  payoutAddress?: string;
}): MerchantService {
  const svc: MerchantService = {
    id: `svc_merchant_${Math.random().toString(36).slice(2, 9)}`,
    name: opts.name,
    endpoint: opts.endpoint,
    priceUsd: Math.max(0, opts.priceUsd),
    payoutAddress: opts.payoutAddress ?? "server-custodied",
    createdAt: new Date().toISOString(),
    revenue: 0,
    callCount: 0,
  };
  const all = listMerchantServices();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([svc, ...all]));
  return svc;
}

export function recordMerchantCall(serviceId: string): MerchantService | null {
  const all = listMerchantServices();
  const idx = all.findIndex((s) => s.id === serviceId);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], revenue: all[idx].revenue + all[idx].priceUsd, callCount: all[idx].callCount + 1 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all[idx];
}

export function deleteMerchantService(serviceId: string): void {
  const all = listMerchantServices().filter((s) => s.id !== serviceId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

/** Build the TollGate gateway URL for a merchant service. */
export function gatewayUrlFor(serviceId: string, apiBase: string): string {
  return `${apiBase}/api/gateway/${serviceId}`;
}
