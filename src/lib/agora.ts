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
