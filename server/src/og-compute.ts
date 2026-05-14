/**
 * Real 0G Compute Network inference via the official serving broker
 * (@0gfoundation/0g-compute-ts-sdk). Flow per the 0G docs
 * (0gfoundation/0g-doc → developer-hub/building-on-0g/compute-network/inference.md):
 *
 *   broker  = await createZGComputeNetworkBroker(wallet)            // ethers.Wallet (or signer)
 *   // one-time funding (do this once with a funded wallet, NOT per request):
 *   //   await broker.ledger.depositFund(10)                        // ≥ 3 OG
 *   //   await broker.ledger.transferFund(provider, 'inference', BigInt(1) * BigInt(10 ** 18))   // ≥ 1 OG locked
 *   await broker.inference.acknowledgeProviderSigner?.(provider)    // some SDK versions need this
 *   { endpoint, model } = await broker.inference.getServiceMetadata(provider)
 *   headers = await broker.inference.getRequestHeaders(provider)    // auth headers for the next call
 *   res  = POST `${endpoint}/chat/completions`  { model, messages:[{role:"user",content:prompt}] }
 *   chatID = res.headers.get("ZG-Res-Key") ?? data.id
 *   verified = await broker.inference.processResponse(provider, chatID)   // optional TEE-signature check
 *
 * Gated by OG_COMPUTE_PRIVATE_KEY: if unset → { ok:false, reason:"compute_not_configured" }
 * so the frontend can fall back to its deterministic demo path. Requires the wallet to hold a
 * funded 0G Compute ledger (≥3 OG total, ≥1 OG locked to the provider — faucet.0g.ai for testnet).
 * Install the SDK in `server/`:  npm install @0gfoundation/0g-compute-ts-sdk
 */

const OG_COMPUTE_KEY  = process.env.OG_COMPUTE_PRIVATE_KEY ?? "";
// 0G Compute runs on the Galileo testnet by default (that's where faucet.0g.ai works);
// override with OG_COMPUTE_RPC. Kept separate from OG_RPC_URL (which 0G Storage uses).
const OG_EVM_RPC      = process.env.OG_COMPUTE_RPC         ?? "https://evmrpc-testnet.0g.ai";
// Default = a public 0G testnet provider (qwen 2.5 7b) from the docs; override via OG_COMPUTE_PROVIDER
// with a current address from compute-marketplace.0g.ai.
const OG_COMPUTE_PROV = process.env.OG_COMPUTE_PROVIDER    ?? "0xa48f01287233509FD694a22Bf840225062E67836";

export type ComputeResult =
  | { ok: true; content: string; model: string; provider: string; chatID: string; verified: boolean; endpoint: string }
  | { ok: false; reason: "compute_not_configured" | "error"; message?: string };

// Loose typings for the dynamically-imported broker — keeps the build independent of the SDK.
type Broker = {
  inference: {
    acknowledgeProviderSigner?: (provider: string) => Promise<void>;
    getServiceMetadata: (provider: string) => Promise<{ endpoint: string; model: string }>;
    getRequestHeaders: (provider: string) => Promise<Record<string, string>>;
    processResponse: (provider: string, chatID: string) => Promise<boolean>;
  };
};

let cached: { broker: Broker; acked: Set<string> } | null = null;

// Indirected through a variable so the build stays green whether or not the package is
// installed (dynamic import of a non-literal → Promise<any>, no module-resolution error).
const COMPUTE_SDK_PKG = "@0gfoundation/0g-compute-ts-sdk" as string;

async function getBroker(): Promise<Broker> {
  if (cached) return cached.broker;
  const [sdkMod, ethersMod] = await Promise.all([
    import(COMPUTE_SDK_PKG),
    import("ethers"),
  ]);
  const { createZGComputeNetworkBroker } = sdkMod as unknown as {
    createZGComputeNetworkBroker: (signer: unknown) => Promise<Broker>;
  };
  const { ethers } = ethersMod;
  const wallet = new ethers.Wallet(OG_COMPUTE_KEY, new ethers.JsonRpcProvider(OG_EVM_RPC));
  const broker = await createZGComputeNetworkBroker(wallet);
  cached = { broker, acked: new Set() };
  return broker;
}

export async function runOgInference(prompt: string, modelHint?: string): Promise<ComputeResult> {
  if (!OG_COMPUTE_KEY) return { ok: false, reason: "compute_not_configured" };
  const provider = OG_COMPUTE_PROV;
  try {
    const broker = await getBroker();

    // Acknowledge the provider's signer once (newer SDK versions skip this — hence optional + try/catch).
    if (!cached!.acked.has(provider)) {
      try { await broker.inference.acknowledgeProviderSigner?.(provider); } catch { /* not needed / already acked */ }
      cached!.acked.add(provider);
    }

    const meta = await broker.inference.getServiceMetadata(provider);
    const model = modelHint || meta.model;
    const headers = await broker.inference.getRequestHeaders(provider);

    const base = meta.endpoint.replace(/\/+$/, "");
    const url = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`provider ${res.status} ${res.statusText}`);
    const data = (await res.json()) as { id?: string; choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    const chatID = res.headers.get("ZG-Res-Key") ?? data.id ?? "";

    let verified = false;
    try { verified = await broker.inference.processResponse(provider, chatID); } catch { /* TEE check best-effort */ }

    return { ok: true, content, model, provider, chatID, verified, endpoint: base };
  } catch (err) {
    return { ok: false, reason: "error", message: (err as Error).message?.slice(0, 200) };
  }
}
