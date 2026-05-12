/* QIE testnet on-chain glue for the frontend.
 *
 * Two contracts (see contracts/): QieCheckout — invoice/payment/split settlement —
 * and QiePass — tiered ERC-721-like membership pass (Bronze / Silver / Gold).
 * Everything here is real-but-optional: present only when the addresses are configured
 * (deploy with `cd contracts && npm run deploy:qie`), otherwise the app degrades
 * gracefully — same pattern as src/lib/og.ts and src/lib/mantle.ts.
 */
import { BrowserProvider, Contract } from "ethers";

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
};

export type QieConfig = {
  checkoutAddress: string | null;
  passAddress: string | null;
  explorerBase: string;     // no trailing slash
  chainHex: string;         // lowercase 0x…
};

export function getQieConfig(): QieConfig {
  const explorer = (env("VITE_QIE_EXPLORER") ?? "https://testnet.qie.digital").replace(/\/+$/, "");
  const chainRaw = env("VITE_QIE_CHAIN_ID");
  let chainHex = QIE_DEFAULT_CHAIN_HEX;
  if (chainRaw) chainHex = chainRaw.startsWith("0x") ? chainRaw.toLowerCase() : "0x" + Number(chainRaw).toString(16);
  return {
    checkoutAddress: env("VITE_QIE_CHECKOUT_ADDRESS") ?? null,
    passAddress: env("VITE_QIE_PASS_ADDRESS") ?? null,
    explorerBase: explorer,
    chainHex,
  };
}

export function isQieCheckoutConfigured(): boolean { return getQieConfig().checkoutAddress !== null; }
export function isQiePassConfigured(): boolean { return getQieConfig().passAddress !== null; }

export function qieExplorerTxUrl(txHash: string): string { return `${getQieConfig().explorerBase}/tx/${txHash}`; }
export function qieExplorerAddrUrl(addr: string): string { return `${getQieConfig().explorerBase}/address/${addr}`; }

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

async function getQieSigner() {
  const cfg = getQieConfig();
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
        catch { throw new Error(`Add the QIE testnet (${cfg.chainHex}) to your wallet and retry.`); }
      } else {
        throw new Error(`Wallet is on ${current}; switch it to QIE testnet (${cfg.chainHex}) and retry.`);
      }
    }
  }
  const provider = new BrowserProvider(eth as never);
  return provider.getSigner();
}

// ── createInvoice ─────────────────────────────────────────────────────────────

export type InvoiceResult = { txHash: string; explorerUrl: string; invoiceId: number | null };

export async function createInvoice(payee: string, amountWei: bigint): Promise<InvoiceResult> {
  const cfg = getQieConfig();
  if (!cfg.checkoutAddress) throw new Error("QIE checkout not configured (set VITE_QIE_CHECKOUT_ADDRESS).");
  const signer = await getQieSigner();
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
  return { txHash: tx.hash as string, explorerUrl: qieExplorerTxUrl(tx.hash as string), invoiceId };
}

// ── payInvoice ────────────────────────────────────────────────────────────────

export async function payInvoice(invoiceId: number, amountWei: bigint): Promise<{ txHash: string; explorerUrl: string }> {
  const cfg = getQieConfig();
  if (!cfg.checkoutAddress) throw new Error("QIE checkout not configured.");
  const signer = await getQieSigner();
  const c = new Contract(cfg.checkoutAddress, CHECKOUT_ABI, signer);
  const tx = await c.payInvoice(invoiceId, { value: amountWei });
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: qieExplorerTxUrl(tx.hash as string) };
}

// ── splitPayout ───────────────────────────────────────────────────────────────

export async function splitPayout(payees: string[], amountsWei: bigint[], totalWei: bigint): Promise<{ txHash: string; explorerUrl: string }> {
  const cfg = getQieConfig();
  if (!cfg.checkoutAddress) throw new Error("QIE checkout not configured.");
  const signer = await getQieSigner();
  const c = new Contract(cfg.checkoutAddress, CHECKOUT_ABI, signer);
  const tx = await c.splitPayout(payees, amountsWei, { value: totalWei });
  await tx.wait();
  return { txHash: tx.hash as string, explorerUrl: qieExplorerTxUrl(tx.hash as string) };
}

// ── mintPass ──────────────────────────────────────────────────────────────────

export type MintPassResult = { txHash: string; explorerUrl: string; tokenId: number | null };

const TIER_PRICE_WEI: Record<0 | 1 | 2, bigint> = {
  0: 30000000000000000n,   // 0.03 QIE
  1: 150000000000000000n,  // 0.15 QIE
  2: 500000000000000000n,  // 0.50 QIE
};

export async function mintPass(to: string, tier: 0 | 1 | 2): Promise<MintPassResult> {
  const cfg = getQieConfig();
  if (!cfg.passAddress) throw new Error("QIE pass not configured (set VITE_QIE_PASS_ADDRESS).");
  const signer = await getQieSigner();
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
  return { txHash: tx.hash as string, explorerUrl: qieExplorerTxUrl(tx.hash as string), tokenId };
}

// ── checkPassTier / isValidPass ───────────────────────────────────────────────

export async function checkPassTier(holder: string): Promise<number> {
  const cfg = getQieConfig();
  if (!cfg.passAddress) return 255;
  const eth = getEth();
  const provider = new BrowserProvider(eth as never);
  const c = new Contract(cfg.passAddress, PASS_ABI, provider);
  try { return Number(await c.checkTier(holder)); } catch { return 255; }
}

export async function isValidPass(holder: string, minTier: 0 | 1 | 2): Promise<boolean> {
  const cfg = getQieConfig();
  if (!cfg.passAddress) return false;
  const eth = getEth();
  const provider = new BrowserProvider(eth as never);
  const c = new Contract(cfg.passAddress, PASS_ABI, provider);
  try { return Boolean(await c.isValid(holder, minTier)); } catch { return false; }
}
