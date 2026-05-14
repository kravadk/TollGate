/**
 * deploy-qie-all.cjs
 * Deploys QieCheckout + QiePass + QieAgentCredit + QieOracleFeed
 * to both QIE testnet (1983) and QIE mainnet (1990).
 *
 * Usage:
 *   cd contracts
 *   node scripts/deploy-qie-all.cjs
 *
 * Reads QIE_PRIVATE_KEY from contracts/.env
 * Writes contracts/deployments/qieTestnet.json + qieMainnet.json
 * Prints new VITE_ vars to paste into .env.local
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const PK = process.env.QIE_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!PK) { console.error("Set QIE_PRIVATE_KEY in contracts/.env"); process.exit(1); }

const NETWORKS = [
  { name: "qieTestnet",  chainId: 1983, rpc: "https://rpc1testnet.qie.digital/", explorer: "https://scan-testnet.qie.digital" },
  { name: "qieMainnet",  chainId: 1990, rpc: "https://rpc1mainnet.qie.digital/",  explorer: "https://scan.qie.digital" },
];

function loadArtifact(name) {
  const candidates = [
    path.join(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const a = JSON.parse(fs.readFileSync(p, "utf8"));
      return { abi: a.abi, bytecode: a.bytecode };
    }
  }
  throw new Error(`Artifact not found for ${name}. Run: cd contracts && npx hardhat compile`);
}

async function deployContract(signer, name) {
  const { abi, bytecode } = loadArtifact(name);
  const factory  = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy();
  const tx       = contract.deploymentTransaction();
  console.log(`  ${name} tx: ${tx ? tx.hash : "?"} — waiting…`);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log(`  ✓ ${name}: ${addr}`);
  return { addr, txHash: tx ? tx.hash : null };
}

async function deployToNetwork(net) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🌐 ${net.name} (chainId ${net.chainId})`);
  const provider = new ethers.JsonRpcProvider(net.rpc);
  const signer   = new ethers.Wallet(PK, provider);
  const bal      = await provider.getBalance(signer.address);
  console.log(`   Deployer: ${signer.address}  balance: ${ethers.formatEther(bal)} QIE`);

  const checkout = await deployContract(signer, "QieCheckout");
  const pass     = await deployContract(signer, "QiePass");
  const credit   = await deployContract(signer, "QieAgentCredit");
  const oracle   = await deployContract(signer, "QieOracleFeed");

  const record = {
    network: net.name,
    chainId: net.chainId,
    deployer: signer.address,
    explorer: net.explorer,
    deployedAt: new Date().toISOString(),
    contracts: {
      QieCheckout:    checkout.addr,
      QiePass:        pass.addr,
      QieAgentCredit: credit.addr,
      QieOracleFeed:  oracle.addr,
    },
    txHashes: {
      QieCheckout:    checkout.txHash,
      QiePass:        pass.txHash,
      QieAgentCredit: credit.txHash,
      QieOracleFeed:  oracle.txHash,
    },
  };

  const outPath = path.join(__dirname, "..", "deployments", `${net.name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2) + "\n");
  console.log(`  ✓ Wrote deployments/${net.name}.json`);

  return record;
}

async function main() {
  const artifactDir = path.join(__dirname, "..", "artifacts", "contracts");
  if (!fs.existsSync(artifactDir)) {
    console.log("Artifacts missing — compiling…");
    const { execSync } = require("child_process");
    execSync("npx hardhat compile", { cwd: path.join(__dirname, ".."), stdio: "inherit" });
  }

  const results = [];
  for (const net of NETWORKS) {
    try {
      results.push(await deployToNetwork(net));
    } catch (e) {
      console.error(`\n❌ ${net.name} failed:`, (e.shortMessage ?? e.message ?? String(e)).slice(0, 200));
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("VITE_ VARS — paste into .env.local");
  console.log("═".repeat(60));
  for (const r of results) {
    const isMain = r.chainId === 1990;
    const prefix = isMain ? "" : "_TESTNET";
    console.log(`\n# ${r.network} (chainId ${r.chainId})`);
    console.log(`VITE_QIE${prefix}_CHECKOUT_ADDRESS=${r.contracts.QieCheckout}`);
    console.log(`VITE_QIE${prefix}_PASS_ADDRESS=${r.contracts.QiePass}`);
    console.log(`VITE_QIE${prefix}_AGENT_CREDIT_ADDRESS=${r.contracts.QieAgentCredit}`);
    console.log(`VITE_QIE${prefix}_ORACLE_FEED_ADDRESS=${r.contracts.QieOracleFeed}`);
    console.log(`\n# Explorer`);
    for (const [k, addr] of Object.entries(r.contracts)) {
      console.log(`  ${k}: ${r.explorer}/address/${addr}`);
    }
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
