/* Test all 5 deployed 0G contracts end-to-end from the deployer key.
 *
 *   cd contracts
 *   node scripts/test-og-contracts.cjs          # 0G mainnet
 *   OG_RPC=https://evmrpc-testnet.0g.ai node scripts/test-og-contracts.cjs  # testnet
 *
 * Uses OG_PRIVATE_KEY from contracts/.env.
 */
require("dotenv").config();
const { ethers } = require("ethers");

const RPC  = process.env.OG_RPC  || process.env.OG_RPC_URL  || "https://evmrpc.0g.ai";
const KEY  = process.env.OG_PRIVATE_KEY;
if (!KEY) { console.error("Set OG_PRIVATE_KEY in contracts/.env"); process.exit(1); }

const ADDR = {
  AgentReceiptRegistry:  "0x801ddc5a54E5a7F1d0D6900AA996A04E26D0307f",
  AgentIdentityRegistry: "0x8769E9ad02728d49D08CE2F5D5cd4ce75EeC0446",
  ServiceRegistry:       "0x2b27425bd22Ae883dEc34F7a8Eacacf336C562b8",
  AgentBudgetController: "0x305eF265BD964fBe34913E70Ef6AA8951e6b662e",
  DeliveryVerifier:      "0x5F4999829D57f714497343f5677e66e6A56238E3",
};

const ABI = {
  AgentReceiptRegistry: [
    "function record(bytes32 receiptHash, bytes32 payloadHash) external returns (uint256 index)",
    "function total() external view returns (uint256)",
    "function isRecorded(bytes32 receiptHash) external view returns (bool)",
  ],
  AgentIdentityRegistry: [
    "function register(string calldata agentDomain, address agentAddress) external returns (uint256 agentId)",
    "function agentIdOf(address agentAddress) external view returns (uint256)",
    "function ownerOf(uint256 agentId) external view returns (address)",
  ],
  ServiceRegistry: [
    "function register(string calldata serviceId, string calldata name, uint256 priceWei, string calldata currency, string calldata network, string calldata endpoint, string calldata agentCardUri) external returns (bytes32 key)",
    "function getService(string calldata serviceId) external view returns (tuple(address provider, string serviceId, string name, uint256 priceWei, string currency, string network, string endpoint, string agentCardUri, bool active, uint64 registeredAt, uint64 updatedAt))",
  ],
  AgentBudgetController: [
    "function setBudget(address agent, uint128 dailyLimitCents, uint128 perRequestMaxCents, bool autoPay, bytes32 allowlistRoot) external",
    "function getBudget(address agent) external view returns (uint128 dailyLimitCents, uint128 perRequestMaxCents, uint128 spentToday, uint128 remainingToday, bool autoPay)",
  ],
  DeliveryVerifier: [
    "function verify(bytes32 responseHash, bytes calldata signature, address expectedProvider) external pure returns (bool)",
    "function anchor(bytes32 requestHash, bytes32 responseHash, bytes calldata signature) external returns (address provider)",
    "function isAnchored(bytes32 requestHash) external view returns (bool)",
  ],
};

let pass = 0; let fail = 0;
function ok(label, ...extra) { pass++; console.log(`  ✓ ${label}`, ...extra); }
function err(label, e) { fail++; console.error(`  ✗ ${label}:`, e?.shortMessage || e?.message || e); }

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet   = new ethers.Wallet(KEY, provider);
  const { chainId } = await provider.getNetwork();
  const bal = await provider.getBalance(wallet.address);
  const ts = Date.now();

  console.log(`\n${"─".repeat(60)}`);
  console.log(`RPC:       ${RPC}`);
  console.log(`Chain ID:  ${chainId}`);
  console.log(`Wallet:    ${wallet.address}`);
  console.log(`Balance:   ${ethers.formatEther(bal)} OG`);
  console.log(`${"─".repeat(60)}\n`);

  // ── 1. AgentReceiptRegistry ──────────────────────────────────────────────────
  console.log("1. AgentReceiptRegistry  →  " + ADDR.AgentReceiptRegistry);
  const registry = new ethers.Contract(ADDR.AgentReceiptRegistry, ABI.AgentReceiptRegistry, wallet);
  try {
    const totalBefore = await registry.total();
    ok("total() read", `= ${totalBefore}`);

    const receiptHash = ethers.keccak256(ethers.toUtf8Bytes(`test-receipt-${ts}`));
    const payloadHash = ethers.keccak256(ethers.toUtf8Bytes(`test-payload-${ts}`));

    const beforeFlag = await registry.isRecorded(receiptHash);
    ok("isRecorded() before", `= ${beforeFlag}`);

    const tx = await registry.record(receiptHash, payloadHash);
    await tx.wait();
    ok("record() tx mined", tx.hash);

    const afterFlag = await registry.isRecorded(receiptHash);
    if (!afterFlag) throw new Error("isRecorded still false after record()");
    ok("isRecorded() after", `= ${afterFlag}`);

    const totalAfter = await registry.total();
    ok("total() after", `${totalBefore} → ${totalAfter}`);
  } catch (e) { err("AgentReceiptRegistry", e); }
  console.log();

  // ── 2. AgentIdentityRegistry ─────────────────────────────────────────────────
  console.log("2. AgentIdentityRegistry  →  " + ADDR.AgentIdentityRegistry);
  const idReg = new ethers.Contract(ADDR.AgentIdentityRegistry, ABI.AgentIdentityRegistry, wallet);
  try {
    const existingId = await idReg.agentIdOf(wallet.address);
    if (existingId > 0n) {
      ok("agentIdOf() — already registered", `agentId=${existingId} (skip re-register)`);
    } else {
      const domain = `tollgate-test-${ts}.agent`;
      const tx = await idReg.register(domain, wallet.address);
      await tx.wait();
      ok("register() tx mined", tx.hash);
      const newId = await idReg.agentIdOf(wallet.address);
      ok("agentIdOf() after register", `agentId=${newId}`);
      const owner = await idReg.ownerOf(newId);
      if (owner.toLowerCase() !== wallet.address.toLowerCase()) throw new Error(`owner mismatch: ${owner}`);
      ok("ownerOf() matches wallet");
    }
  } catch (e) { err("AgentIdentityRegistry", e); }
  console.log();

  // ── 3. ServiceRegistry ───────────────────────────────────────────────────────
  console.log("3. ServiceRegistry  →  " + ADDR.ServiceRegistry);
  const svcReg = new ethers.Contract(ADDR.ServiceRegistry, ABI.ServiceRegistry, wallet);
  const serviceId = `tollgate-test-${ts}`;
  try {
    const tx = await svcReg.register(
      serviceId,
      "TollGate Test Service",
      ethers.parseEther("0.001"),
      "OG",
      "0g-mainnet",
      "https://tollgate.ai/api/gateway/test",  // endpoint
      "https://tollgate.ai/agents/test",        // agentCardUri
    );
    await tx.wait();
    ok("register() tx mined", tx.hash);

    const svc = await svcReg.getService(serviceId);
    if (!svc.active) throw new Error("Service not active after register");
    ok("getService() verified", `provider=${svc.provider}`);
  } catch (e) { err("ServiceRegistry", e); }
  console.log();

  // ── 4. AgentBudgetController ─────────────────────────────────────────────────
  console.log("4. AgentBudgetController  →  " + ADDR.AgentBudgetController);
  const budget = new ethers.Contract(ADDR.AgentBudgetController, ABI.AgentBudgetController, wallet);
  try {
    const tx = await budget.setBudget(wallet.address, 100n, 10n, false, ethers.ZeroHash);
    await tx.wait();
    ok("setBudget() tx mined", tx.hash);

    const b = await budget.getBudget(wallet.address);
    if (Number(b.dailyLimitCents) !== 100) throw new Error(`dailyLimit wrong: ${b.dailyLimitCents}`);
    ok("getBudget() correct", `daily=${b.dailyLimitCents}¢ perReq=${b.perRequestMaxCents}¢`);
  } catch (e) { err("AgentBudgetController", e); }
  console.log();

  // ── 5. DeliveryVerifier ──────────────────────────────────────────────────────
  console.log("5. DeliveryVerifier  →  " + ADDR.DeliveryVerifier);
  const dv = new ethers.Contract(ADDR.DeliveryVerifier, ABI.DeliveryVerifier, wallet);
  try {
    const requestHash  = ethers.keccak256(ethers.toUtf8Bytes(`req-${ts}`));
    const responseHash = ethers.keccak256(ethers.toUtf8Bytes(`resp-${ts}`));

    // Sign raw bytes32 with EIP-191 personal_sign (matches contract's _recover)
    const sig = await wallet.signMessage(ethers.getBytes(responseHash));

    const valid = await dv.verify(responseHash, sig, wallet.address);
    if (!valid) throw new Error("verify() returned false");
    ok("verify() off-chain", "signature valid");

    const before = await dv.isAnchored(requestHash);
    ok("isAnchored() before", `= ${before}`);

    const tx = await dv.anchor(requestHash, responseHash, sig);
    await tx.wait();
    ok("anchor() tx mined", tx.hash);

    const after = await dv.isAnchored(requestHash);
    if (!after) throw new Error("isAnchored false after anchor()");
    ok("isAnchored() after", `= ${after}`);
  } catch (e) { err("DeliveryVerifier", e); }
  console.log();

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("─".repeat(60));
  console.log(`RESULT  ${pass} ✓  ${fail} ✗`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error("Fatal:", e.message || e); process.exitCode = 1; });
