// Server-side ReceiptNFT minter. After every verified x402 payment, mints an
// ERC-721 receipt NFT on Mantle mainnet. No-op if env vars are not set.

import { JsonRpcProvider, Wallet, Contract } from "ethers";

const RECEIPT_NFT_ADDRESS = process.env.RECEIPT_NFT_ADDRESS ?? "";
const MANTLE_RPC_URL = process.env.MANTLE_RPC_URL ?? "https://rpc.mantle.xyz";
const MINTER_PRIVATE_KEY = process.env.MINTER_PRIVATE_KEY ?? "";

const ABI = [
  "function mint(address to, string calldata uri, string calldata receiptId) external returns (uint256 tokenId)",
];

export interface MintResult {
  ok: boolean;
  tokenId?: number;
  txHash?: string;
  reason?: string;
}

export async function mintReceiptNFT(opts: {
  to: string;
  receiptId: string;
  serviceId: string;
  amount: number;
  currency: string;
  paidAt: string;
  txHash?: string;
}): Promise<MintResult> {
  if (!RECEIPT_NFT_ADDRESS || !MINTER_PRIVATE_KEY) {
    return { ok: false, reason: "receipt_nft_not_configured" };
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(opts.to)) {
    return { ok: false, reason: "invalid_recipient_address" };
  }

  const metadata = JSON.stringify({
    receiptId: opts.receiptId,
    serviceId: opts.serviceId,
    amount: opts.amount,
    currency: opts.currency,
    paidAt: opts.paidAt,
    txHash: opts.txHash ?? null,
  });
  const uri = `data:application/json;base64,${Buffer.from(metadata).toString("base64")}`;

  try {
    const provider = new JsonRpcProvider(MANTLE_RPC_URL);
    const wallet = new Wallet(MINTER_PRIVATE_KEY, provider);
    const contract = new Contract(RECEIPT_NFT_ADDRESS, ABI, wallet);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tx = await (contract as any).mint(opts.to, uri, opts.receiptId);
    const txReceipt = await tx.wait();
    const tokenId = txReceipt?.logs?.[0]
      ? parseInt(txReceipt.logs[0].topics[3] ?? "0", 16)
      : -1;
    return { ok: true, tokenId, txHash: tx.hash };
  } catch (e) {
    return { ok: false, reason: (e as Error).message?.slice(0, 120) };
  }
}
