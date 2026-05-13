/**
 * One-time funding for the 0G Compute ledger.
 *
 * Run once with a 0G wallet that holds testnet OG (from faucet.0g.ai):
 *
 *   cd server
 *   # either put OG_COMPUTE_PRIVATE_KEY in server/.env, or pass it inline:
 *   OG_COMPUTE_PRIVATE_KEY=0xYOURKEY node scripts/og-compute-fund.mjs
 *
 * Env it reads:
 *   OG_COMPUTE_PRIVATE_KEY   (required) — funded 0G wallet key
 *   OG_COMPUTE_RPC           (default https://evmrpc-testnet.0g.ai — Galileo testnet)
 *   OG_COMPUTE_PROVIDER      (default a public testnet inference provider; pick a current one
 *                             from https://compute-marketplace.0g.ai)
 *   OG_COMPUTE_DEPOSIT       (default 10) — OG to deposit into the ledger (min 3)
 *   OG_COMPUTE_LOCK          (default 1)  — OG to lock to the provider for "inference" (min 1)
 *
 * After this succeeds: set OG_COMPUTE_PRIVATE_KEY (and OG_COMPUTE_RPC if you overrode it) in
 * server/.env and on Render → POST /api/og/compute will run real 0G Compute inference.
 */
import "dotenv/config";
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";

const KEY      = process.env.OG_COMPUTE_PRIVATE_KEY;
const RPC      = process.env.OG_COMPUTE_RPC      ?? "https://evmrpc-testnet.0g.ai";
const PROVIDER = process.env.OG_COMPUTE_PROVIDER ?? "0xa48f01287233509FD694a22Bf840225062E67836";
const DEPOSIT  = Number(process.env.OG_COMPUTE_DEPOSIT ?? 10);
const LOCK     = Number(process.env.OG_COMPUTE_LOCK ?? 1);

if (!KEY) {
  console.error("✗ Set OG_COMPUTE_PRIVATE_KEY (in server/.env, or inline before the command).");
  process.exit(1);
}

const wallet = new ethers.Wallet(KEY, new ethers.JsonRpcProvider(RPC));
console.log(`Wallet:   ${wallet.address}`);
console.log(`RPC:      ${RPC}`);
console.log(`Provider: ${PROVIDER}`);

const bal = await wallet.provider.getBalance(wallet.address);
const balOG = Number(ethers.formatEther(bal));
console.log(`Balance:  ${balOG} OG`);

const broker = await createZGComputeNetworkBroker(wallet);

// `node scripts/og-compute-fund.mjs --list` → print available inference providers on this RPC and exit.
if (process.argv.includes("--list")) {
  const svcs = await broker.inference.listService();
  console.log(`\nInference providers on ${RPC}:`);
  if (!svcs?.length) console.log("  (none — try the other RPC: mainnet https://evmrpc.0g.ai / testnet https://evmrpc-testnet.0g.ai)");
  for (const s of svcs ?? []) {
    console.log(`  ${s.provider ?? s.providerAddress ?? s.address ?? "?"}   model=${s.model ?? "?"}   url=${s.url ?? s.endpoint ?? "?"}`);
  }
  process.exit(0);
}

try {
  const ledger = await broker.ledger?.getLedger?.();
  if (ledger) console.log("Existing ledger:", ledger);
} catch { /* no ledger yet — depositFund creates it */ }

// Auto-cap the deposit so it fits the balance: need deposit ≥ 3, plus the lock, plus gas headroom.
const GAS_HEADROOM = 0.2;
const deposit = Math.min(DEPOSIT, Math.floor((balOG - LOCK - GAS_HEADROOM) * 100) / 100);
if (!Number.isFinite(deposit) || deposit < 3) {
  console.error(`✗ Balance too low: need ≈ ${(3 + LOCK + GAS_HEADROOM).toFixed(1)} OG (3 deposit + ${LOCK} lock + gas), you have ${balOG}.`);
  console.error(`  Top up at faucet.0g.ai (pick Galileo testnet), or run against mainnet:  $env:OG_COMPUTE_RPC="https://evmrpc.0g.ai"; node scripts/og-compute-fund.mjs`);
  process.exit(1);
}

console.log(`\nDepositing ${deposit} OG into the compute ledger…`);
await broker.ledger.depositFund(deposit);
console.log("✓ Deposited.");

console.log(`Locking ${LOCK} OG to provider ${PROVIDER} (service: inference)…`);
await broker.ledger.transferFund(PROVIDER, "inference", BigInt(LOCK) * BigInt(10 ** 18));
console.log("✓ Locked.");

console.log("\n✅ Done. Now set in server/.env (and on Render):");
console.log(`   OG_COMPUTE_PRIVATE_KEY=${KEY.slice(0, 6)}…`);
if (process.env.OG_COMPUTE_RPC) console.log(`   OG_COMPUTE_RPC=${RPC}`);
console.log(`   OG_COMPUTE_PROVIDER=${PROVIDER}   (optional)`);
process.exit(0);
