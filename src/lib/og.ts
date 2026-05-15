/* 0G on-chain glue for the frontend.
 *
 * Two real-but-optional capabilities, wired the same way the server's `dev-bypass`
 * works — present only when configured, otherwise the app degrades gracefully:
 *
 *   1. Anchor an x402 receipt on 0G by calling AgentReceiptRegistry.record(...)
 *      from the connected wallet. Needs VITE_0G_REGISTRY_ADDRESS (deploy it with
 *      `cd contracts && npm run deploy:0g`).
 *   2. Store a blob on 0G Storage via the indexer's HTTP gateway. Needs
 *      VITE_0G_STORAGE_INDEXER; otherwise it returns a deterministic root so the
 *      Pin widget still has something to show.
 *
 * Nothing here breaks the build or the demo when the env is unset.
 */
import { BrowserProvider, Contract, verifyMessage } from "ethers";
import { sha256Hex } from "./util-hash";
import type { NetworkMode } from "./chains";

function env(key: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return v && v.trim() ? v.trim() : undefined;
}

/** 0G mainnet chain id, as the hex MetaMask uses. Override with VITE_0G_CHAIN_ID. */
export const OG_DEFAULT_CHAIN_HEX = "0x4115"; // 16661 — 0G mainnet
/** Params to pass MetaMask if it doesn't yet know the 0G chain (used as a fallback when switching fails). */
const OG_ADD_CHAIN = {
  "0x4115": {
    chainId: "0x4115",
    chainName: "0G Mainnet",
    nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
    rpcUrls: ["https://evmrpc.0g.ai"],
    blockExplorerUrls: ["https://chainscan.0g.ai"],
  },
} as const;

export type OgConfig = {
  registryAddress: string | null;
  explorerBase: string;       // no trailing slash
  chainHex: string;           // lowercase 0x…
  storageIndexer: string | null;
};

export function getOgConfig(mode?: NetworkMode): OgConfig {
  const isTestnet = mode === "testnet";
  const defaultExplorer = isTestnet ? "https://chainscan-galileo.0g.ai" : "https://chainscan.0g.ai";
  const defaultChainHex = isTestnet ? "0x40da" : OG_DEFAULT_CHAIN_HEX;
  const registryVar = isTestnet ? "VITE_0G_TESTNET_REGISTRY_ADDRESS" : "VITE_0G_REGISTRY_ADDRESS";
  const explorer = (env("VITE_0G_EXPLORER") ?? defaultExplorer).replace(/\/+$/, "");
  const chainRaw = env("VITE_0G_CHAIN_ID");
  let chainHex = defaultChainHex;
  if (chainRaw && !isTestnet) chainHex = chainRaw.startsWith("0x") ? chainRaw.toLowerCase() : "0x" + Number(chainRaw).toString(16);
  return {
    registryAddress: env(registryVar) ?? null,
    explorerBase: explorer,
    chainHex,
    storageIndexer: env("VITE_0G_STORAGE_INDEXER") ?? null,
  };
}

/** True when an AgentReceiptRegistry address is configured — gates the "Anchor on 0G" UI. */
export function isOgRegistryConfigured(): boolean {
  return getOgConfig().registryAddress !== null;
}

export function ogExplorerTxUrl(txHash: string): string {
  return `${getOgConfig().explorerBase}/tx/${txHash}`;
}
export function ogExplorerAddrUrl(addr: string): string {
  return `${getOgConfig().explorerBase}/address/${addr}`;
}

const REGISTRY_ABI = [
  "function record(bytes32 receiptHash, bytes32 payloadHash) returns (uint256 index)",
  "function total() view returns (uint256)",
  "function isRecorded(bytes32 receiptHash) view returns (bool)",
  "function recordedBy(address) view returns (uint256)",
  "event ReceiptRecorded(address indexed payer, bytes32 indexed receiptHash, bytes32 payloadHash, uint256 index, uint64 timestamp)",
];

function to0xBytes32(hex: string): string {
  const clean = hex.replace(/^0x/, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) throw new Error("Expected a 32-byte (64 hex char) value");
  return "0x" + clean;
}

export type AnchorResult = {
  txHash: string;
  explorerUrl: string;
  index: number | null;
  chainHex: string;
  registryAddress: string;
};

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

/**
 * Send a real AgentReceiptRegistry.record(receiptHash, payloadHash) tx from the
 * connected wallet. The wallet must already be on the 0G chain. Throws a clear
 * error otherwise — callers surface it inline.
 */
export async function anchorReceiptOnChain(params: {
  receiptHashHex: string;     // SHA-256 hex (with or without 0x)
  payloadHashHex?: string;    // SHA-256 hex; defaults to zero
}): Promise<AnchorResult> {
  const cfg = getOgConfig();
  if (!cfg.registryAddress) throw new Error("0G registry not configured (set VITE_0G_REGISTRY_ADDRESS).");
  const eth = (typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined);
  if (!eth) throw new Error("No EIP-1193 wallet detected — install MetaMask.");

  const currentChain = (await eth.request({ method: "eth_chainId" })) as string;
  if (currentChain.toLowerCase() !== cfg.chainHex) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainHex }] });
    } catch (err) {
      // 4902 = chain unknown to the wallet → offer to add it (only for chains we have params for)
      const code = (err as { code?: number }).code;
      const addParams = (OG_ADD_CHAIN as Record<string, unknown>)[cfg.chainHex];
      if (code === 4902 && addParams) {
        try {
          await eth.request({ method: "wallet_addEthereumChain", params: [addParams] });
        } catch {
          throw new Error(`Add the 0G chain (${cfg.chainHex}) to your wallet and retry.`);
        }
      } else {
        throw new Error(`Wallet is on ${currentChain}; switch it to the 0G chain (${cfg.chainHex}) and retry.`);
      }
    }
  }

  const provider = new BrowserProvider(eth as never);
  const signer = await provider.getSigner();
  const registry = new Contract(cfg.registryAddress, REGISTRY_ABI, signer);

  const receiptHash = to0xBytes32(params.receiptHashHex);
  const payloadHash = params.payloadHashHex ? to0xBytes32(params.payloadHashHex) : "0x" + "0".repeat(64);

  const tx = await registry.record(receiptHash, payloadHash);
  const receipt = await tx.wait();

  let index: number | null = null;
  try {
    for (const log of receipt?.logs ?? []) {
      const parsed = registry.interface.parseLog(log);
      if (parsed?.name === "ReceiptRecorded") { index = Number(parsed.args.index); break; }
    }
  } catch { /* index stays null */ }

  return {
    txHash: tx.hash as string,
    explorerUrl: ogExplorerTxUrl(tx.hash as string),
    index,
    chainHex: cfg.chainHex,
    registryAddress: cfg.registryAddress,
  };
}

export type StorageResult = {
  root: string;            // 0x… Merkle root (real 0G or sha256 fallback)
  simulated: boolean;      // true = sha256 only (SDK unavailable); false = real 0G root
  merkleComputed?: boolean; // true = real 0G Merkle root via SDK
  onChain?: boolean;       // true = committed to FixedPriceFlow on-chain
  txHash?: string;         // set when onChain = true
  explorerUrl?: string;
  nodeUrl?: string;
  error?: string;
};

const API_BASE = (import.meta.env as Record<string, string | undefined>)["VITE_API_BASE"]?.replace(/\/+$/, "") ?? "";

/**
 * Upload a text blob to 0G Storage. Attempts, in order:
 *   1. Direct 0G Storage Indexer (VITE_0G_STORAGE_INDEXER) — real, no server needed.
 *   2. Server-side endpoint (VITE_API_BASE/api/og/upload) — real, uses @0glabs/0g-ts-sdk.
 *   3. sha256 fallback — deterministic root, nothing stored on-chain.
 */
export async function uploadToOgStorage(content: string): Promise<StorageResult> {
  const sha = await sha256Hex(content);
  const fallback: StorageResult = { root: "0x" + sha, simulated: true };
  const cfg = getOgConfig();

  // Path 1: direct indexer upload (no private key needed on client side)
  if (cfg.storageIndexer) {
    try {
      const b64 = btoa(unescape(encodeURIComponent(content)));
      const res = await fetch(`${cfg.storageIndexer}/api/v1/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: b64, tags: ["agentpay"] }),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) {
        const j = (await res.json()) as { root?: string; hash?: string; fileHash?: string };
        const root = j.root ?? j.hash ?? j.fileHash;
        if (root) {
          return {
            root: root.startsWith("0x") ? root : "0x" + root,
            simulated: false,
            merkleComputed: true,
            nodeUrl: cfg.storageIndexer,
          };
        }
      }
    } catch { /* fall through */ }
  }

  // Path 2: server-side (VITE_API_BASE)
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/og/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const j = (await res.json()) as {
          ok?: boolean; root?: string; txHash?: string; explorerUrl?: string;
          simulated?: boolean; onChain?: boolean; merkleComputed?: boolean;
          nodeUrl?: string; error?: string;
        };
        if (j.ok && j.root) {
          return {
            root: j.root,
            simulated: j.simulated ?? false,
            merkleComputed: j.merkleComputed,
            onChain: j.onChain,
            txHash: j.txHash || undefined,
            explorerUrl: j.explorerUrl || undefined,
            nodeUrl: j.nodeUrl || undefined,
            error: j.error || undefined,
          };
        }
      }
    } catch { /* fall through */ }
  }

  return fallback;
}

export type OgInferenceResult =
  | { ok: true; content: string; model: string; provider: string; chatID: string; verified: boolean }
  | { ok: false; reason: "compute_not_configured" | "no_server" | "error"; message?: string };

/**
 * Run a real inference job on the 0G Compute Network via POST /api/og/compute
 * (server-side, uses OG_COMPUTE_PRIVATE_KEY). Returns { ok:false, reason } when
 * the server has no compute key configured / is unreachable — callers fall back
 * to their local demo path.
 */
export async function runOgInference(prompt: string, model?: string): Promise<OgInferenceResult> {
  if (!API_BASE) return { ok: false, reason: "no_server" };
  try {
    const res = await fetch(`${API_BASE}/api/og/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model }),
      signal: AbortSignal.timeout(45000),
    });
    if (res.status === 503) return { ok: false, reason: "compute_not_configured" };
    const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok && j["ok"] === true && typeof j["content"] === "string") {
      return {
        ok: true,
        content: j["content"] as string,
        model: typeof j["model"] === "string" ? j["model"] : "",
        provider: typeof j["provider"] === "string" ? j["provider"] : "",
        chatID: typeof j["chatID"] === "string" ? j["chatID"] : "",
        verified: Boolean(j["verified"]),
      };
    }
    return { ok: false, reason: "error", message: typeof j["message"] === "string" ? (j["message"] as string) : undefined };
  } catch {
    return { ok: false, reason: "error", message: "request failed / timed out" };
  }
}

// ── Cryptographic receipts (W5: payer signs, anyone verifies) ───────────────
// A receipt is "cryptographically verified" when (1) an EIP-191 signature over its
// canonical message recovers to the payer's address, and (2) the same receipt hash
// is recorded in AgentReceiptRegistry on 0G. Both checks run client-side.

/** The canonical message a payer signs to attest to a receipt. */
export function receiptSignMessage(receiptId: string): string {
  return `TollGate receipt attestation\nreceipt: ${receiptId}`;
}

export type SignReceiptResult = { signature: string; signer: string; message: string };

/** Prompt the connected wallet to EIP-191-sign a receipt's canonical message. Real signature. */
export async function signReceipt(receiptId: string): Promise<SignReceiptResult> {
  const eth = (typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined);
  if (!eth) throw new Error("No EIP-1193 wallet detected — install MetaMask.");
  const provider = new BrowserProvider(eth as never);
  const signer = await provider.getSigner();
  const message = receiptSignMessage(receiptId);
  const signature = await signer.signMessage(message);
  const recovered = verifyMessage(message, signature);
  return { signature, signer: recovered, message };
}

/** Recover the address that produced `signature` over the receipt's canonical message. */
export function recoverReceiptSigner(receiptId: string, signature: string): string {
  return verifyMessage(receiptSignMessage(receiptId), signature);
}

/** The bytes32 receipt hash used when anchoring a receipt by id (sha256 of the id). */
export async function receiptHashFor(receiptId: string): Promise<string> {
  return "0x" + (await sha256Hex(receiptId));
}

/** Read-only: is this receiptHash recorded in AgentReceiptRegistry on 0G? null = can't check (no registry / no wallet). */
export async function isReceiptRecorded(receiptHashHex: string): Promise<boolean | null> {
  const cfg = getOgConfig();
  if (!cfg.registryAddress) return null;
  const eth = (typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined);
  if (!eth) return null;
  try {
    const provider = new BrowserProvider(eth as never);
    const c = new Contract(cfg.registryAddress, REGISTRY_ABI, provider);
    return Boolean(await c.isRecorded(to0xBytes32(receiptHashHex)));
  } catch {
    return null;
  }
}

// ── Proof of Delivery (KF-5) ─────────────────────────────────────────────────
// The service signs keccak256(requestId ‖ responseHash) via EIP-191.
// Client verifies the signature and optionally anchors it via DeliveryVerifier.sol.

/** Canonical message a service signs to prove delivery of a specific response. */
export function deliverySignMessage(requestId: string, responseHash: string): string {
  return `TollGate proof of delivery\nrequest: ${requestId}\nresponse: ${responseHash}`;
}

export type SignDeliveryResult = { signature: string; signer: string; message: string };

/** Prompt the connected wallet to sign a delivery attestation (used by the service side). */
export async function signDelivery(requestId: string, responseHash: string): Promise<SignDeliveryResult> {
  const eth = (typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined);
  if (!eth) throw new Error("No EIP-1193 wallet detected — install MetaMask.");
  const provider = new BrowserProvider(eth as never);
  const signer = await provider.getSigner();
  const message = deliverySignMessage(requestId, responseHash);
  const signature = await signer.signMessage(message);
  const recovered = verifyMessage(message, signature);
  return { signature, signer: recovered, message };
}

/** Verify a delivery attestation. Returns the recovered signer address, or throws if invalid. */
export function verifyDelivery(requestId: string, responseHash: string, signature: string): string {
  const message = deliverySignMessage(requestId, responseHash);
  return verifyMessage(message, signature);
}

/** Recover the signer without throwing (returns null on malformed sig). */
export function safeVerifyDelivery(requestId: string, responseHash: string, signature: string): string | null {
  try { return verifyDelivery(requestId, responseHash, signature); } catch { return null; }
}

// ── AgentIdentityRegistry ─────────────────────────────────────────────────

const IDENTITY_REGISTRY_ABI = [
  "function register(string calldata agentDomain, address agentAddress) external returns (uint256 agentId)",
  "function agentIdOf(address agentAddress) external view returns (uint256)",
  "function ownerOf(uint256 agentId) external view returns (address)",
];

function getIdentityRegistryAddress(): string | null {
  return env("VITE_0G_IDENTITY_REGISTRY_ADDRESS") ?? null;
}

export type RegisterAgentResult = {
  txHash: string;
  explorerUrl: string;
  agentId: string;
  walletAddress: string;
};

/** Call AgentIdentityRegistry.register(domain, walletAddress) via MetaMask on the 0G chain. */
export async function registerAgentIdentity(agentDomain: string): Promise<RegisterAgentResult> {
  const addr = getIdentityRegistryAddress();
  if (!addr) throw new Error("Set VITE_0G_IDENTITY_REGISTRY_ADDRESS to enable on-chain registration.");
  const eth = (typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined);
  if (!eth) throw new Error("No EIP-1193 wallet detected — install MetaMask.");

  const cfg = getOgConfig();
  const currentChain = (await eth.request({ method: "eth_chainId" })) as string;
  if (currentChain.toLowerCase() !== cfg.chainHex) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainHex }] });
    } catch (err) {
      const code = (err as { code?: number }).code;
      const addParams = (OG_ADD_CHAIN as Record<string, unknown>)[cfg.chainHex];
      if (code === 4902 && addParams) {
        await eth.request({ method: "wallet_addEthereumChain", params: [addParams] });
      } else {
        throw new Error(`Switch your wallet to the 0G chain (${cfg.chainHex}) and retry.`);
      }
    }
  }

  const provider = new BrowserProvider(eth as never);
  const signer = await provider.getSigner();
  const walletAddress = await signer.getAddress();
  const contract = new Contract(addr, IDENTITY_REGISTRY_ABI, signer);

  const existingId: bigint = await contract.agentIdOf(walletAddress);
  if (existingId > 0n) {
    return { txHash: "already-registered", explorerUrl: ogExplorerAddrUrl(addr), agentId: existingId.toString(), walletAddress };
  }

  const tx = await contract.register(agentDomain, walletAddress);
  await tx.wait();
  const newId: bigint = await contract.agentIdOf(walletAddress);

  return {
    txHash: tx.hash as string,
    explorerUrl: ogExplorerTxUrl(tx.hash as string),
    agentId: newId.toString(),
    walletAddress,
  };
}

// ── DeliveryVerifier.anchor ───────────────────────────────────────────────

const DELIVERY_VERIFIER_ABI = [
  "function verify(bytes32 responseHash, bytes calldata signature, address expectedProvider) external pure returns (bool)",
  "function anchor(bytes32 requestHash, bytes32 responseHash, bytes calldata signature) external returns (address provider)",
  "function isAnchored(bytes32 requestHash) external view returns (bool)",
];

function getDeliveryVerifierAddress(): string | null {
  return env("VITE_0G_DELIVERY_VERIFIER_MAINNET_ADDRESS") ?? null;
}

export type AnchorDeliveryResult = {
  txHash: string;
  explorerUrl: string;
  provider: string;
};

/** Call DeliveryVerifier.anchor(requestHash, responseHash, sig) via MetaMask. */
export async function anchorDeliveryOnChain(params: {
  requestHashHex: string;
  responseHashHex: string;
  signature: string;
}): Promise<AnchorDeliveryResult> {
  const addr = getDeliveryVerifierAddress();
  if (!addr) throw new Error("Set VITE_0G_DELIVERY_VERIFIER_MAINNET_ADDRESS to enable on-chain anchoring.");
  const eth = (typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined);
  if (!eth) throw new Error("No EIP-1193 wallet detected — install MetaMask.");

  const cfg = getOgConfig();
  const currentChain = (await eth.request({ method: "eth_chainId" })) as string;
  if (currentChain.toLowerCase() !== cfg.chainHex) {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainHex }] });
  }

  const provider = new BrowserProvider(eth as never);
  const signer = await provider.getSigner();
  const contract = new Contract(addr, DELIVERY_VERIFIER_ABI, signer);

  const tx = await contract.anchor(to0xBytes32(params.requestHashHex), to0xBytes32(params.responseHashHex), params.signature);
  const receipt = await tx.wait();

  let providerAddr = "unknown";
  try {
    for (const log of receipt?.logs ?? []) {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "DeliveryAnchored") { providerAddr = String(parsed.args.provider); break; }
    }
  } catch { /* ignore */ }

  return { txHash: tx.hash as string, explorerUrl: ogExplorerTxUrl(tx.hash as string), provider: providerAddr };
}

// ── ServiceRegistry.register ──────────────────────────────────────────────

const SERVICE_REGISTRY_ABI = [
  "function register(string calldata serviceId, string calldata name, uint256 priceWei, string calldata currency, string calldata network, string calldata endpoint, string calldata agentCardUri) external returns (bytes32 key)",
  "function getService(string calldata serviceId) external view returns (tuple(address provider, string serviceId, string name, uint256 priceWei, string currency, string network, string endpoint, string agentCardUri, bool active, uint64 registeredAt, uint64 updatedAt))",
];

function getServiceRegistryAddress(): string | null {
  return env("VITE_0G_SERVICE_REGISTRY_MAINNET_ADDRESS") ?? null;
}

export type RegisterServiceResult = {
  txHash: string;
  explorerUrl: string;
  serviceKey: string;
  provider: string;
};

/** Call ServiceRegistry.register() via MetaMask on the 0G chain (7-param form). */
export async function registerOnChainService(params: {
  serviceId: string;
  name: string;
  priceWei: bigint;
  currency: string;
  network: string;
  endpoint: string;
  agentCardUri: string;
}): Promise<RegisterServiceResult> {
  const addr = getServiceRegistryAddress();
  if (!addr) throw new Error("Set VITE_0G_SERVICE_REGISTRY_MAINNET_ADDRESS to enable on-chain registration.");
  const eth = (typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined);
  if (!eth) throw new Error("No EIP-1193 wallet detected — install MetaMask.");

  const cfg = getOgConfig();
  const currentChain = (await eth.request({ method: "eth_chainId" })) as string;
  if (currentChain.toLowerCase() !== cfg.chainHex) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainHex }] });
    } catch (err) {
      const code = (err as { code?: number }).code;
      const addParams = (OG_ADD_CHAIN as Record<string, unknown>)[cfg.chainHex];
      if (code === 4902 && addParams) {
        await eth.request({ method: "wallet_addEthereumChain", params: [addParams] });
      } else {
        throw new Error(`Switch your wallet to the 0G chain (${cfg.chainHex}) and retry.`);
      }
    }
  }

  const provider = new BrowserProvider(eth as never);
  const signer = await provider.getSigner();
  const signerAddr = await signer.getAddress();
  const contract = new Contract(addr, SERVICE_REGISTRY_ABI, signer);

  const tx = await contract.register(params.serviceId, params.name, params.priceWei, params.currency, params.network, params.endpoint, params.agentCardUri);
  const receipt = await tx.wait();

  let serviceKey = "";
  try {
    for (const log of receipt?.logs ?? []) {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === "ServiceRegistered") { serviceKey = String(parsed.args.key ?? ""); break; }
    }
  } catch { /* ignore */ }

  return { txHash: tx.hash as string, explorerUrl: ogExplorerTxUrl(tx.hash as string), serviceKey, provider: signerAddr };
}
