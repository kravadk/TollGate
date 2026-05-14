/**
 * Server-side autonomous on-chain signing for TollGate.
 * After every x402 payment the gateway fires these fire-and-forget calls:
 *   - Mantle AgentVault.recordDecision  (audit trail)
 *   - Mantle AgentCreditRegistry.recordPayment (credit scoring)
 *   - 0G AgentReceiptRegistry.record    (cross-chain anchor, optional)
 *
 * Gated by MANTLE_PRIVATE_KEY / OG_PRIVATE_KEY — unset → silently skipped.
 * Uses the same ethers already present in og-compute.ts; no new deps required.
 */

import { createHash } from "node:crypto";
import { ethers } from "ethers";

const MANTLE_KEY    = process.env.MANTLE_PRIVATE_KEY ?? "";
const MANTLE_RPC    = process.env.MANTLE_RPC_URL ?? "https://rpc.mantle.xyz";
const VAULT_ADDR    = process.env.MANTLE_VAULT_ADDRESS ?? "0xCbBcFc657787Fef2702ae6E35CA5a809a68480da";
const CREDIT_ADDR   = process.env.MANTLE_CREDIT_ADDRESS ?? "0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9";

const OG_KEY        = process.env.OG_PRIVATE_KEY ?? "";
const OG_RPC        = process.env.OG_RPC_URL ?? "https://evmrpc.0g.ai";
const OG_REG_ADDR   = process.env.OG_REGISTRY_ADDRESS ?? "";

const VAULT_ABI    = ["function recordDecision(bytes32 decisionHash, bytes32 contextHash) returns (uint256 seq)"];
const CREDIT_ABI   = ["function recordPayment(address agent, uint128 amountWei) returns (uint256 score)"];
const OG_REG_ABI   = ["function record(bytes32 receiptHash, bytes32 payloadHash) returns (uint256 index)"];

function toBytes32(s: string): string {
  return "0x" + createHash("sha256").update(s).digest("hex");
}

// Lazy-initialized wallets — one provider per chain, reused across requests.
let mantleWallet: ethers.Wallet | null = null;
let ogWallet: ethers.Wallet | null = null;

function getMantleWallet(): ethers.Wallet | null {
  if (!MANTLE_KEY) return null;
  if (!mantleWallet) {
    mantleWallet = new ethers.Wallet(MANTLE_KEY, new ethers.JsonRpcProvider(MANTLE_RPC));
  }
  return mantleWallet;
}

function getOgWallet(): ethers.Wallet | null {
  if (!OG_KEY) return null;
  if (!ogWallet) {
    ogWallet = new ethers.Wallet(OG_KEY, new ethers.JsonRpcProvider(OG_RPC));
  }
  return ogWallet;
}

/** Record the x402 payment as a decision on Mantle AgentVault. */
export async function mantleRecordDecision(receiptId: string, payload?: string): Promise<string | null> {
  const wallet = getMantleWallet();
  if (!wallet || !VAULT_ADDR) return null;
  try {
    const contract = new ethers.Contract(VAULT_ADDR, VAULT_ABI, wallet);
    const tx = await (contract["recordDecision"] as (a: string, b: string) => Promise<ethers.TransactionResponse>)(
      toBytes32(receiptId),
      toBytes32(payload ?? receiptId),
    );
    console.log(`[chain-signer] Mantle recordDecision tx=${tx.hash}`);
    return tx.hash;
  } catch (e) {
    console.warn(`[chain-signer] mantleRecordDecision failed: ${(e as Error).message?.slice(0, 120)}`);
    return null;
  }
}

/**
 * Record the payer's payment in Mantle AgentCreditRegistry.
 * amountWei = amountUsd × 1e16 (contract stores as uint128 MNT-wei equivalent).
 */
export async function mantleRecordPayment(payerAddress: string, amountUsd: number): Promise<string | null> {
  const wallet = getMantleWallet();
  if (!wallet || !CREDIT_ADDR) return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(payerAddress)) return null;
  try {
    const contract = new ethers.Contract(CREDIT_ADDR, CREDIT_ABI, wallet);
    const amountWei = BigInt(Math.round(amountUsd * 1e16));
    const tx = await (contract["recordPayment"] as (a: string, b: bigint) => Promise<ethers.TransactionResponse>)(
      payerAddress,
      amountWei,
    );
    console.log(`[chain-signer] Mantle recordPayment tx=${tx.hash}`);
    return tx.hash;
  } catch (e) {
    console.warn(`[chain-signer] mantleRecordPayment failed: ${(e as Error).message?.slice(0, 120)}`);
    return null;
  }
}

/** Anchor the receipt hash on the 0G AgentReceiptRegistry (optional — skipped if OG_REGISTRY_ADDRESS unset). */
export async function ogAnchorReceipt(receiptId: string, payloadJson?: string): Promise<string | null> {
  const wallet = getOgWallet();
  if (!wallet || !OG_REG_ADDR) return null;
  try {
    const contract = new ethers.Contract(OG_REG_ADDR, OG_REG_ABI, wallet);
    const tx = await (contract["record"] as (a: string, b: string) => Promise<ethers.TransactionResponse>)(
      toBytes32(receiptId),
      toBytes32(payloadJson ?? receiptId),
    );
    console.log(`[chain-signer] 0G anchor receipt tx=${tx.hash}`);
    return tx.hash;
  } catch (e) {
    console.warn(`[chain-signer] ogAnchorReceipt failed: ${(e as Error).message?.slice(0, 120)}`);
    return null;
  }
}
