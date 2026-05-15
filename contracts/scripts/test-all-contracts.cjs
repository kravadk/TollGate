/**
 * test-all-contracts.cjs
 * Comprehensive contract testing: happy path, edge cases, access control, duplicates.
 * Run: cd contracts && node scripts/test-all-contracts.cjs 2>&1 | tee test-results.txt
 */
const { ethers } = require("ethers");

require("dotenv").config();
const PK      = process.env.OG_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!PK) { console.error("Set OG_PRIVATE_KEY in contracts/.env"); process.exit(1); }
const DEPLOYER = "0x0E437c109A4C1e15172c4dA557E77724D7243F71";
const ATTACKER = new ethers.Wallet(ethers.Wallet.createRandom().privateKey);
const TS = Date.now();
const b32 = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));
const uid = (pfx) => `${pfx}_${TS}`;

const PASS = [], FAIL = [];

async function test(label, network, expectRevert, fn) {
  try {
    const result = await fn();
    if (expectRevert) {
      FAIL.push({ label, network, issue: "Expected revert but tx succeeded!" });
      console.log(`  🔴 SHOULD-HAVE-REVERTED  ${label}`);
    } else {
      PASS.push({ label, network, hash: result?.hash });
      const h = result?.hash ?? "";
      console.log(`  ✅ PASS  ${label}  ${h.slice(0,20)}…`);
    }
  } catch (e) {
    const msg = (e.shortMessage ?? e.message ?? "").replace(/\n/g, " ").slice(0, 120);
    if (expectRevert) {
      PASS.push({ label: label + " [revert OK]", network });
      console.log(`  ✅ REVERT-OK  ${label} → ${msg}`);
    } else {
      FAIL.push({ label, network, issue: msg });
      console.log(`  ❌ FAIL  ${label} → ${msg}`);
    }
  }
}

function signer(pk, provider) { return new ethers.Wallet(pk, provider); }
function c(addr, abi, s)       { return new ethers.Contract(addr, abi, s); }

const ABI = {
  serviceReg: [
    "function register(string serviceId, string name, uint256 priceWei, string currency, string network, string endpoint, string agentCardUri)",
    "function update(string serviceId, uint256 newPriceWei, string newAgentCardUri)",
    "function deactivate(string serviceId)",
  ],
  agentBudget: [
    "function setPolicy(string agentId, uint256 dailyLimitWei, uint256 maxPerTxWei)",
    "function pause(string agentId)",
    "function unpause(string agentId)",
    "function checkAndSpend(string agentId, uint256 amountWei)",
  ],
  budgetCtrl: [
    "function setBudget(address agent, uint128 dailyLimitCents, uint128 perRequestMaxCents, bool autoPay, bytes32 allowlistRoot)",
    "function checkAndSpend(address agent, uint128 amountCents)",
  ],
  delivery: ["function anchor(bytes32 requestHash, bytes32 responseHash, bytes signature)"],
  receiptReg: ["function record(bytes32 receiptHash, bytes32 payloadHash)"],
  idReg: [
    "function register(string agentDomain, address agentAddress) returns (uint256)",
    "function setMemoryRoot(uint256 agentId, bytes32 root)",
    "function recordFeedback(uint256 agentId, uint8 score, bytes32 ref)",
  ],
  vault: [
    "function deposit() payable",
    "function deployToYield(uint256 amount, bytes32 strategyRef)",
    "function withdraw(uint256 amount)",
    "function recordDecision(bytes32 decisionHash, bytes32 contextHash)",
  ],
  creditReg: [
    "function recordPayment(address agent, uint128 amountWei)",
    "function recordMissedPayment(address agent)",
  ],
  escrow: [
    "function open(address payee, address token, uint256 amount, uint64 deadline, bytes32 ref) payable returns (uint256)",
    "function release(uint256 id)",
    "function refund(uint256 id)",
    "function nextId() view returns (uint256)",
  ],
  qieCheckout: [
    "function createInvoice(address payee, uint256 amount) returns (uint256)",
    "function payInvoice(uint256 id) payable",
    "function splitPayout(address[] payees, uint256[] amounts) payable",
    "function nextId() view returns (uint256)",
  ],
  qieOracle: [
    "function updateFeed(bytes32 serviceId, uint256 callCount, uint256 priceUsd18)",
    "function updateFeeds(bytes32[] ids, uint256[] counts, uint256[] prices)",
  ],
  qieCredit: [
    "function updateScore(address agent, uint256 score)",
  ],
};

async function makeSig(wallet, reqHash, resHash) {
  const msgHash = ethers.keccak256(ethers.concat([reqHash, resHash]));
  return wallet.signMessage(ethers.getBytes(msgHash));
}

// ══════════════════════════════════════════════════════════════════════════════
async function test0G_mainnet() {
  console.log("\n══ 0G MAINNET (16661) ═══════════════════════════════════════");
  const prov = new ethers.JsonRpcProvider("https://evmrpc.0g.ai");
  const s = signer(PK, prov);

  const svc = c("0x24Cb6d1bE131006e8CB2cb7fBa5675725f9E6Da8", ABI.serviceReg, s);
  const svcId = uid("svc_0g_main");

  await test("ServiceReg: register happy path",         "0G mainnet", false, async () => { return (await svc.register(svcId, "0G Svc", BigInt(1e15), "0G", "0g-mainnet", "https://tollgate.run", "")).wait(); });
  await test("ServiceReg: duplicate ID → revert",        "0G mainnet", true,  async () => { return (await svc.register(svcId, "dup", BigInt(1e15), "0G", "0g-mainnet", "https://x.com", "")).wait(); });
  await test("ServiceReg: empty serviceId → revert",     "0G mainnet", true,  async () => { return (await svc.register("", "No ID", BigInt(1e15), "0G", "0g-mainnet", "https://x.com", "")).wait(); });
  await test("ServiceReg: update price",                 "0G mainnet", false, async () => { return (await svc.update(svcId, BigInt(2e15), "ipfs://v2")).wait(); });
  await test("ServiceReg: deactivate",                   "0G mainnet", false, async () => { return (await svc.deactivate(svcId)).wait(); });
  await test("ServiceReg: deactivate already → revert",  "0G mainnet", true,  async () => { return (await svc.deactivate(svcId)).wait(); });

  const budget = c("0xA8302734081F26b8a3E42f90DCf07b3E063441de", ABI.agentBudget, s);
  const agId = uid("agent_0g_main");

  await test("AgentBudget: setPolicy happy path",        "0G mainnet", false, async () => { return (await budget.setPolicy(agId, BigInt(1e16), BigInt(1e15))).wait(); });
  await test("AgentBudget: setPolicy zero limits",       "0G mainnet", false, async () => { return (await budget.setPolicy(uid("ag0g_zero"), 0n, 0n)).wait(); });
  await test("AgentBudget: pause",                       "0G mainnet", false, async () => { return (await budget.pause(agId)).wait(); });
  await test("AgentBudget: spend while paused → revert", "0G mainnet", true,  async () => { return (await budget.checkAndSpend(agId, BigInt(1e14))).wait(); });
  await test("AgentBudget: unpause",                     "0G mainnet", false, async () => { return (await budget.unpause(agId)).wait(); });
  await test("AgentBudget: spend within limit",          "0G mainnet", false, async () => { return (await budget.checkAndSpend(agId, BigInt(1e14))).wait(); });
  await test("AgentBudget: spend > maxPerTx → revert",  "0G mainnet", true,  async () => { return (await budget.checkAndSpend(agId, BigInt(1e17))).wait(); });

  const dvWallet = new ethers.Wallet(PK);
  const dv = c("0x8722BeBc218F89455E4E21D75C09B0D5bf1313C6", ABI.delivery, s);
  const rq = b32(`req_0g_${TS}`), rs = b32(`res_0g_${TS}`);
  const sig = await makeSig(dvWallet, rq, rs);

  await test("DeliveryVerifier: anchor happy path",       "0G mainnet", false, async () => { return (await dv.anchor(rq, rs, sig)).wait(); });
  await test("DeliveryVerifier: anchor same → revert",    "0G mainnet", true,  async () => { return (await dv.anchor(rq, rs, sig)).wait(); });
  await test("DeliveryVerifier: empty sig → revert",      "0G mainnet", true,  async () => { return (await dv.anchor(b32(`rq2_${TS}`), b32(`rs2_${TS}`), "0x")).wait(); });
  await test("DeliveryVerifier: wrong sig → revert",      "0G mainnet", true,  async () => {
    const bad = await ATTACKER.signMessage(ethers.getBytes(b32(`bad_${TS}`)));
    return (await dv.anchor(b32(`rq3_${TS}`), b32(`rs3_${TS}`), bad)).wait();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
async function test0G_testnet() {
  console.log("\n══ 0G GALILEO TESTNET (16602) ════════════════════════════════");
  const prov = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
  const s = signer(PK, prov);

  const svc = c("0x42a14858Da4B2f75DB5C581bA5579786A12d97b4", ABI.serviceReg, s);
  const svcId = uid("svc_0g_tnet");

  await test("0G Testnet ServiceReg: register",          "0G testnet", false, async () => { return (await svc.register(svcId, "0G Tnet Svc", BigInt(1e15), "0G", "0g-testnet", "https://tollgate.run", "")).wait(); });
  await test("0G Testnet ServiceReg: duplicate → revert","0G testnet", true,  async () => { return (await svc.register(svcId, "dup", BigInt(1e15), "0G", "0g-testnet", "https://x.com", "")).wait(); });
  await test("0G Testnet ServiceReg: update",            "0G testnet", false, async () => { return (await svc.update(svcId, BigInt(5e15), "")).wait(); });
  await test("0G Testnet ServiceReg: deactivate",        "0G testnet", false, async () => { return (await svc.deactivate(svcId)).wait(); });

  const rec = c("0xAe3D4eEc2a49dcBeA1c39CB6987507fA2BF97142", ABI.receiptReg, s);
  const rH = b32(`receipt_${TS}`), pH = b32(`payload_${TS}`);

  await test("ReceiptReg: record happy path",            "0G testnet", false, async () => { return (await rec.record(rH, pH)).wait(); });
  await test("ReceiptReg: duplicate → revert",           "0G testnet", true,  async () => { return (await rec.record(rH, pH)).wait(); });
  await test("ReceiptReg: zero hashes → revert",         "0G testnet", true,  async () => { return (await rec.record(ethers.ZeroHash, ethers.ZeroHash)).wait(); });
}

// ══════════════════════════════════════════════════════════════════════════════
async function testMantle_mainnet() {
  console.log("\n══ MANTLE MAINNET (5000) ═════════════════════════════════════");
  const prov = new ethers.JsonRpcProvider("https://rpc.mantle.xyz");
  const s = signer(PK, prov);

  const idReg = c("0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB", ABI.idReg, s);
  const r1 = ethers.Wallet.createRandom().address;
  const r2 = ethers.Wallet.createRandom().address;
  const dom = uid("mantle") + ".tollgate.run";

  await test("Mantle idReg: register",                   "Mantle mainnet", false, async () => { return (await idReg.register(dom, r1)).wait(); });
  await test("Mantle idReg: duplicate domain → revert",  "Mantle mainnet", true,  async () => { return (await idReg.register(dom, r2)).wait(); });
  await test("Mantle idReg: duplicate address → revert", "Mantle mainnet", true,  async () => { return (await idReg.register(uid("other")+".tollgate.run", r1)).wait(); });
  await test("Mantle idReg: empty domain → revert",      "Mantle mainnet", true,  async () => { return (await idReg.register("", r2)).wait(); });
  await test("Mantle idReg: zero address → revert",      "Mantle mainnet", true,  async () => { return (await idReg.register("zero.tollgate.run", ethers.ZeroAddress)).wait(); });
  await test("Mantle idReg: recordFeedback score 5",     "Mantle mainnet", false, async () => { return (await idReg.recordFeedback(1n, 5, b32(`fb_${TS}`))).wait(); });
  await test("Mantle idReg: recordFeedback score 0 → revert","Mantle mainnet", true, async () => { return (await idReg.recordFeedback(1n, 0, b32(`fb0_${TS}`))).wait(); });
  await test("Mantle idReg: recordFeedback score 6 → revert","Mantle mainnet", true, async () => { return (await idReg.recordFeedback(1n, 6, b32(`fb6_${TS}`))).wait(); });
  await test("Mantle idReg: setMemoryRoot agent #1",     "Mantle mainnet", false, async () => { return (await idReg.setMemoryRoot(1n, b32(`mem_${TS}`))).wait(); });

  const svcReg = c("0x441fE2B53A85a38572C94688b2344a096ECe50cc", ABI.serviceReg, s);
  const svcId = uid("svc_mnt");

  await test("Mantle ServiceReg: register",              "Mantle mainnet", false, async () => { return (await svcReg.register(svcId, "Mantle Svc", BigInt(1e15), "MNT", "mantle-mainnet", "https://tollgate.run", "")).wait(); });
  await test("Mantle ServiceReg: duplicate → revert",    "Mantle mainnet", true,  async () => { return (await svcReg.register(svcId, "dup", BigInt(1e15), "MNT", "mantle-mainnet", "https://x.com", "")).wait(); });
  await test("Mantle ServiceReg: update",                "Mantle mainnet", false, async () => { return (await svcReg.update(svcId, BigInt(3e15), "")).wait(); });
  await test("Mantle ServiceReg: deactivate",            "Mantle mainnet", false, async () => { return (await svcReg.deactivate(svcId)).wait(); });

  const ctrl = c("0x54d203df5e5123d798581Dd61172F7E2a021A156", ABI.budgetCtrl, s);

  await test("Mantle BudgetCtrl: setBudget",             "Mantle mainnet", false, async () => { return (await ctrl.setBudget(DEPLOYER, 2000n, 200n, true, ethers.ZeroHash)).wait(); });
  await test("Mantle BudgetCtrl: setBudget zero",        "Mantle mainnet", false, async () => { return (await ctrl.setBudget(r1, 0n, 0n, false, ethers.ZeroHash)).wait(); });
  await test("Mantle BudgetCtrl: spend within limit",    "Mantle mainnet", false, async () => { return (await ctrl.checkAndSpend(DEPLOYER, 100n)).wait(); });
  await test("Mantle BudgetCtrl: spend > perReqMax → revert","Mantle mainnet", true, async () => { return (await ctrl.checkAndSpend(DEPLOYER, 100000n)).wait(); });

  const vault = c("0xCbBcFc657787Fef2702ae6E35CA5a809a68480da", ABI.vault, s);

  await test("Mantle Vault: deposit 0.0001 MNT",         "Mantle mainnet", false, async () => { return (await vault.deposit({ value: BigInt(1e14) })).wait(); });
  await test("Mantle Vault: deposit 0 → revert",         "Mantle mainnet", true,  async () => { return (await vault.deposit({ value: 0n })).wait(); });
  await test("Mantle Vault: recordDecision",             "Mantle mainnet", false, async () => { return (await vault.recordDecision(b32(`dec_${TS}`), b32(`ctx_${TS}`))).wait(); });
  await test("Mantle Vault: deployToYield",              "Mantle mainnet", false, async () => { return (await vault.deployToYield(BigInt(5e13), b32("meth-strategy"))).wait(); });
  await test("Mantle Vault: withdraw > balance → revert","Mantle mainnet", true,  async () => { return (await vault.withdraw(BigInt(999e18))).wait(); });

  const creditReg = c("0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9", ABI.creditReg, s);

  await test("Mantle CreditReg: recordPayment",          "Mantle mainnet", false, async () => { return (await creditReg.recordPayment(r1, BigInt(1e14))).wait(); });
  await test("Mantle CreditReg: recordMissedPayment",    "Mantle mainnet", false, async () => { return (await creditReg.recordMissedPayment(r1)).wait(); });
}

// ══════════════════════════════════════════════════════════════════════════════
async function testMantle_sepolia() {
  console.log("\n══ MANTLE SEPOLIA (5003) ═════════════════════════════════════");
  const prov = new ethers.JsonRpcProvider("https://rpc.sepolia.mantle.xyz");
  const s = signer(PK, prov);

  const idReg = c("0xAe3D4eEc2a49dcBeA1c39CB6987507fA2BF97142", ABI.idReg, s);
  const r1 = ethers.Wallet.createRandom().address;
  const r2 = ethers.Wallet.createRandom().address;
  const dom = uid("mantle-sep") + ".tollgate.run";

  await test("Mantle Sep idReg: register",               "Mantle Sepolia", false, async () => { return (await idReg.register(dom, r1)).wait(); });
  await test("Mantle Sep idReg: duplicate domain → revert","Mantle Sepolia", true, async () => { return (await idReg.register(dom, r2)).wait(); });
  await test("Mantle Sep idReg: empty domain → revert",  "Mantle Sepolia", true,  async () => { return (await idReg.register("", r2)).wait(); });
  await test("Mantle Sep idReg: zero address → revert",  "Mantle Sepolia", true,  async () => { return (await idReg.register("zero-sep.tollgate.run", ethers.ZeroAddress)).wait(); });

  const svc = c("0x42a14858Da4B2f75DB5C581bA5579786A12d97b4", ABI.serviceReg, s);
  const svcId = uid("svc_msep");

  await test("Mantle Sep ServiceReg: register",          "Mantle Sepolia", false, async () => { return (await svc.register(svcId, "Sep Svc", BigInt(1e15), "MNT", "mantle-sepolia", "https://tollgate.run", "")).wait(); });
  await test("Mantle Sep ServiceReg: duplicate → revert","Mantle Sepolia", true,  async () => { return (await svc.register(svcId, "dup", BigInt(1e15), "MNT", "mantle-sepolia", "https://x.com", "")).wait(); });
  await test("Mantle Sep ServiceReg: update non-existent → revert","Mantle Sepolia", true, async () => { return (await svc.update("does_not_exist", BigInt(1e15), "")).wait(); });
  await test("Mantle Sep ServiceReg: deactivate",        "Mantle Sepolia", false, async () => { return (await svc.deactivate(svcId)).wait(); });
}

// ══════════════════════════════════════════════════════════════════════════════
async function testArbitrum_sepolia() {
  console.log("\n══ ARBITRUM SEPOLIA (421614) ═════════════════════════════════");
  const prov = new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");
  const s = signer(PK, prov);

  const escrow = c("0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7", ABI.escrow, s);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const pastDL   = BigInt(Math.floor(Date.now() / 1000) - 100);
  let openId = 0n;

  await test("Arb Sep Escrow: open ETH happy path",      "Arb Sepolia", false, async () => {
    const nextId = await escrow.nextId();
    openId = nextId;
    return (await escrow.open(DEPLOYER, ethers.ZeroAddress, BigInt(1e14), deadline, b32(`ref_${TS}`), { value: BigInt(1e14) })).wait();
  });
  await test("Arb Sep Escrow: open 0 amount → revert",   "Arb Sepolia", true,  async () => { return (await escrow.open(DEPLOYER, ethers.ZeroAddress, 0n, deadline, b32(`ref_z_${TS}`), { value: 0n })).wait(); });
  await test("Arb Sep Escrow: past deadline → revert",   "Arb Sepolia", true,  async () => { return (await escrow.open(DEPLOYER, ethers.ZeroAddress, BigInt(1e14), pastDL, b32(`ref_pd_${TS}`), { value: BigInt(1e14) })).wait(); });
  await test("Arb Sep Escrow: value mismatch → revert",  "Arb Sepolia", true,  async () => { return (await escrow.open(DEPLOYER, ethers.ZeroAddress, BigInt(1e14), deadline, b32(`ref_mm_${TS}`), { value: BigInt(2e14) })).wait(); });
  await test("Arb Sep Escrow: zero payee → revert",      "Arb Sepolia", true,  async () => { return (await escrow.open(ethers.ZeroAddress, ethers.ZeroAddress, BigInt(1e14), deadline, b32(`ref_zp_${TS}`), { value: BigInt(1e14) })).wait(); });
  await test("Arb Sep Escrow: refund before deadline → revert","Arb Sepolia", true, async () => { return (await escrow.refund(openId)).wait(); });
  await test("Arb Sep Escrow: release by payer",         "Arb Sepolia", false, async () => { return (await escrow.release(openId)).wait(); });
  await test("Arb Sep Escrow: release already released → revert","Arb Sepolia", true, async () => { return (await escrow.release(openId)).wait(); });

  const svc = c("0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9", ABI.serviceReg, s);
  const svcId = uid("svc_arb_sep");

  await test("Arb Sep ServiceReg: register",             "Arb Sepolia", false, async () => { return (await svc.register(svcId, "Arb Sep Svc", BigInt(1e15), "ETH", "arb-sepolia", "https://tollgate.run", "")).wait(); });
  await test("Arb Sep ServiceReg: duplicate → revert",   "Arb Sepolia", true,  async () => { return (await svc.register(svcId, "dup", BigInt(1e15), "ETH", "arb-sepolia", "https://x.com", "")).wait(); });

  const budget = c("0x9dD4Df1dE852c8308A2d3Aa6bD8e2257Dd786A09", ABI.agentBudget, s);
  const agId = uid("agent_arb_sep");

  await test("Arb Sep Budget: setPolicy",                "Arb Sepolia", false, async () => { return (await budget.setPolicy(agId, BigInt(1e16), BigInt(1e15))).wait(); });
  await test("Arb Sep Budget: pause",                    "Arb Sepolia", false, async () => { return (await budget.pause(agId)).wait(); });
  await test("Arb Sep Budget: spend while paused → revert","Arb Sepolia", true, async () => { return (await budget.checkAndSpend(agId, BigInt(1e14))).wait(); });
  await test("Arb Sep Budget: unpause",                  "Arb Sepolia", false, async () => { return (await budget.unpause(agId)).wait(); });
  await test("Arb Sep Budget: spend within limit",       "Arb Sepolia", false, async () => { return (await budget.checkAndSpend(agId, BigInt(1e14))).wait(); });
  await test("Arb Sep Budget: spend > maxPerTx → revert","Arb Sepolia", true,  async () => { return (await budget.checkAndSpend(agId, BigInt(1e17))).wait(); });

  const dvW = new ethers.Wallet(PK);
  const dv = c("0x0A905740007B6123faa5dA7045Bb18A62Da8B3F8", ABI.delivery, s);
  const rq = b32(`req_arb_sep_${TS}`), rs = b32(`res_arb_sep_${TS}`);
  const sig = await makeSig(dvW, rq, rs);

  await test("Arb Sep DeliveryVerifier: anchor",         "Arb Sepolia", false, async () => { return (await dv.anchor(rq, rs, sig)).wait(); });
  await test("Arb Sep DeliveryVerifier: same → revert",  "Arb Sepolia", true,  async () => { return (await dv.anchor(rq, rs, sig)).wait(); });
  await test("Arb Sep DeliveryVerifier: empty sig → revert","Arb Sepolia", true, async () => { return (await dv.anchor(b32(`rq2arb_${TS}`), b32(`rs2arb_${TS}`), "0x")).wait(); });
}

// ══════════════════════════════════════════════════════════════════════════════
async function testArbitrum_mainnet() {
  console.log("\n══ ARBITRUM ONE MAINNET (42161) ══════════════════════════════");
  const prov = new ethers.JsonRpcProvider("https://arb1.arbitrum.io/rpc");
  const s = signer(PK, prov);

  const svc = c("0x8403F655Cb8750012D443c135840185691039236", ABI.serviceReg, s);
  const svcId = uid("svc_arb_main");

  await test("Arb One ServiceReg: register",             "Arb One", false, async () => { return (await svc.register(svcId, "Arb One Svc", BigInt(1e15), "ETH", "arbitrum-one", "https://tollgate.run", "")).wait(); });
  await test("Arb One ServiceReg: duplicate → revert",   "Arb One", true,  async () => { return (await svc.register(svcId, "dup", BigInt(1e15), "ETH", "arbitrum-one", "https://x.com", "")).wait(); });
  await test("Arb One ServiceReg: update",               "Arb One", false, async () => { return (await svc.update(svcId, BigInt(4e15), "")).wait(); });
  await test("Arb One ServiceReg: deactivate",           "Arb One", false, async () => { return (await svc.deactivate(svcId)).wait(); });

  const budget = c("0x68c17e2e69DD79651457D440B5f5DCE77B9ad732", ABI.agentBudget, s);
  const agId = uid("agent_arb_main");

  await test("Arb One Budget: setPolicy",                "Arb One", false, async () => { return (await budget.setPolicy(agId, BigInt(1e16), BigInt(1e15))).wait(); });
  await test("Arb One Budget: pause",                    "Arb One", false, async () => { return (await budget.pause(agId)).wait(); });
  await test("Arb One Budget: spend while paused → revert","Arb One", true, async () => { return (await budget.checkAndSpend(agId, BigInt(1e14))).wait(); });
  await test("Arb One Budget: unpause",                  "Arb One", false, async () => { return (await budget.unpause(agId)).wait(); });
  await test("Arb One Budget: spend within limit",       "Arb One", false, async () => { return (await budget.checkAndSpend(agId, BigInt(1e14))).wait(); });
}

// ══════════════════════════════════════════════════════════════════════════════
async function testQIE(name, rpc, addrs) {
  console.log(`\n══ ${name} ════════════════════════════════════════════════════`);
  const prov = new ethers.JsonRpcProvider(rpc);
  const s = signer(PK, prov);
  const attSigner = ATTACKER.connect(prov);

  const checkout = c(addrs.checkout, ABI.qieCheckout, s);
  let invoiceId = 0n;

  await test(`${name} Checkout: createInvoice`,          name, false, async () => {
    invoiceId = await checkout.nextId();
    return (await checkout.createInvoice(DEPLOYER, BigInt(1e18))).wait();
  });
  await test(`${name} Checkout: createInvoice zero → revert`,  name, true,  async () => { return (await checkout.createInvoice(DEPLOYER, 0n)).wait(); });
  await test(`${name} Checkout: createInvoice zero addr → revert`, name, true, async () => { return (await checkout.createInvoice(ethers.ZeroAddress, BigInt(1e18))).wait(); });
  await test(`${name} Checkout: payInvoice`,             name, false, async () => { return (await checkout.payInvoice(invoiceId, { value: BigInt(1e18) })).wait(); });
  await test(`${name} Checkout: payInvoice already paid → revert`, name, true, async () => { return (await checkout.payInvoice(invoiceId, { value: BigInt(1e18) })).wait(); });
  await test(`${name} Checkout: payInvoice nonexistent → revert`, name, true,  async () => { return (await checkout.payInvoice(99999n, { value: BigInt(1e18) })).wait(); });
  await test(`${name} Checkout: splitPayout`,            name, false, async () => {
    const r = ethers.Wallet.createRandom().address;
    return (await checkout.splitPayout([DEPLOYER, r], [BigInt(6e17), BigInt(4e17)], { value: BigInt(1e18) })).wait();
  });
  await test(`${name} Checkout: splitPayout mismatch → revert`, name, true, async () => { return (await checkout.splitPayout([DEPLOYER], [BigInt(6e17), BigInt(4e17)], { value: BigInt(1e18) })).wait(); });

  const oracle = c(addrs.oracle, ABI.qieOracle, s);
  const oracleAtt = c(addrs.oracle, ABI.qieOracle, attSigner);

  await test(`${name} Oracle: updateFeed (owner)`,       name, false, async () => { return (await oracle.updateFeed(b32("QIE/USD"), 150n, BigInt(5e16))).wait(); });
  await test(`${name} Oracle: updateFeed (non-owner) → revert`, name, true, async () => { return (await oracleAtt.updateFeed(b32("QIE/USD"), 1n, BigInt(1e16))).wait(); });
  await test(`${name} Oracle: updateFeeds batch`,        name, false, async () => {
    const ids = [b32("QIE/USD"), b32("QIE/BTC"), b32("QIE/ETH")];
    return (await oracle.updateFeeds(ids, [200n, 50n, 75n], [BigInt(5e16), BigInt(3e12), BigInt(5e14)])).wait();
  });
  await test(`${name} Oracle: updateFeeds mismatched → revert`, name, true, async () => { return (await oracle.updateFeeds([b32("QIE/USD")], [1n, 2n], [BigInt(1e16)])).wait(); });

  const credit = c(addrs.credit, ABI.qieCredit, s);
  const creditAtt = c(addrs.credit, ABI.qieCredit, attSigner);
  const agent = ethers.Wallet.createRandom().address;

  await test(`${name} Credit: updateScore 750 (owner)`,  name, false, async () => { return (await credit.updateScore(agent, 750n)).wait(); });
  await test(`${name} Credit: updateScore 0 → revert`,   name, true,  async () => { return (await credit.updateScore(agent, 0n)).wait(); });
  await test(`${name} Credit: updateScore 1001 → revert`,name, true,  async () => { return (await credit.updateScore(agent, 1001n)).wait(); });
  await test(`${name} Credit: updateScore non-owner → revert`, name, true, async () => { return (await creditAtt.updateScore(agent, 800n)).wait(); });
}

// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("DEPLOYER:", DEPLOYER);
  console.log("ATTACKER:", ATTACKER.address);
  console.log("Started:", new Date().toISOString());
  console.log("Tests cover: happy path | duplicate/idempotency | empty/zero inputs | access control | boundary values | state transitions");

  await test0G_mainnet();
  await test0G_testnet();
  await testMantle_mainnet();
  await testMantle_sepolia();
  await testArbitrum_sepolia();
  await testArbitrum_mainnet();
  await testQIE("QIE mainnet", "https://rpc1mainnet.qie.digital/", {
    checkout: "0x24Cb6d1bE131006e8CB2cb7fBa5675725f9E6Da8",
    oracle:   "0xAe3D4eEc2a49dcBeA1c39CB6987507fA2BF97142",
    credit:   "0x8722BeBc218F89455E4E21D75C09B0D5bf1313C6",
  });
  await testQIE("QIE testnet", "https://rpc1testnet.qie.digital/", {
    checkout: "0xAe3D4eEc2a49dcBeA1c39CB6987507fA2BF97142",
    oracle:   "0x455cfBf7053d9E1c47306A7B7e53559ea73eeF1A",
    credit:   "0xBA4721Df33C3f32d8d35dEE21745cDC2B5b2Db81",
  });

  console.log(`\n${"═".repeat(70)}`);
  console.log("FINAL REPORT");
  console.log("═".repeat(70));
  console.log(`✅ PASS: ${PASS.length}   ❌ FAIL: ${FAIL.length}`);

  if (FAIL.length > 0) {
    console.log("\n─── FAILURES ─────────────────────────────────────────────────");
    for (const f of FAIL) {
      console.log(`  [${f.network}] ${f.label}`);
      console.log(`    → ${f.issue}`);
    }
  }

  console.log("\n─── PASS BY NETWORK ──────────────────────────────────────────");
  const byNet = {};
  for (const p of PASS) (byNet[p.network] = byNet[p.network] ?? []).push(p.label);
  for (const [net, labels] of Object.entries(byNet)) {
    console.log(`\n  ${net} (${labels.length}):`);
    for (const l of labels) console.log(`    • ${l}`);
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
