/**
 * @tollgate/sdk — the smallest possible client for an x402 (HTTP 402) paid API.
 *
 * One call, `fetchPaid(serviceId)`, runs the whole loop:
 *   GET /api/gateway/<id>           → 402 { challenge }
 *   build an X-PAYMENT proof         → GET /api/gateway/<id> with X-PAYMENT
 *   200 OK { data, receiptId, ... }  → return it
 *
 * Zero dependencies. Works in the browser, Node 18+, Bun, Deno, Cloudflare
 * Workers — anywhere there's a global `fetch` (or pass your own via `opts.fetch`).
 *
 * Default gateway: https://tollgate-1.onrender.com (the TollGate demo server).
 * Point `baseUrl` at your own deployment, or `http://localhost:8787` in dev.
 */

export const DEFAULT_BASE_URL = "https://tollgate-1.onrender.com";

export interface PaymentChallenge {
  challengeId: string;
  serviceId: string;
  amount: string;
  currency: string;
  network: string;
  payTo: string;
  requestHash: string;
  expiresAt: string;
}

export interface ServiceSummary {
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
}

/** Turn a 402 challenge into an X-PAYMENT proof object. Override to plug in a real wallet / facilitator. */
export type ProofBuilder = (challenge: PaymentChallenge) => Promise<Record<string, unknown>> | Record<string, unknown>;

export interface TollGateOptions {
  /** Gateway base URL (no trailing slash). Default: the TollGate demo server. */
  baseUrl?: string;
  /** Sent as `X-Agent-Id` — shows up on the receipt; also the default `payer`. */
  agentId?: string;
  /** Inject a fetch implementation (Node < 18, tests, custom transport). */
  fetch?: typeof fetch;
  /** Build the X-PAYMENT proof from the challenge. Default: an echo proof (challenge → proof) — enough for the demo gateway; swap for a real on-chain payment in production. */
  proof?: ProofBuilder;
  /** Use the server's `X-PAYMENT: dev-bypass` instead of a proof (server must run with NODE_ENV != production). */
  devBypass?: boolean;
}

export interface PaidResult<T = unknown> {
  /** The unlocked resource payload. */
  data: T;
  /** Receipt id for this paid call. */
  receiptId: string;
  /** Full receipt record from the gateway. */
  receipt: unknown;
  /** The 402 challenge that was paid (null if the gateway returned 200 without one). */
  challenge: PaymentChallenge | null;
  /** How payment was attested: a proof object, or dev-bypass. */
  via: "proof" | "dev-bypass";
  /** Human-readable note from the gateway (e.g. "x402 payment verified."). */
  note: string;
}

export class TollGateError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "TollGateError";
    this.status = status;
    this.body = body;
  }
}

function trim(url: string): string {
  return url.replace(/\/+$/, "");
}

/** The default proof: echo the challenge back. The demo gateway checks payTo/amount/asset/network match — no signature — so this unlocks; production wires a real payment here. */
function echoProof(agentId: string | undefined): ProofBuilder {
  return (ch) => ({
    challengeId: ch.challengeId,
    payTo: ch.payTo,
    amount: ch.amount,
    asset: ch.currency,
    network: ch.network,
    payer: agentId ?? "0x000000000000000000000000000000000000dEaD",
  });
}

function b64(s: string): string {
  if (typeof btoa === "function") return btoa(s);
  // Node / Bun
  const B = (globalThis as { Buffer?: { from(s: string, enc: string): { toString(enc: string): string } } }).Buffer;
  if (B) return B.from(s, "utf-8").toString("base64");
  throw new Error("No base64 encoder (need `btoa` or Node's `Buffer`).");
}

/** A configured TollGate client. */
export function createTollGate(opts: TollGateOptions = {}) {
  const baseUrl = trim(opts.baseUrl ?? DEFAULT_BASE_URL);
  const f: typeof fetch = opts.fetch ?? (globalThis.fetch as typeof fetch);
  if (typeof f !== "function") {
    throw new Error("No global fetch — pass one via { fetch } (Node < 18 needs `node-fetch` or `undici`).");
  }
  const agentHeader: Record<string, string> = opts.agentId ? { "X-Agent-Id": opts.agentId } : {};

  async function jget<T>(path: string, headers?: Record<string, string>): Promise<{ status: number; body: T }> {
    const r = await f(`${baseUrl}${path}`, { headers: { accept: "application/json", ...agentHeader, ...headers } });
    const text = await r.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: r.status, body: body as T };
  }

  return {
    baseUrl,

    /** The x402 discovery spec for this gateway (no payment). */
    async discover(workspace?: string): Promise<unknown> {
      const q = workspace ? `?workspace=${encodeURIComponent(workspace)}` : "";
      const { status, body } = await jget<unknown>(`/api/v1/x402-spec${q}`);
      if (status >= 400) throw new TollGateError(`discover failed (${status})`, status, body);
      return body;
    },

    /** List the paid services exposed by this gateway. */
    async listServices(workspace?: string): Promise<ServiceSummary[]> {
      const q = workspace ? `?workspace=${encodeURIComponent(workspace)}` : "";
      const { status, body } = await jget<{ services?: ServiceSummary[] }>(`/api/services${q}`);
      if (status >= 400) throw new TollGateError(`listServices failed (${status})`, status, body);
      return body?.services ?? [];
    },

    /** One paid call. Runs 402 → pay → retry → unlock. Returns the data + receipt. */
    async fetchPaid<T = unknown>(serviceId: string): Promise<PaidResult<T>> {
      const path = `/api/gateway/${encodeURIComponent(serviceId)}`;

      // 1) Unpaid request → expect 402 + challenge.
      const first = await jget<Record<string, unknown>>(path);
      if (first.status === 200) {
        const b = first.body as Record<string, unknown>;
        return { data: (b["data"] ?? b) as T, receiptId: String(b["receiptId"] ?? ""), receipt: b["receipt"] ?? null, challenge: null, via: opts.devBypass ? "dev-bypass" : "proof", note: String(b["note"] ?? "served without payment") };
      }
      if (first.status !== 402) {
        throw new TollGateError(`expected 402, got ${first.status}`, first.status, first.body);
      }
      const challenge = (first.body as { challenge?: PaymentChallenge }).challenge;
      if (!challenge || !challenge.challengeId) {
        throw new TollGateError("402 without a usable challenge", 402, first.body);
      }

      // 2) Build the X-PAYMENT header.
      let paymentHeader: string;
      let via: "proof" | "dev-bypass";
      if (opts.devBypass) {
        paymentHeader = "dev-bypass";
        via = "dev-bypass";
      } else {
        const build = opts.proof ?? echoProof(opts.agentId);
        const proofObj = await build(challenge);
        paymentHeader = b64(JSON.stringify(proofObj));
        via = "proof";
      }

      // 3) Pay & retry.
      const second = await jget<Record<string, unknown>>(path, { "X-PAYMENT": paymentHeader });
      if (second.status >= 400) {
        throw new TollGateError(`payment rejected (${second.status})`, second.status, second.body);
      }
      const b = second.body as Record<string, unknown>;
      return {
        data: (b["data"] ?? b) as T,
        receiptId: String(b["receiptId"] ?? ""),
        receipt: b["receipt"] ?? null,
        challenge,
        via,
        note: String(b["note"] ?? "x402 payment verified."),
      };
    },
  };
}

/** Convenience: one-shot paid fetch without keeping a client around. */
export async function fetchPaid<T = unknown>(serviceId: string, opts: TollGateOptions = {}): Promise<PaidResult<T>> {
  return createTollGate(opts).fetchPaid<T>(serviceId);
}
