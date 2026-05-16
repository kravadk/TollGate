/* Agora / Arc L1 on-chain glue for the frontend.
 *
 * Arc L1 mainnet is NOT YET LIVE — both "mainnet" and "testnet" modes use the same
 * testnet chain (chainId 5042002). Switching is cosmetic for now; addresses are the same.
 *
 * Deployed contracts (arcTestnet.json):
 *   ArcMindRegistry:   VITE_ARC_REGISTRY_ADDRESS
 *   CopyTradeEscrow:   VITE_ARC_ESCROW_ADDRESS
 *
 * Same graceful-degradation pattern as src/lib/arbitrum.ts and src/lib/mantle.ts.
 */
import { BrowserProvider, Contract, encodeBytes32String, Interface, JsonRpcProvider } from "ethers";
import type { NetworkMode } from "./chains";

function env(key: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return v && v.trim() ? v.trim() : undefined;
}

// Arc L1 testnet chainId 5042002 = 0x4CEF52
export const ARC_CHAIN_HEX = "0x4cef52";

const ARC_ADD_CHAIN: Record<string, unknown> = {
  "0x4cef52": {
    chainId: "0x4cef52",
    chainName: "Arc L1 Testnet",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
    rpcUrls: ["https://rpc.testnet.arc-node.thecanteenapp.com/v1/public"],
    blockExplorerUrls: ["https://testnet.arcscan.app"],
  },
};

export type AgoraConfig = {
  registryAddress: string | null;
  escrowAddress: string | null;
  explorerBase: string;
  chainHex: string;
  mainnetLive: false; // Arc mainnet not yet live
};

export function getAgoraConfig(_mode?: NetworkMode): AgoraConfig {
  // Arc mainnet not live — always return testnet config regardless of mode
  return {
    registryAddress: env("VITE_ARC_REGISTRY_ADDRESS") ?? null,
    escrowAddress:   env("VITE_ARC_ESCROW_ADDRESS") ?? null,
    explorerBase:    (env("VITE_ARC_EXPLORER") ?? "https://testnet.arcscan.app").replace(/\/+$/, ""),
    chainHex: ARC_CHAIN_HEX,
    mainnetLive: false,
  };
}

export function isAgoraRegistryConfigured(): boolean { return getAgoraConfig().registryAddress !== null; }
export function isAgoraEscrowConfigured():   boolean { return getAgoraConfig().escrowAddress !== null; }
export function arcExplorerAddrUrl(addr: string): string { return `${getAgoraConfig().explorerBase}/address/${addr}`; }
export function arcExplorerTxUrl(txHash: string): string { return `${getAgoraConfig().explorerBase}/tx/${txHash}`; }

// ── Wallet switch to Arc L1 ───────────────────────────────────────────────────

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

function getEth(): Eip1193 {
  const eth = typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined;
  if (!eth) throw new Error("No EIP-1193 wallet detected — install MetaMask.");
  return eth;
}

// ── ABI fragments ─────────────────────────────────────────────────────────────

const REGISTRY_ABI = [
  "function registerAgent(bytes32 builderId, string calldata metadata) external returns (bytes32 agentId)",
  "function recordDecision(bytes32 agentId, bytes32 decisionHash) external returns (uint256 index)",
  "function resolveDecision(uint256 index, bytes32 outcomeHash) external",
  "function getReputation(bytes32 agentId) external view returns (uint256)",
];

const ESCROW_ABI = [
  "function stake(uint256 amount) external",
  "function totalStaked() view returns (uint256)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
];

const ARC_USDC = "0x3600000000000000000000000000000000000000";

// ── On-chain write helpers ────────────────────────────────────────────────────

export async function stakeToEscrow(amountUsdc: number): Promise<{ txHash: string }> {
  const cfg = getAgoraConfig();
  if (!cfg.escrowAddress) throw new Error("CopyTradeEscrow not configured.");
  await switchToArc();
  const eth = getEth();
  await eth.request({ method: "eth_requestAccounts" });
  const provider = new BrowserProvider(eth as never);
  const signer = await provider.getSigner();
  const amountWei = BigInt(Math.round(amountUsdc * 1_000_000)); // USDC 6 decimals
  const usdc = new Contract(ARC_USDC, ERC20_ABI, signer);
  await (await usdc.approve(cfg.escrowAddress, amountWei)).wait();
  const escrow = new Contract(cfg.escrowAddress, ESCROW_ABI, signer);
  const tx = await escrow.stake(amountWei);
  const receipt = await tx.wait() as { hash: string };
  return { txHash: receipt.hash };
}

export async function registerArcAgent(domain: string, metadata: string): Promise<{ agentId: string; txHash: string }> {
  const cfg = getAgoraConfig();
  if (!cfg.registryAddress) throw new Error("ArcMindRegistry not configured.");
  await switchToArc();
  const eth = getEth();
  await eth.request({ method: "eth_requestAccounts" });
  const provider = new BrowserProvider(eth as never);
  const signer = await provider.getSigner();
  const builderId = encodeBytes32String(domain.slice(0, 31));
  const registry = new Contract(cfg.registryAddress, REGISTRY_ABI, signer);
  const tx = await registry.registerAgent(builderId, metadata);
  const receipt = await tx.wait() as { hash: string; logs?: { topics?: string[] }[] };
  const agentId = receipt.logs?.find((l) => l.topics && l.topics.length > 1)?.topics?.[1] ?? null;
  return { agentId: agentId ?? "0x" + "0".repeat(64), txHash: receipt.hash };
}

export async function recordArcDecision(agentId: string, decisionJson: string): Promise<{ txHash: string }> {
  const cfg = getAgoraConfig();
  if (!cfg.registryAddress) throw new Error("ArcMindRegistry not configured.");
  await switchToArc();
  const eth = getEth();
  await eth.request({ method: "eth_requestAccounts" });
  const provider = new BrowserProvider(eth as never);
  const signer = await provider.getSigner();
  const enc = new TextEncoder();
  const raw = enc.encode(decisionJson);
  const hashBuf = await crypto.subtle.digest("SHA-256", raw);
  const decisionHash = "0x" + Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  const registry = new Contract(cfg.registryAddress, REGISTRY_ABI, signer);
  const tx = await registry.recordDecision(agentId, decisionHash);
  const receipt = await tx.wait() as { hash: string };
  return { txHash: receipt.hash };
}

export async function resolveArcDecision(index: number, outcome: string): Promise<{ txHash: string }> {
  const cfg = getAgoraConfig();
  if (!cfg.registryAddress) throw new Error("ArcMindRegistry not configured.");
  await switchToArc();
  const eth = getEth();
  await eth.request({ method: "eth_requestAccounts" });
  const provider = new BrowserProvider(eth as never);
  const signer = await provider.getSigner();
  const enc = new TextEncoder();
  const raw = enc.encode(outcome);
  const hashBuf = await crypto.subtle.digest("SHA-256", raw);
  const outcomeHash = "0x" + Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
  const registry = new Contract(cfg.registryAddress, REGISTRY_ABI, signer);
  const tx = await registry.resolveDecision(index, outcomeHash);
  const receipt = await tx.wait() as { hash: string };
  return { txHash: receipt.hash };
}

export async function getArcAgentStats(agentId: string): Promise<{ reputation: number } | null> {
  const cfg = getAgoraConfig();
  if (!cfg.registryAddress || !agentId) return null;
  try {
    const iface = new Interface(REGISTRY_ABI);
    const provider = new JsonRpcProvider("https://rpc.testnet.arc-node.thecanteenapp.com/v1/public");
    const registry = new Contract(cfg.registryAddress, iface, provider);
    const rep = await registry.getReputation(agentId) as bigint;
    return { reputation: Number(rep) };
  } catch {
    return null;
  }
}

export async function switchToArc(): Promise<void> {
  const eth = getEth();
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  if (current.toLowerCase() === ARC_CHAIN_HEX) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: ARC_CHAIN_HEX }] });
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 4902) {
      try { await eth.request({ method: "wallet_addEthereumChain", params: [ARC_ADD_CHAIN[ARC_CHAIN_HEX]] }); }
      catch { throw new Error("Add Arc L1 Testnet to your wallet and retry."); }
    } else {
      throw new Error(`Switch wallet to Arc L1 Testnet (${ARC_CHAIN_HEX}) and retry.`);
    }
  }
}
