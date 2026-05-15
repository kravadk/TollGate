/**
 * One-time setup: fund the 0G Compute broker ledger.
 * Run ONCE before starting the server for real inference.
 *
 *   cd server
 *   node scripts/fund-og-compute.cjs
 *
 * Needs ≥3 OG on the wallet (OG_COMPUTE_PRIVATE_KEY in server/.env).
 * Get testnet OG: https://faucet.0g.ai
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { createZGComputeNetworkBroker } = require("@0gfoundation/0g-compute-ts-sdk");
const { ethers } = require("ethers");

const KEY  = process.env.OG_COMPUTE_PRIVATE_KEY;
const RPC  = process.env.OG_COMPUTE_RPC  || "https://evmrpc-testnet.0g.ai";
const PROV = process.env.OG_COMPUTE_PROVIDER || "0xa48f01287233509FD694a22Bf840225062E67836";
const DEPOSIT = 3;
const LOCK    = 1;

if (!KEY) { console.error("Set OG_COMPUTE_PRIVATE_KEY in server/.env"); process.exit(1); }

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet   = new ethers.Wallet(KEY, provider);
  const { chainId } = await provider.getNetwork();
  const bal = await provider.getBalance(wallet.address);

  console.log(`Chain:   ${chainId}`);
  console.log(`Wallet:  ${wallet.address}`);
  console.log(`Balance: ${ethers.formatEther(bal)} OG`);

  if (parseFloat(ethers.formatEther(bal)) < DEPOSIT + 0.05) {
    console.error(`\nNeed ≥${DEPOSIT + 0.05} OG (${DEPOSIT} deposit + gas). Get testnet OG: https://faucet.0g.ai`);
    process.exit(1);
  }

  const broker = await createZGComputeNetworkBroker(wallet);

  let ledgerExists = false;
  try {
    const info = await broker.ledger.getLedger();
    console.log("\nExisting ledger:", JSON.stringify(info, null, 2));
    ledgerExists = true;
  } catch { /* no ledger yet */ }

  if (!ledgerExists) {
    console.log(`\nCreating ledger with ${DEPOSIT} OG deposit...`);
    const tx = await broker.ledger.addLedger(DEPOSIT);
    console.log("addLedger tx:", tx);
  }

  console.log(`\nTransferring ${LOCK} OG to provider ${PROV}...`);
  const tx2 = await broker.ledger.transferFund(PROV, "inference", BigInt(Math.floor(LOCK * 1e18)));
  console.log("transferFund tx:", tx2);

  const info = await broker.ledger.getLedger();
  console.log("\nFinal ledger state:", JSON.stringify(info, null, 2));
  console.log("\n✓ Done. Restart the server — real 0G Compute inference is ready.");
}

main().catch(e => { console.error("Error:", e.message || e); process.exit(1); });
