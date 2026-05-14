/* QIE on-chain glue for the frontend.
 *
 * Two networks:
 *   Mainnet v3: chainId 1990 (0x7C6) — VITE_QIE_*
 *   Testnet:    chainId 1983 (0x7BF) — VITE_QIE_TESTNET_*
 *
 * Everything here is real-but-optional: present only when addresses are configured.
 * Same graceful-degradation pattern as src/lib/og.ts and src/lib/mantle.ts.
 */
import { BrowserProvider, Contract } from "ethers";
import type { NetworkMode } from "./chains";

function env(key: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return v && v.trim() ? v.trim() : undefined;
}

/** QIE testnet chain id hex. 1983 decimal = 0x7BF. */
export const QIE_DEFAULT_CHAIN_HEX = "0x7bf";

const QIE_ADD_CHAIN: Record<string, unknown> = {
  "0x7bf": {
    chainId: "0x7bf",
    chainName: "QIE Testnet",
    nativeCurrency: { name: "QIE", symbol: "QIE", decimals: 18 },
    rpcUrls: ["https://rpc1testnet.qie.digital/"],
    blockExplorerUrls: ["https://testnet.qie.digital"],
  },
  "0x7c6": {
    chainId: "0x7c6",
    chainName: "QIE Mainnet",
    nativeCurrency: { name: "QIE", symbol: "QIE", decimals: 18 },
    rpcUrls: ["https://rpc1mainnet.qie.digital/"],
    blockExplorerUrls: ["https://mainnet.qie.digital"],
  },
};

export type QieConfig = {
  checkoutAddress: string | null;
  passAddress: string | null;
  agentCreditAddress: string | null;
  oracleFeedAddress: string | null;
  explorerBase: string;   // no trailing slash
  chainHex: string;       // lowercase 0x…
  rpcUrl: string;
};

export function getQieConfig(mode?: NetworkMode): QieConfig {
  const isMainnet = mode === "mainnet";
  const prefix = isMainnet ? "" : "TESTNET_";
  const defaultExplorer = isMainnet ? "https://mainnet.qie.digital" : "https://testnet.qie.digital";
  const defaultChainHex = isMainnet ? "0x7c6" : QIE_DEFAULT_CHAIN_HEX;
  const rpcUrl = isMainnet ? "https://rpc1mainnet.qie.digital/" : "https://rpc1testnet.qie.digital/";
  return {
    checkoutAddress:    env(`VITE_QIE_${prefix}CHECKOUT_ADDRESS`) ?? null,
    passAddress:        env(`VITE_QIE_${prefix}PASS_ADDRESS`) ?? null,
    agentCreditAddress: env(`VITE_QIE_${prefix}AGENT_CREDIT_ADDRESS`) ?? null,
    oracleFeedAddress:  env(`VITE_QIE_${prefix}ORACLE_FEED_ADDRESS`) ?? null,
    explorerBase: defaultExplorer,
    chainHex: defaultChainHex,
    rpcUrl,
  };
}

export function isQieCheckoutConfigured(mode?: NetworkMode): boolean { return getQieConfig(mode).checkoutAddress !== null; }
export function isQiePassConfigured(mode?: NetworkMode): boolean { return getQieConfig(mode).passAddress !== null; }

export function qieExplorerTxUrl(txHash: string, mode?: NetworkMode): string { return `${getQieConfig(mode).explorerBase}/tx/${txHash}`; }
export function qieExplorerAddrUrl(addr: string, mode?: NetworkMode): string { return `${getQieConfig(mode).explorerBase}/address/${addr}`; }

// ── ABIs ──────────────────────────────────────────────────────────────────────

const CHECKOUT_ABI = [
  "function createInvoice(address payee, uint256 amount) returns (uint256 id)",
  "function payInvoice(uint256 id) payable",
  "function splitPayout(address[] calldata payees, uint256[] calldata amounts) payable",
  "function getInvoice(uint256 id) view returns (address payee, uint256 amount, bool paid, uint64 createdAt)",
  "function nextId() view returns (uint256)",
  "function merchantRevenue(address) view returns (uint256)",
  "event InvoiceCreated(uint256 indexed id, address indexed payee, uint256 amount)",
  "event InvoicePaid(uint256 indexed id, address indexed payer, uint256 amount)",
  "event SplitPayout(address[] payees, uint256[] amounts)",
];

const PASS_ABI = [
  "function mintPass(address to, uint8 tier) payable returns (uint256 tokenId)",
  "function checkTier(address holder) view returns (uint8)",
  "function isValid(address holder, uint8 minTier) view returns (bool)",
  "function totalMinted() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenTier(uint256 tokenId) view returns (uint8)",
  "event PassMinted(address indexed to, uint256 indexed tokenId, uint8 tier)",
];

// ── Internal helpers ──────────────────────────────────────────────────────────

type Eip1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };

function getEth(): Eip1193 {
  const eth = typeof window !== "undefined" ? (window as unknown as { ethereum?: Eip1193 }).ethereum : undefined;
  if (!eth) throw new Error("No EIP-1193 wallet detected — install MetaMask.");
  return eth;
}

async function getQieSigner(mode?: NetworkMode) {
  const cfg = getQieConfig(mode);
  const eth = getEth();
  const current = (await eth.request({ method: "eth_chainId" })) as string;
  if (current.toLowerCase() !== cfg.chainHex) {
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainHex }] });
    } catch (err) {
      const code = (err as { code?: number }).code;
      const addParams = QIE_ADD_CHAIN[cfg.chainHex];
      if (code === 4902 && addParams) {
        try { await eth.request({ method: "wallet_addEthereumChain", params: [addParams] }); }
        catch { throw new Error(`Add the QIE network (${cfg.chainHex}) to your wallet and retry.`); }
      } else {
        throw new Error(`Wallet is on ${current}; switch it to QIE (${cfg.chainHex}) and retry.`);
      }
    }
  }
  const provider = new BrowserProvider(eth as never);
  return provider.getSigner();
}

// ── createInvoice ─────────────────────────────────────────────────────────────

export type InvoiceResult = { txHash: string; explorerUrl: string; invoiceId: number | null };

export async function createInvoice(payee: string, amountWei: bigint, mode?: NetworkMode): Promise<InvoiceResult> {
  const cfg = getQieConfig(mode);
  if (!cfg.checkoutAddress) throw new Error("QIE checkout not configured (set VITE_QIE_CHECKOUT_ADDRESS).");
  const signer = await getQieSigner(mode);
  const c = new Contract(cfg.checkoutAddress, CHECKOUT_ABI, signer);
  const tx = await c.createInvoice(payee, amountWei);
  const receipt = await tx.wait();
  let invoiceId: number | null = null;
  try {
    for (const log of receipt?.logs ?? []) {
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "InvoiceCreated") { invoiceId = Number(parsed.args.id); break; }
    }
  } catch { /* invoiceId stays null */ }
  return { txHash: tx.hash as string, explorerUrl: qieExplorerTxUrl(tx.hash as string, mode), invoiceId };
}

// ── payInvoice ────────────────────────────────────────────────────────────────

export async function payInvoice(invoiceId: number, amountWei: bigint, mode?: NetworkMode): Promise<{ txHash: string; explorerUrl: string }> {
  const cfg = getQieConfig(mode);
  if (!cfg.checkoutAddress) throw new Error("QIE checkout not configured.");
  const signer = await getQieSigner(mode);
  const c = new Contract(cfg.checkoutAddress, CHECKOUT_ABI, signer);
  const tx = await c.payInvoice(invoiceId, { value: amountWei });
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: qieExplorerTxUrl(tx.hash as string, mode) };
}

// ── splitPayout ───────────────────────────────────────────────────────────────

export async function splitPayout(payees: string[], amountsWei: bigint[], totalWei: bigint, mode?: NetworkMode): Promise<{ txHash: string; explorerUrl: string }> {
  const cfg = getQieConfig(mode);
  if (!cfg.checkoutAddress) throw new Error("QIE checkout not configured.");
  const signer = await getQieSigner(mode);
  const c = new Contract(cfg.checkoutAddress, CHECKOUT_ABI, signer);
  const tx = await c.splitPayout(payees, amountsWei, { value: totalWei });
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: qieExplorerTxUrl(tx.hash as string, mode) };
}

// ── mintPass ──────────────────────────────────────────────────────────────────

export type MintPassResult = { txHash: string; explorerUrl: string; tokenId: number | null };

const TIER_PRICE_WEI: Record<0 | 1 | 2, bigint> = {
  0: 30000000000000000n,   // 0.03 QIE
  1: 150000000000000000n,  // 0.15 QIE
  2: 500000000000000000n,  // 0.50 QIE
};

export async function mintPass(to: string, tier: 0 | 1 | 2, mode?: NetworkMode): Promise<MintPassResult> {
  const cfg = getQieConfig(mode);
  if (!cfg.passAddress) throw new Error("QIE pass not configured (set VITE_QIE_PASS_ADDRESS).");
  const signer = await getQieSigner(mode);
  const c = new Contract(cfg.passAddress, PASS_ABI, signer);
  const price = TIER_PRICE_WEI[tier];
  const tx = await c.mintPass(to, tier, { value: price });
  const receipt = await tx.wait();
  let tokenId: number | null = null;
  try {
    for (const log of receipt?.logs ?? []) {
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "PassMinted") { tokenId = Number(parsed.args.tokenId); break; }
    }
  } catch { /* tokenId stays null */ }
  return { txHash: tx.hash as string, explorerUrl: qieExplorerTxUrl(tx.hash as string, mode), tokenId };
}

// ── checkPassTier / isValidPass ───────────────────────────────────────────────

export async function checkPassTier(holder: string, mode?: NetworkMode): Promise<number> {
  const cfg = getQieConfig(mode);
  if (!cfg.passAddress) return 255;
  const eth = getEth();
  const provider = new BrowserProvider(eth as never);
  const c = new Contract(cfg.passAddress, PASS_ABI, provider);
  try { return Number(await c.checkTier(holder)); } catch { return 255; }
}

export async function isValidPass(holder: string, minTier: 0 | 1 | 2, mode?: NetworkMode): Promise<boolean> {
  const cfg = getQieConfig(mode);
  if (!cfg.passAddress) return false;
  const eth = getEth();
  const provider = new BrowserProvider(eth as never);
  const c = new Contract(cfg.passAddress, PASS_ABI, provider);
  try { return Boolean(await c.isValid(holder, minTier)); } catch { return false; }
}
