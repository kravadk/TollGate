/* Mantle on-chain glue for the frontend.
 *
 * Two contracts (see contracts/): AgentIdentityRegistry — an ERC-8004-style agent
 * identity NFT — and AgentVault — an AI-callable "deploy surplus → mETH" vault with
 * an on-chain decision log. Everything here is real-but-optional: present only when
 * the addresses are configured (deploy with `cd contracts && npm run deploy:mantle`),
 * otherwise the app degrades gracefully — same pattern as src/lib/og.ts.
 */
import { BrowserProvider, Contract, parseEther } from "ethers";

function env(key: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return v && v.trim() ? v.trim() : undefined;
}

/** Mantle mainnet chain id MetaMask uses. Override with VITE_MANTLE_CHAIN_ID (0x138b = Mantle Sepolia). */
export const MANTLE_DEFAULT_CHAIN_HEX = "0x1388"; // 5000

const MANTLE_ADD_CHAIN: Record<string, unknown> = {
  "0x1388": {
    chainId: "0x1388",
    chainName: "Mantle",
    nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
    rpcUrls: ["https://rpc.mantle.xyz"],
    blockExplorerUrls: ["https://explorer.mantle.xyz"],
  },
  "0x138b": {
    chainId: "0x138b",
    chainName: "Mantle Sepolia",
    nativeCurrency: { name: "Mantle", symbol: "MNT", decimals: 18 },
    rpcUrls: ["https://rpc.sepolia.mantle.xyz"],
    blockExplorerUrls: ["https://explorer.sepolia.mantle.xyz"],
  },
};

export type MantleConfig = {
  identityAddress: string | null;
  vaultAddress: string | null;
  explorerBase: string;     // no trailing slash
  chainHex: string;         // lowercase 0x…
};

export function getMantleConfig(): MantleConfig {
  const explorer = (env("VITE_MANTLE_EXPLORER") ?? "https://explorer.mantle.xyz").replace(/\/+$/, "");
  const chainRaw = env("VITE_MANTLE_CHAIN_ID");
  let chainHex = MANTLE_DEFAULT_CHAIN_HEX;
  if (chainRaw) chainHex = chainRaw.startsWith("0x") ? chainRaw.toLowerCase() : "0x" + Number(chainRaw).toString(16);
  return {
    identityAddress: env("VITE_MANTLE_IDENTITY_ADDRESS") ?? null,
    vaultAddress: env("VITE_MANTLE_VAULT_ADDRESS") ?? null,
    explorerBase: explorer,
    chainHex,
  };
}

export function isMantleIdentityConfigured(): boolean { return getMantleConfig().identityAddress !== null; }
export function isMantleVaultConfigured(): boolean { return getMantleConfig().vaultAddress !== null; }
export function isMantleConfigured(): boolean { const c = getMantleConfig(); return c.identityAddress !== null || c.vaultAddress !== null; }

export function mantleExplorerTxUrl(txHash: string): string { return `${getMantleConfig().explorerBase}/tx/${txHash}`; }
export function mantleExplorerAddrUrl(addr: string): string { return `${getMantleConfig().explorerBase}/address/${addr}`; }
export function mantleExplorerTokenUrl(addr: string, tokenId: number | string): string { return `${getMantleConfig().explorerBase}/token/${addr}/instance/${tokenId}`; }

const IDENTITY_ABI = [
  "function register(string agentDomain, address agentAddress) returns (uint256 agentId)",
  "function update(uint256 agentId, string newDomain, address newAgentAddress)",
  "function recordFeedback(uint256 agentId, uint8 score, bytes32 ref)",
  "function setMemoryRoot(uint256 agentId, bytes32 root)",
  "function memoryRoot(uint256) view returns (bytes32)",
  "function reputationOf(uint256 agentId) view returns (uint64 count, uint64 scoreSum)",
  "function resolveByAddress(address agentAddress) view returns (uint256)",
  "function resolveByDomain(string agentDomain) view returns (uint256)",
  "function totalAgents() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event AgentRegistered(uint256 indexed agentId, string agentDomain, address indexed agentAddress, address indexed owner)",
  "event FeedbackRecorded(uint256 indexed agentId, address indexed from, uint8 score, bytes32 ref)",
  "event MemoryRootUpdated(uint256 indexed agentId, bytes32 indexed root, address indexed by)",
];

const ZERO_BYTES32 = "0x" + "0".repeat(64);
/** True for an empty / zero bytes32 (no memory root bound yet). */
export function isZeroBytes32(v?: string | null): boolean {
  return !v || /^(0x)?0*$/i.test(v);
}

const VAULT_ABI = [
  "function deposit() payable",
  "function deployToYield(uint256 amount, bytes32 strategyRef)",
  "function unwind(uint256 amount, bytes32 strategyRef)",
  "function withdraw(uint256 amount)",
  "function recordDecision(bytes32 decisionHash, bytes32 contextHash) returns (uint256 seq)",
  "function positionOf(address agent) view returns (uint256 idle, uint256 deployed)",
  "function yieldToken() view returns (address)",
  "function totalDeployed() view returns (uint256)",
  "function decisionCount() view returns (uint256)",
  "event DeployedToYield(address indexed agent, uint256 amount, bytes32 strategyRef, address yieldToken, uint256 deployedBalance)",
  "event DecisionRecorded(address indexed agent, uint256 indexed seq, bytes32 decisionHash, bytes32 contextHash, uint64 timestamp)",
];

function to0xBytes32(hex?: string): string {
  if (!hex) return "0x" + "0".repeat(64);
  const clean = hex.replace(/^0x/, "").toLowerCase();
  if (!/^[0-9a-f]{1,64}$/.test(clean)) throw new Error("Expected a hex value (≤32 bytes)");
  return "0x" + clean.padStart(64, "0");
}

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

function getEth(): Eip1193 {
  const eth = typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined;
  if (!eth) throw new Error("No EIP-1193 wallet detected — install MetaMask.");
  return eth;
}

/** Get a signer on the configured Mantle chain, switching/adding the network if needed. */
async function getMantleSigner() {
  const cfg = getMantleConfig();
  const eth = getEth();
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  if (current.toLowerCase() !== cfg.chainHex) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainHex }] });
    } catch (err) {
      const code = (err as { code?: number }).code;
      const addParams = MANTLE_ADD_CHAIN[cfg.chainHex];
      if (code === 4902 && addParams) {
        try { await eth.request({ method: "wallet_addEthereumChain", params: [addParams] }); }
        catch { throw new Error(`Add the Mantle chain (${cfg.chainHex}) to your wallet and retry.`); }
      } else {
        throw new Error(`Wallet is on ${current}; switch it to Mantle (${cfg.chainHex}) and retry.`);
      }
    }
  }
  const provider = new BrowserProvider(eth as never);
  return provider.getSigner();
}

export type RegisterIdentityResult = { txHash: string; explorerUrl: string; agentId: number | null; chainHex: string; contract: string };

/** Register an ERC-8004 agent identity → mints the identity NFT. Real tx. */
export async function registerAgentIdentity(params: { domain: string; agentAddress: string }): Promise<RegisterIdentityResult> {
  const cfg = getMantleConfig();
  if (!cfg.identityAddress) throw new Error("Mantle identity registry not configured (set VITE_MANTLE_IDENTITY_ADDRESS).");
  const signer = await getMantleSigner();
  const c = new Contract(cfg.identityAddress, IDENTITY_ABI, signer);
  const tx = await c.register(params.domain, params.agentAddress);
  const receipt = await tx.wait();
  let agentId: number | null = null;
  try {
    for (const log of receipt?.logs ?? []) {
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "AgentRegistered") { agentId = Number(parsed.args.agentId); break; }
    }
  } catch { /* agentId stays null */ }
  return { txHash: tx.hash as string, explorerUrl: mantleExplorerTxUrl(tx.hash as string), agentId, chainHex: cfg.chainHex, contract: cfg.identityAddress };
}

/** Leave a 1..5 reputation score for an agent. Real tx. */
export async function recordAgentFeedback(params: { agentId: number; score: number; refHex?: string }): Promise<{ txHash: string; explorerUrl: string }> {
  const cfg = getMantleConfig();
  if (!cfg.identityAddress) throw new Error("Mantle identity registry not configured.");
  if (params.score < 1 || params.score > 5) throw new Error("Score must be 1..5");
  const signer = await getMantleSigner();
  const c = new Contract(cfg.identityAddress, IDENTITY_ABI, signer);
  const tx = await c.recordFeedback(params.agentId, params.score, to0xBytes32(params.refHex));
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: mantleExplorerTxUrl(tx.hash as string) };
}

/**
 * Bind (or update) an agent identity NFT's memory-snapshot pointer — the 0G Storage
 * Merkle root of the agent's latest brain dump. Makes the NFT "intelligent": its
 * on-chain state points at a blob living on 0G Storage. Caller must own the NFT. Real tx.
 */
export async function bindAgentMemoryRoot(params: { agentId: number; rootHex: string }): Promise<{ txHash: string; explorerUrl: string; root: string }> {
  const cfg = getMantleConfig();
  if (!cfg.identityAddress) throw new Error("Mantle identity registry not configured (set VITE_MANTLE_IDENTITY_ADDRESS).");
  if (!Number.isInteger(params.agentId) || params.agentId < 1) throw new Error("Enter a valid agentId (the NFT token id).");
  const root = to0xBytes32(params.rootHex); // pads/validates; full 32-byte 0G root is a no-op
  const signer = await getMantleSigner();
  const c = new Contract(cfg.identityAddress, IDENTITY_ABI, signer);
  const tx = await c.setMemoryRoot(params.agentId, root);
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: mantleExplorerTxUrl(tx.hash as string), root };
}

/** Read-only: the currently-bound 0G Storage memory root for an agent (ZERO if none). */
export async function readAgentMemoryRoot(agentId: number): Promise<string> {
  const cfg = getMantleConfig();
  if (!cfg.identityAddress) return ZERO_BYTES32;
  try {
    const eth = getEth();
    const provider = new BrowserProvider(eth as never);
    const c = new Contract(cfg.identityAddress, IDENTITY_ABI, provider);
    const v = (await c.memoryRoot(agentId)) as string;
    return v || ZERO_BYTES32;
  } catch { return ZERO_BYTES32; }
}

export type VaultTxResult = { txHash: string; explorerUrl: string; seq?: number | null };

export async function vaultDeposit(amountEthStr: string): Promise<VaultTxResult> {
  const cfg = getMantleConfig();
  if (!cfg.vaultAddress) throw new Error("Mantle vault not configured (set VITE_MANTLE_VAULT_ADDRESS).");
  const signer = await getMantleSigner();
  const c = new Contract(cfg.vaultAddress, VAULT_ABI, signer);
  const tx = await c.deposit({ value: parseEther(amountEthStr) });
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: mantleExplorerTxUrl(tx.hash as string) };
}

export async function vaultDeployToYield(params: { amountEthStr: string; strategyRefHex?: string }): Promise<VaultTxResult> {
  const cfg = getMantleConfig();
  if (!cfg.vaultAddress) throw new Error("Mantle vault not configured.");
  const signer = await getMantleSigner();
  const c = new Contract(cfg.vaultAddress, VAULT_ABI, signer);
  const tx = await c.deployToYield(parseEther(params.amountEthStr), to0xBytes32(params.strategyRefHex));
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: mantleExplorerTxUrl(tx.hash as string) };
}

export async function vaultRecordDecision(params: { decisionHashHex: string; contextHashHex?: string }): Promise<VaultTxResult> {
  const cfg = getMantleConfig();
  if (!cfg.vaultAddress) throw new Error("Mantle vault not configured.");
  const signer = await getMantleSigner();
  const c = new Contract(cfg.vaultAddress, VAULT_ABI, signer);
  const tx = await c.recordDecision(to0xBytes32(params.decisionHashHex), to0xBytes32(params.contextHashHex));
  const receipt = await tx.wait();
  let seq: number | null = null;
  try {
    for (const log of receipt?.logs ?? []) {
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "DecisionRecorded") { seq = Number(parsed.args.seq); break; }
    }
  } catch { /* seq stays null */ }
  return { txHash: tx.hash as string, explorerUrl: mantleExplorerTxUrl(tx.hash as string), seq };
}

/** Read-only: resolve an address to its agentId via the configured wallet provider (0 = none). */
export async function resolveAgentId(agentAddress: string): Promise<number> {
  const cfg = getMantleConfig();
  if (!cfg.identityAddress) return 0;
  const eth = getEth();
  const provider = new BrowserProvider(eth as never);
  const c = new Contract(cfg.identityAddress, IDENTITY_ABI, provider);
  try { return Number(await c.resolveByAddress(agentAddress)); } catch { return 0; }
}
