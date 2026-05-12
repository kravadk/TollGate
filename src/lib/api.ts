// Thin client for the TollGate server (../server). Optional: if the
// server isn't running, callers fall back to the in-app simulation.
//
// Base URL: import.meta.env.VITE_API_BASE (e.g. https://tollgate-server.onrender.com)
// — defaults to http://localhost:8787 in dev. Set VITE_API_BASE="" to hard-disable.

const RAW_BASE = (import.meta.env.VITE_API_BASE ?? "http://localhost:8787") as string;
export const API_BASE = RAW_BASE.replace(/\/+$/, "");
export const API_ENABLED = API_BASE.length > 0;

export type ServerService = {
  id: string;
  name: string;
  provider: string;
  providerWallet: string;
  category: string;
  priceUsd: number;
  currency: string;
  network: string;
  description: string;
  status: "active" | "paused";
  workspaceIds: string[];
  gatewayUrl: string;
  sampleResponse: unknown;
};

export type X402Challenge = {
  challengeId: string;
  serviceId: string;
  amount: string;
  currency: string;
  network: string;
  payTo: string;
  requestHash: string;
  expiresAt: string;
};

export type ServerReceipt = {
  id: string;
  challengeId: string;
  workspaceId: string;
  serviceId: string;
  serviceName: string;
  agentId: string;
  payerWallet: string;
  providerWallet: string;
  amount: number;
  currency: string;
  network: string;
  txHash?: string;
  requestHash: string;
  status: string;
  createdAt: string;
  paidAt?: string;
  verifiedAt?: string;
};

export type UnlockedResponse = {
  serviceId: string;
  name: string;
  data: unknown;
  receiptId: string;
  receipt: ServerReceipt;
  note: string;
};

async function jget<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers: { accept: "application/json", ...(init?.headers ?? {}) } });
  const text = await r.text();
  let body: unknown;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) {
    const err = new Error(`${r.status} ${r.statusText}`) as Error & { status: number; body: unknown };
    err.status = r.status;
    err.body = body;
    throw err;
  }
  return body as T;
}

/** Is the server reachable? Resolves false on any network/timeout error. */
export async function ping(timeoutMs = 2500): Promise<boolean> {
  if (!API_ENABLED) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await jget("/api/status/health", { signal: ctrl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export function listServices(workspace?: string): Promise<{ services: ServerService[]; count: number }> {
  const q = workspace ? `?workspace=${encodeURIComponent(workspace)}` : "";
  return jget(`/api/services${q}`);
}

export function getSpec(workspace?: string): Promise<unknown> {
  const q = workspace ? `?workspace=${encodeURIComponent(workspace)}` : "";
  return jget(`/api/v1/x402-spec${q}`);
}

/** Send an UNPAID request to the gateway. Returns the 402 challenge body (throws only on non-402 errors). */
export async function gatewayUnpaid(serviceId: string, agentId?: string): Promise<{ status: number; challenge: X402Challenge; raw: unknown }> {
  const r = await fetch(`${API_BASE}/api/gateway/${encodeURIComponent(serviceId)}`, {
    headers: { accept: "application/json", ...(agentId ? { "X-Agent-Id": agentId } : {}) },
  });
  const raw = await r.json().catch(() => ({}));
  if (r.status !== 402) {
    const err = new Error(`expected 402, got ${r.status}`) as Error & { status: number; body: unknown };
    err.status = r.status; err.body = raw;
    throw err;
  }
  return { status: r.status, challenge: (raw as { challenge: X402Challenge }).challenge, raw };
}

/** Pay & retry. With no proof → uses dev-bypass (server must be in non-production mode). */
export async function gatewayPay(serviceId: string, opts?: { agentId?: string; proof?: Record<string, unknown> }): Promise<UnlockedResponse> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts?.agentId) headers["X-Agent-Id"] = opts.agentId;
  headers["X-PAYMENT"] = opts?.proof ? btoa(JSON.stringify(opts.proof)) : "dev-bypass";
  return jget<UnlockedResponse>(`/api/gateway/${encodeURIComponent(serviceId)}`, { headers });
}

export function listReceipts(filter?: { workspace?: string; service?: string; agent?: string }): Promise<{ receipts: ServerReceipt[]; count: number }> {
  const q = new URLSearchParams();
  if (filter?.workspace) q.set("workspace", filter.workspace);
  if (filter?.service) q.set("service", filter.service);
  if (filter?.agent) q.set("agent", filter.agent);
  const s = q.toString();
  return jget(`/api/receipts${s ? `?${s}` : ""}`);
}

export function getActivity(): Promise<{ totalCalls: number; byKind: Record<string, number>; paid: number; rejected: number; challenges402: number; replays: number; mcpCalls: number; recent: { timestamp: number; kind: string; detail?: string }[] }> {
  return jget(`/api/status/activity`);
}
