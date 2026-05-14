/**
 * send-test-txs.cjs
 * Sends one real transaction per deployed contract per network.
 * Run: cd contracts && node scripts/send-test-txs.cjs
 */
const { ethers } = require("ethers");

require("dotenv").config();
const PK = process.env.OG_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!PK) { console.error("Set OG_PRIVATE_KEY in contracts/.env"); process.exit(1); }
const DEPLOYER = "0x0E437c109A4C1e15172c4dA557E77724D7243F71";
const TS = Date.now();

// ── ABIs (only write functions needed) ────────────────────────────────────────
const ABI = {
  register:       ["function register(string agentDomain, address agentAddress) returns (uint256)"],
  svcRegister:    ["function register(string serviceId, string name, uint256 priceWei, string currency, string network, string endpoint, string agentCardUri)"],
  setPolicy:      ["function setPolicy(string agentId, uint256 dailyLimitWei, uint256 maxPerTxWei)"],
  setBudget:      ["function setBudget(address agent, uint128 dailyLimitCents, uint128 perRequestMaxCents, bool autoPay, bytes32 allowlistRoot)"],
  record:         ["function record(bytes32 receiptHash, bytes32 payloadHash)"],
  anchor:         ["function anchor(bytes32 requestHash, bytes32 responseHash, bytes signature)"],
  deposit:        ["function deposit() payable"],
  recordDecision: ["function recordDecision(bytes32 decisionHash, bytes32 contextHash)"],
  escrowOpen:     ["function open(address payee, address token, uint256 amount, uint64 deadline, bytes32 ref) payable returns (uint256)"],
  createInvoice:  ["function createInvoice(address payee, uint256 amount) returns (uint256)"],
  updateFeed:     ["function updateFeed(bytes32 serviceId, uint256 callCount, uint256 priceUsd18)"],
  updateScore:    ["function updateScore(address agent, uint256 score)"],
  setGateway:     ["function setGateway(address gateway, bool trusted)"],
  recordPayment:  ["function recordPayment(address agent, uint128 amountWei)"],
};

// ── Helper ─────────────────────────────────────────────────────────────────────
async function send(label, contract, method, args, opts = {}) {
  try {
    const tx = await contract[method](...args, opts);
    const receipt = await tx.wait();
    console.log(`  ✅ ${label}`);
    console.log(`     tx: ${receipt.hash}`);
    return receipt.hash;
  } catch (e) {
    const msg = (e.shortMessage ?? e.message ?? String(e)).replace(/\n/g, " ");
    console.log(`  ❌ ${label}: ${msg.slice(0, 120)}`);
    return null;
  }
}

function c(addr, abi, signer) { return new ethers.Contract(addr, abi, signer); }
function b32(s) { return ethers.keccak256(ethers.toUtf8Bytes(s)); }

// ── Networks ───────────────────────────────────────────────────────────────────
const NETWORKS = [
  {
    name: "0G mainnet",
    rpc:  "https://evmrpc.0g.ai",
    explorer: "https://chainscan.0g.ai",
    contracts: [
      { label: "AgentIdentityRegistry → register",   addr: "0xF4BFd93061B160Fa376c7F66De207a00225B4e70", abi: ABI.register,      fn: "register",   args: () => [`og-${TS}.tollgate.run`, DEPLOYER] },
      { label: "ServiceRegistry → register",          addr: "0x24Cb6d1bE131006e8CB2cb7fBa5675725f9E6Da8", abi: ABI.svcRegister,   fn: "register",   args: () => [`svc_og_${TS}`, "0G Inference", BigInt(1e15), "0G", "0g-mainnet", "https://tollgate.run", ""] },
      { label: "AgentBudget → setPolicy",             addr: "0xA8302734081F26b8a3E42f90DCf07b3E063441de", abi: ABI.setPolicy,     fn: "setPolicy",  args: () => [`agent-og-${TS}`, BigInt(1e16), BigInt(1e15)] },
      { label: "DeliveryVerifier → anchor",           addr: "0x8722BeBc218F89455E4E21D75C09B0D5bf1313C6", abi: ABI.anchor,        fn: "anchor",     args: () => [b32(`req-${TS}`), b32(`res-${TS}`), "0x"] },
    ],
  },
  {
    name: "0G Galileo testnet",
    rpc:  "https://evmrpc-testnet.0g.ai",
    explorer: "https://chainscan-galileo.0g.ai",
    contracts: [
      { label: "AgentIdentityRegistry → register",   addr: "0xBA4721Df33C3f32d8d35dEE21745cDC2B5b2Db81", abi: ABI.register,    fn: "register",  args: () => [`og-tnet-${TS}.tollgate.run`, DEPLOYER] },
      { label: "ServiceRegistry → register",          addr: "0x42a14858Da4B2f75DB5C581bA5579786A12d97b4", abi: ABI.svcRegister, fn: "register",  args: () => [`svc_og_tnet_${TS}`, "0G Testnet", BigInt(1e15), "0G", "0g-testnet", "https://tollgate.run", ""] },
      { label: "AgentReceiptRegistry → record",       addr: "0xAe3D4eEc2a49dcBeA1c39CB6987507fA2BF97142", abi: ABI.record,      fn: "record",    args: () => [b32(`receipt-${TS}`), b32(`payload-${TS}`)] },
    ],
  },
  {
    name: "Mantle mainnet",
    rpc:  "https://rpc.mantle.xyz",
    explorer: "https://explorer.mantle.xyz",
    contracts: [
      { label: "AgentIdentityRegistry → register",   addr: "0x4cA80A3af6e0a4E0c85AB31E3B4a86C6BffF17CB", abi: ABI.register,      fn: "register",       args: () => [`mantle-${TS}.tollgate.run`, DEPLOYER] },
      { label: "ServiceRegistry → register",          addr: "0x441fE2B53A85a38572C94688b2344a096ECe50cc", abi: ABI.svcRegister,   fn: "register",       args: () => [`svc_mnt_${TS}`, "Mantle Agent Svc", BigInt(1e15), "MNT", "mantle-mainnet", "https://tollgate.run", ""] },
      { label: "AgentBudgetController → setBudget",  addr: "0x54d203df5e5123d798581Dd61172F7E2a021A156", abi: ABI.setBudget,     fn: "setBudget",      args: () => [DEPLOYER, BigInt(2000), BigInt(200), true, ethers.ZeroHash] },
      { label: "AgentVault → deposit (0.0001 MNT)",  addr: "0xCbBcFc657787Fef2702ae6E35CA5a809a68480da", abi: ABI.deposit,       fn: "deposit",        args: () => [], opts: { value: BigInt(1e14) } },
      { label: "AgentVault → recordDecision",        addr: "0xCbBcFc657787Fef2702ae6E35CA5a809a68480da", abi: ABI.recordDecision, fn: "recordDecision", args: () => [b32(`decision-${TS}`), b32(`ctx-${TS}`)] },
      { label: "AgentCreditRegistry → setGateway",  addr: "0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9", abi: ABI.setGateway,    fn: "setGateway",     args: () => [DEPLOYER, true] },
      { label: "AgentCreditRegistry → recordPayment",addr: "0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9", abi: ABI.recordPayment, fn: "recordPayment",  args: () => [DEPLOYER, BigInt(1e14)] },
    ],
  },
  {
    name: "Mantle Sepolia testnet",
    rpc:  "https://rpc.sepolia.mantle.xyz",
    explorer: "https://explorer.sepolia.mantle.xyz",
    contracts: [
      { label: "AgentIdentityRegistry → register",   addr: "0xAe3D4eEc2a49dcBeA1c39CB6987507fA2BF97142", abi: ABI.register,    fn: "register",  args: () => [`mantle-sep-${TS}.tollgate.run`, DEPLOYER] },
      { label: "ServiceRegistry → register",          addr: "0x42a14858Da4B2f75DB5C581bA5579786A12d97b4", abi: ABI.svcRegister, fn: "register",  args: () => [`svc_msep_${TS}`, "Mantle Sepolia Svc", BigInt(1e15), "MNT", "mantle-sepolia", "https://tollgate.run", ""] },
    ],
  },
  {
    name: "Arbitrum Sepolia testnet",
    rpc:  "https://sepolia-rollup.arbitrum.io/rpc",
    explorer: "https://sepolia.arbiscan.io",
    contracts: [
      { label: "AgentEscrow → open (native ETH)",    addr: "0x990Fe8e3f7d59148593D9B174a70F2Cd79C7bBc7", abi: ABI.escrowOpen,  fn: "open",      args: () => [DEPLOYER, ethers.ZeroAddress, BigInt(1e14), BigInt(Math.floor(Date.now()/1000)+3600), b32(`ref-arb-${TS}`)], opts: { value: BigInt(1e14) } },
      { label: "ServiceRegistry → register",          addr: "0xA8FdDb9F6f54Fbf127cb8c71049cB1e19f5836F9", abi: ABI.svcRegister, fn: "register",  args: () => [`svc_arb_sep_${TS}`, "Arb Sepolia Svc", BigInt(1e15), "ETH", "arbitrum-sepolia", "https://tollgate.run", ""] },
      { label: "AgentBudget → setPolicy",             addr: "0x9dD4Df1dE852c8308A2d3Aa6bD8e2257Dd786A09", abi: ABI.setPolicy,  fn: "setPolicy", args: () => [`arb-agent-${TS}`, BigInt(1e16), BigInt(1e15)] },
      { label: "DeliveryVerifier → anchor",           addr: "0x0A905740007B6123faa5dA7045Bb18A62Da8B3F8", abi: ABI.anchor,     fn: "anchor",    args: () => [b32(`req-arb-${TS}`), b32(`res-arb-${TS}`), "0x"] },
    ],
  },
  {
    name: "Arbitrum One mainnet",
    rpc:  "https://arb1.arbitrum.io/rpc",
    explorer: "https://arbiscan.io",
    contracts: [
      { label: "ServiceRegistry → register",          addr: "0x8403F655Cb8750012D443c135840185691039236", abi: ABI.svcRegister, fn: "register",  args: () => [`svc_arb_main_${TS}`, "Arb One Svc", BigInt(1e15), "ETH", "arbitrum-one", "https://tollgate.run", ""] },
      { label: "AgentBudget → setPolicy",             addr: "0x68c17e2e69DD79651457D440B5f5DCE77B9ad732", abi: ABI.setPolicy,  fn: "setPolicy", args: () => [`arb-main-${TS}`, BigInt(1e16), BigInt(1e15)] },
    ],
  },
  {
    name: "QIE mainnet",
    rpc:  "https://rpc1mainnet.qie.digital/",
    explorer: "https://scan.qie.digital",
    contracts: [
      { label: "QieCheckout → createInvoice",         addr: "0xBa7348e57F124B1163c8356Cf7294fa6Dfb7Ea0E", abi: ABI.createInvoice, fn: "createInvoice", args: () => [DEPLOYER, BigInt(1e18)] },
      { label: "QieOracleFeed → updateFeed",           addr: "0x0551b255Cb74F004e872034a5a906ffaA7DD58Eb", abi: ABI.updateFeed,    fn: "updateFeed",    args: () => [b32("QIE/USD"), BigInt(100), BigInt(5e16)] },
      { label: "QieAgentCredit → updateScore",         addr: "0x83E980569D3db24dA0fd7B1B362255118756264A", abi: ABI.updateScore,   fn: "updateScore",   args: () => [DEPLOYER, BigInt(750)] },
    ],
  },
  {
    name: "QIE testnet",
    rpc:  "https://rpc1testnet.qie.digital/",
    explorer: "https://scan-testnet.qie.digital",
    contracts: [
      { label: "QieCheckout → createInvoice",         addr: "0x0551b255Cb74F004e872034a5a906ffaA7DD58Eb", abi: ABI.createInvoice, fn: "createInvoice", args: () => [DEPLOYER, BigInt(1e18)] },
      { label: "QieOracleFeed → updateFeed",           addr: "0xe54c65E750bD7cce5faadD48893F28acd50AA187", abi: ABI.updateFeed,    fn: "updateFeed",    args: () => [b32("QIE/USD"), BigInt(100), BigInt(5e16)] },
      { label: "QieAgentCredit → updateScore",         addr: "0xB697adbf0eB3850D9cA1072Fe3d1122639B7D314", abi: ABI.updateScore,   fn: "updateScore",   args: () => [DEPLOYER, BigInt(750)] },
    ],
  },
];

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Deployer: ${DEPLOYER}`);
  const results = [];

  for (const net of NETWORKS) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`🌐 ${net.name}`);
    const provider = new ethers.JsonRpcProvider(net.rpc);
    const signer   = new ethers.Wallet(PK, provider);
    const netResults = { network: net.name, explorer: net.explorer, txs: [] };

    for (const ct of net.contracts) {
      const contract = c(ct.addr, ct.abi, signer);
      const opts = ct.opts ?? {};
      const hash = await send(ct.label, contract, ct.fn, ct.args(), opts);
      if (hash) netResults.txs.push({ label: ct.label, hash, url: `${net.explorer}/tx/${hash}` });
    }
    results.push(netResults);
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log("EXPLORER LINKS");
  console.log("═".repeat(60));
  for (const nr of results) {
    if (!nr.txs.length) continue;
    console.log(`\n${nr.network}`);
    for (const t of nr.txs) {
      console.log(`  ${t.label}`);
      console.log(`  → ${t.url}`);
    }
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
