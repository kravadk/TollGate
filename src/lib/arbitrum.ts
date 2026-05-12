/* Arbitrum on-chain glue for the frontend.
 *
 * Wraps AgentEscrow (see contracts/AgentEscrow.sol): a native-ETH escrow for
 * agent→provider payments — open with a deadline, release on delivery, refund after
 * the deadline, or cancel (provider). Real-but-optional: present only when
 * VITE_ARBITRUM_ESCROW_ADDRESS is configured (deploy with `cd contracts && npm run deploy:arb`),
 * otherwise the app degrades gracefully — same pattern as src/lib/og.ts and src/lib/mantle.ts.
 */
import { BrowserProvider, Contract, parseEther, formatEther } from "ethers";

function env(key: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return v && v.trim() ? v.trim() : undefined;
}

/** Arbitrum Sepolia chain id MetaMask uses. Override with VITE_ARBITRUM_CHAIN_ID (0xa4b1 = Arbitrum One). */
export const ARBITRUM_DEFAULT_CHAIN_HEX = "0x66eee"; // 421614

const ARBITRUM_ADD_CHAIN: Record<string, unknown> = {
  "0x66eee": {
    chainId: "0x66eee",
    chainName: "Arbitrum Sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://sepolia.arbiscan.io"],
  },
  "0xa4b1": {
    chainId: "0xa4b1",
    chainName: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
  },
};

export type ArbitrumConfig = {
  escrowAddress: string | null;
  explorerBase: string;   // no trailing slash
  chainHex: string;       // lowercase 0x…
};

export function getArbitrumConfig(): ArbitrumConfig {
  const explorer = (env("VITE_ARBITRUM_EXPLORER") ?? "https://sepolia.arbiscan.io").replace(/\/+$/, "");
  const chainRaw = env("VITE_ARBITRUM_CHAIN_ID");
  let chainHex = ARBITRUM_DEFAULT_CHAIN_HEX;
  if (chainRaw) chainHex = chainRaw.startsWith("0x") ? chainRaw.toLowerCase() : "0x" + Number(chainRaw).toString(16);
  return {
    escrowAddress: env("VITE_ARBITRUM_ESCROW_ADDRESS") ?? null,
    explorerBase: explorer,
    chainHex,
  };
}

export function isArbitrumEscrowConfigured(): boolean { return getArbitrumConfig().escrowAddress !== null; }
export function arbitrumExplorerTxUrl(txHash: string): string { return `${getArbitrumConfig().explorerBase}/tx/${txHash}`; }
export function arbitrumExplorerAddrUrl(addr: string): string { return `${getArbitrumConfig().explorerBase}/address/${addr}`; }

const ESCROW_ABI = [
  "function open(address payee, address token, uint256 amount, uint64 deadline, bytes32 ref) payable returns (uint256 id)",
  "function release(uint256 id)",
  "function refund(uint256 id)",
  "function cancel(uint256 id)",
  "function total() view returns (uint256)",
  "function openCount() view returns (uint256)",
  "function getEscrow(uint256 id) view returns (tuple(address payer, address payee, address token, uint256 amount, uint64 deadline, uint8 state, bytes32 ref))",
  "event EscrowOpened(uint256 indexed id, address indexed payer, address indexed payee, address token, uint256 amount, uint64 deadline, bytes32 ref)",
  "event EscrowReleased(uint256 indexed id, address indexed payee, uint256 amount)",
  "event EscrowRefunded(uint256 indexed id, address indexed payer, uint256 amount)",
];

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

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

async function getArbitrumSigner() {
  const cfg = getArbitrumConfig();
  const eth = getEth();
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  if (current.toLowerCase() !== cfg.chainHex) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainHex }] });
    } catch (err) {
      const code = (err as { code?: number }).code;
      const addParams = ARBITRUM_ADD_CHAIN[cfg.chainHex];
      if (code === 4902 && addParams) {
        try { await eth.request({ method: "wallet_addEthereumChain", params: [addParams] }); }
        catch { throw new Error(`Add the Arbitrum chain (${cfg.chainHex}) to your wallet and retry.`); }
      } else {
        throw new Error(`Wallet is on ${current}; switch it to Arbitrum (${cfg.chainHex}) and retry.`);
      }
    }
  }
  const provider = new BrowserProvider(eth as never);
  return provider.getSigner();
}

function escrowContract(signerOrProvider: unknown) {
  const cfg = getArbitrumConfig();
  if (!cfg.escrowAddress) throw new Error("Arbitrum escrow not configured (set VITE_ARBITRUM_ESCROW_ADDRESS).");
  return new Contract(cfg.escrowAddress, ESCROW_ABI, signerOrProvider as never);
}

export type OpenEscrowResult = { txHash: string; explorerUrl: string; id: number | null; chainHex: string; contract: string };

/** Open a native-ETH escrow to `payee` for `amountEthStr` ETH, releasable until `deadlineSec` Unix seconds. Real tx. */
export async function openEscrow(params: { payee: string; amountEthStr: string; deadlineSec: number; refHex?: string }): Promise<OpenEscrowResult> {
  const cfg = getArbitrumConfig();
  if (!cfg.escrowAddress) throw new Error("Arbitrum escrow not configured (set VITE_ARBITRUM_ESCROW_ADDRESS).");
  if (!/^0x[0-9a-fA-F]{40}$/.test(params.payee)) throw new Error("Enter a valid provider address.");
  const amount = parseEther(params.amountEthStr);
  const signer = await getArbitrumSigner();
  const c = escrowContract(signer);
  const tx = await c.open(params.payee, ZERO_ADDR, amount, BigInt(Math.floor(params.deadlineSec)), to0xBytes32(params.refHex), { value: amount });
  const receipt = await tx.wait();
  let id: number | null = null;
  try {
    for (const log of receipt?.logs ?? []) {
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "EscrowOpened") { id = Number(parsed.args.id); break; }
    }
  } catch { /* id stays null */ }
  return { txHash: tx.hash as string, explorerUrl: arbitrumExplorerTxUrl(tx.hash as string), id, chainHex: cfg.chainHex, contract: cfg.escrowAddress };
}

export type EscrowActionResult = { txHash: string; explorerUrl: string };

export async function releaseEscrow(id: number): Promise<EscrowActionResult> {
  const signer = await getArbitrumSigner();
  const tx = await escrowContract(signer).release(BigInt(id));
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: arbitrumExplorerTxUrl(tx.hash as string) };
}
export async function refundEscrow(id: number): Promise<EscrowActionResult> {
  const signer = await getArbitrumSigner();
  const tx = await escrowContract(signer).refund(BigInt(id));
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: arbitrumExplorerTxUrl(tx.hash as string) };
}
export async function cancelEscrow(id: number): Promise<EscrowActionResult> {
  const signer = await getArbitrumSigner();
  const tx = await escrowContract(signer).cancel(BigInt(id));
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: arbitrumExplorerTxUrl(tx.hash as string) };
}

export type EscrowView = {
  payer: string; payee: string; token: string; amountEth: string;
  deadline: number; state: "None" | "Open" | "Released" | "Refunded"; ref: string;
};

const STATE_NAMES = ["None", "Open", "Released", "Refunded"] as const;

/** Read one escrow by id via the wallet provider. Returns null on failure / nonexistent. */
export async function getEscrowView(id: number): Promise<EscrowView | null> {
  const cfg = getArbitrumConfig();
  if (!cfg.escrowAddress) return null;
  try {
    const eth = getEth();
    const provider = new BrowserProvider(eth as never);
    const e = await escrowContract(provider).getEscrow(BigInt(id));
    return {
      payer: e.payer, payee: e.payee, token: e.token,
      amountEth: formatEther(e.amount),
      deadline: Number(e.deadline),
      state: STATE_NAMES[Number(e.state)] ?? "None",
      ref: e.ref,
    };
  } catch { return null; }
}
