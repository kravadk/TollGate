/* Mantle on-chain glue for the frontend.
 *
 * Two contracts (see contracts/): AgentIdentityRegistry — an ERC-8004-style agent
 * identity NFT — and AgentVault — an AI-callable "deploy surplus → mETH" vault with
 * an on-chain decision log. Everything here is real-but-optional: present only when
 * the addresses are configured (deploy with `cd contracts && npm run deploy:mantle`),
 * otherwise the app degrades gracefully — same pattern as src/lib/og.ts.
 */
import { BrowserProvider, Contract, parseEther } from "ethers";
import type { NetworkMode } from "./chains";

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
  creditAddress: string | null;
  explorerBase: string;     // no trailing slash
  chainHex: string;         // lowercase 0x…
};

export function getMantleConfig(mode?: NetworkMode): MantleConfig {
  const isTestnet = mode === "testnet";
  const defaultExplorer = isTestnet ? "https://explorer.sepolia.mantle.xyz" : "https://explorer.mantle.xyz";
  const defaultChainHex = isTestnet ? "0x138b" : MANTLE_DEFAULT_CHAIN_HEX;
  const identityVar = isTestnet ? "VITE_MANTLE_TESTNET_IDENTITY_ADDRESS" : "VITE_MANTLE_IDENTITY_ADDRESS";
  const creditVar = isTestnet ? "VITE_MANTLE_TESTNET_CREDIT_ADDRESS" : "VITE_MANTLE_CREDIT_ADDRESS";
  const explorer = (env("VITE_MANTLE_EXPLORER") ?? defaultExplorer).replace(/\/+$/, "");
  const chainRaw = env("VITE_MANTLE_CHAIN_ID");
  let chainHex = defaultChainHex;
  if (chainRaw && !isTestnet) chainHex = chainRaw.startsWith("0x") ? chainRaw.toLowerCase() : "0x" + Number(chainRaw).toString(16);
  return {
    identityAddress: env(identityVar) ?? null,
    vaultAddress: env("VITE_MANTLE_VAULT_ADDRESS") ?? null,
    creditAddress: env(creditVar) ?? null,
    explorerBase: explorer,
    chainHex,
  };
}

export function isMantleIdentityConfigured(): boolean { return getMantleConfig().identityAddress !== null; }
export function isMantleVaultConfigured(): boolean { return getMantleConfig().vaultAddress !== null; }
export function isMantleCreditConfigured(): boolean { return getMantleConfig().creditAddress !== null; }
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

const BUDGET_ABI = [
  "function setBudget(address agent, uint128 dailyLimitCents, uint128 perRequestMaxCents, bool autoPay, bytes32 allowlistRoot) external",
  "function getBudget(address agent) view returns (uint128 dailyLimitCents, uint128 perRequestMaxCents, uint128 spentToday, uint128 remainingToday, bool autoPay, bytes32 allowlistRoot, bool dayActive)",
];

export type BudgetState = {
  dailyLimitUsd: number;
  perRequestMaxUsd: number;
  spentTodayUsd: number;
  remainingTodayUsd: number;
  autoPay: boolean;
  dayActive: boolean;
};

export function isBudgetControllerConfigured(): boolean {
  return !!env("VITE_BUDGET_CONTROLLER");
}

function getBudgetControllerAddress(): string {
  const addr = env("VITE_BUDGET_CONTROLLER");
  if (!addr) throw new Error("AgentBudgetController not configured (set VITE_BUDGET_CONTROLLER).");
  return addr;
}

/** Set on-chain spend limits for an agent. Real tx via MetaMask. */
export async function setBudget(params: {
  agent: string;
  dailyLimitUsd: number;
  perRequestMaxUsd: number;
  autoPay: boolean;
}): Promise<{ txHash: string; explorerUrl: string }> {
  const addr = getBudgetControllerAddress();
  const signer = await getMantleSigner();
  const c = new Contract(addr, BUDGET_ABI, signer);
  const dailyCents = BigInt(Math.round(params.dailyLimitUsd * 100));
  const perReqCents = BigInt(Math.round(params.perRequestMaxUsd * 100));
  const tx = await c.setBudget(params.agent, dailyCents, perReqCents, params.autoPay, "0x" + "0".repeat(64));
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: mantleExplorerTxUrl(tx.hash as string) };
}

/** Read-only: fetch current budget state for an agent address. */
export async function getBudget(agent: string): Promise<BudgetState> {
  const addr = getBudgetControllerAddress();
  const eth = getEth();
  const provider = new BrowserProvider(eth as never);
  const c = new Contract(addr, BUDGET_ABI, provider);
  const r = await c.getBudget(agent);
  const cents = (v: bigint) => Number(v) / 100;
  return {
    dailyLimitUsd: cents(r[0]),
    perRequestMaxUsd: cents(r[1]),
    spentTodayUsd: cents(r[2]),
    remainingTodayUsd: cents(r[3]),
    autoPay: r[4] as boolean,
    dayActive: r[6] as boolean,
  };
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

// ─── AgentCreditRegistry ─────────────────────────────────────────────────────

const CREDIT_ABI = [
  "function creditScore(address agent) view returns (uint256)",
  "function recordOf(address agent) view returns (uint64 totalPayments, uint128 totalVolumeWei, uint64 missedPayments, uint32 firstSeenBlock, uint32 lastSeenBlock)",
  "function feeTier(address agent) view returns (uint8)",
  "function rateLimitMultiplier(address agent) view returns (uint8)",
  "function recordPayment(address agent, uint128 amountWei) returns (uint256 score)",
  "function recordMissedPayment(address agent) returns (uint256 score)",
  "function totalAgentCount() view returns (uint256)",
  "event PaymentRecorded(address indexed agent, uint128 amountWei, uint64 newTotalPayments, uint256 newScore, uint32 atBlock)",
];

export type CreditRecord = {
  score: number;           // 0–1000
  totalPayments: number;
  totalVolumeUsd: number;  // USDC units (wei / 1e18)
  missedPayments: number;
  feeTier: 0 | 1 | 2;     // 0=1%, 1=0.5%, 2=0.1%
  rateMultiplier: number;  // 1x / 5x / 10x
  tier: "Starter" | "Silver" | "Gold";
};

/** Read-only: get the credit score and record for an agent address. Returns zeroed record if not configured or agent unknown. */
export async function getCreditRecord(agentAddress: string): Promise<CreditRecord> {
  const cfg = getMantleConfig();
  if (!cfg.creditAddress) {
    return { score: 0, totalPayments: 0, totalVolumeUsd: 0, missedPayments: 0, feeTier: 0, rateMultiplier: 1, tier: "Starter" };
  }
  try {
    const eth = getEth();
    const provider = new BrowserProvider(eth as never);
    const c = new Contract(cfg.creditAddress, CREDIT_ABI, provider);
    const [score, rec, ft, rl] = await Promise.all([
      c.creditScore(agentAddress) as Promise<bigint>,
      c.recordOf(agentAddress) as Promise<[bigint, bigint, bigint, number, number]>,
      c.feeTier(agentAddress) as Promise<number>,
      c.rateLimitMultiplier(agentAddress) as Promise<number>,
    ]);
    const s = Number(score);
    const tier: CreditRecord["tier"] = s >= 800 ? "Gold" : s >= 500 ? "Silver" : "Starter";
    return {
      score: s,
      totalPayments: Number(rec[0]),
      totalVolumeUsd: Number(rec[1]) / 1e18,
      missedPayments: Number(rec[2]),
      feeTier: ft as 0 | 1 | 2,
      rateMultiplier: Number(rl),
      tier,
    };
  } catch { return { score: 0, totalPayments: 0, totalVolumeUsd: 0, missedPayments: 0, feeTier: 0, rateMultiplier: 1, tier: "Starter" }; }
}

/** Write: record a successful x402 payment for an agent (called by TollGate gateway). Amount in USDC cents (e.g. 10 = $0.10). */
export async function recordAgentPayment(params: { agentAddress: string; amountCents: number }): Promise<VaultTxResult> {
  const cfg = getMantleConfig();
  if (!cfg.creditAddress) throw new Error("AgentCreditRegistry not configured (set VITE_MANTLE_CREDIT_ADDRESS).");
  const signer = await getMantleSigner();
  const c = new Contract(cfg.creditAddress, CREDIT_ABI, signer);
  // convert cents to 18-dec wei: $0.10 = 10 cents = 0.10 * 1e18 wei
  const amountWei = BigInt(Math.round(params.amountCents * 1e16));
  const tx = await c.recordPayment(params.agentAddress, amountWei);
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: mantleExplorerTxUrl(tx.hash as string) };
}
