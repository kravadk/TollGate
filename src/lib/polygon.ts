/* Polygon zkEVM on-chain glue for the frontend.
 *
 * Two networks:
 *   Mainnet: chainId 1101 (0x44D) — VITE_POLYGON_MAINNET_*
 *   Testnet: chainId 2442 (0x985) — VITE_POLYGON_TESTNET_* (Cardona)
 *
 * Same graceful-degradation pattern as src/lib/arbitrum.ts and src/lib/mantle.ts.
 */
import { BrowserProvider, Contract } from "ethers";
import type { NetworkMode } from "./chains";

function env(key: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return v && v.trim() ? v.trim() : undefined;
}

export const POLYGON_DEFAULT_CHAIN_HEX = "0x44d"; // 1101 mainnet

const POLYGON_ADD_CHAIN: Record<string, unknown> = {
  "0x44d": {
    chainId: "0x44d",
    chainName: "Polygon zkEVM",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://zkevm-rpc.com"],
    blockExplorerUrls: ["https://zkevm.polygonscan.com"],
  },
  "0x985": {
    chainId: "0x985",
    chainName: "Polygon zkEVM Cardona",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.cardona.zkevm-rpc.com"],
    blockExplorerUrls: ["https://cardona-zkevm.polygonscan.com"],
  },
};

export type PolygonConfig = {
  escrowAddress: string | null;
  explorerBase: string;   // no trailing slash
  chainHex: string;       // lowercase 0x…
};

export function getPolygonConfig(mode?: NetworkMode): PolygonConfig {
  const isTestnet = mode === "testnet";
  const escrowVar = isTestnet ? "VITE_POLYGON_TESTNET_ESCROW_ADDRESS" : "VITE_POLYGON_MAINNET_ESCROW_ADDRESS";
  const defaultExplorer = isTestnet ? "https://cardona-zkevm.polygonscan.com" : "https://zkevm.polygonscan.com";
  const defaultChainHex = isTestnet ? "0x985" : POLYGON_DEFAULT_CHAIN_HEX;
  const explorerEnv = !isTestnet ? env("VITE_POLYGON_EXPLORER") : undefined;
  return {
    escrowAddress: env(escrowVar) ?? null,
    explorerBase: (explorerEnv ?? defaultExplorer).replace(/\/+$/, ""),
    chainHex: defaultChainHex,
  };
}

export function isPolygonEscrowConfigured(mode?: NetworkMode): boolean { return getPolygonConfig(mode).escrowAddress !== null; }
export function polygonExplorerTxUrl(txHash: string, mode?: NetworkMode): string { return `${getPolygonConfig(mode).explorerBase}/tx/${txHash}`; }
export function polygonExplorerAddrUrl(addr: string, mode?: NetworkMode): string { return `${getPolygonConfig(mode).explorerBase}/address/${addr}`; }

// ── Wallet switching ──────────────────────────────────────────────────────────

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

function getEth(): Eip1193 {
  const eth = typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined;
  if (!eth) throw new Error("No EIP-1193 wallet detected — install MetaMask.");
  return eth;
}

export async function getPolygonSigner(mode?: NetworkMode) {
  const cfg = getPolygonConfig(mode);
  const eth = getEth();
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  if (current.toLowerCase() !== cfg.chainHex) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainHex }] });
    } catch (err) {
      const code = (err as { code?: number }).code;
      const addParams = POLYGON_ADD_CHAIN[cfg.chainHex];
      if (code === 4902 && addParams) {
        try { await eth.request({ method: "wallet_addEthereumChain", params: [addParams] }); }
        catch { throw new Error(`Add Polygon zkEVM (${cfg.chainHex}) to your wallet and retry.`); }
      } else {
        throw new Error(`Wallet is on ${current}; switch it to Polygon zkEVM (${cfg.chainHex}) and retry.`);
      }
    }
  }
  const provider = new BrowserProvider(eth as never);
  return provider.getSigner();
}

// ── AgentEscrow read (matches contracts/AgentEscrow.sol) ─────────────────────

const ESCROW_ABI = [
  "function total() view returns (uint256)",
  "function openCount() view returns (uint256)",
];

export async function getPolygonEscrowTotal(mode?: NetworkMode): Promise<{ total: number; open: number } | null> {
  const cfg = getPolygonConfig(mode);
  if (!cfg.escrowAddress) return null;
  try {
    const eth = getEth();
    const provider = new BrowserProvider(eth as never);
    const c = new Contract(cfg.escrowAddress, ESCROW_ABI, provider);
    const [total, open] = await Promise.all([c.total(), c.openCount()]);
    return { total: Number(total), open: Number(open) };
  } catch { return null; }
}
