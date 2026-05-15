/* Deploy all TollGate contracts to a 0G network (mainnet or Galileo testnet).
 *
 *   cd contracts
 *   npm run deploy:0g-all          # 0G mainnet
 *   npm run deploy:0g-testnet-all  # Galileo testnet
 *
 * Set env vars to reuse already-deployed contracts (avoids re-deployment):
 *   OG_RECEIPT_REGISTRY_ADDRESS    — AgentReceiptRegistry
 *   OG_IDENTITY_REGISTRY_ADDRESS   — AgentIdentityRegistry
 *   OG_SERVICE_REGISTRY_ADDRESS    — ServiceRegistry
 *   OG_BUDGET_CONTROLLER_ADDRESS   — AgentBudgetController
 *   OG_DELIVERY_VERIFIER_ADDRESS   — DeliveryVerifier
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function deployOrReuse(Factory, envAddr, label) {
  const addr = envAddr && envAddr.trim();
  if (addr) {
    console.log(`${label}: reusing ${addr}`);
    return { address: addr, tx: null };
  }
  const contract = await Factory.deploy();
  const tx = contract.deploymentTransaction();
  console.log(`${label} deploy tx: ${tx ? tx.hash : "(unknown)"} — waiting…`);
  await contract.waitForDeployment();
  const deployed = await contract.getAddress();
  console.log(`  ✓ ${label}: ${deployed}`);
  return { address: deployed, tx };
}

async function main() {
  const net = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No signer — set OG_PRIVATE_KEY in contracts/.env");
  }
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  const isMainnet = net === "og";
  const explorerBase = (
    process.env.OG_EXPLORER_URL ||
    (isMainnet ? "https://chainscan.0g.ai" : "https://chainscan-galileo.0g.ai")
  ).replace(/\/+$/, "");

  console.log(`Network:  ${net}`);
  console.log(`Deployer: ${deployer.address}  (balance ${hre.ethers.formatEther(bal)} OG)`);
  console.log(`Explorer: ${explorerBase}`);
  console.log("");

  const AgentReceiptRegistry  = await hre.ethers.getContractFactory("AgentReceiptRegistry");
  const AgentIdentityRegistry = await hre.ethers.getContractFactory("AgentIdentityRegistry");
  const ServiceRegistry       = await hre.ethers.getContractFactory("ServiceRegistry");
  const AgentBudgetController = await hre.ethers.getContractFactory("AgentBudgetController");
  const DeliveryVerifier      = await hre.ethers.getContractFactory("DeliveryVerifier");

  const receipt  = await deployOrReuse(AgentReceiptRegistry,  process.env.OG_RECEIPT_REGISTRY_ADDRESS,  "AgentReceiptRegistry");
  const identity = await deployOrReuse(AgentIdentityRegistry, process.env.OG_IDENTITY_REGISTRY_ADDRESS, "AgentIdentityRegistry");
  const svcReg   = await deployOrReuse(ServiceRegistry,       process.env.OG_SERVICE_REGISTRY_ADDRESS,  "ServiceRegistry");
  const budget   = await deployOrReuse(AgentBudgetController, process.env.OG_BUDGET_CONTROLLER_ADDRESS, "AgentBudgetController");
  const verifier = await deployOrReuse(DeliveryVerifier,      process.env.OG_DELIVERY_VERIFIER_ADDRESS, "DeliveryVerifier");

  console.log("");
  console.log("✓ All contracts ready");
  console.log(`  AgentReceiptRegistry:  ${receipt.address}`);
  console.log(`    ${explorerBase}/address/${receipt.address}`);
  console.log(`  AgentIdentityRegistry: ${identity.address}`);
  console.log(`    ${explorerBase}/address/${identity.address}`);
  console.log(`  ServiceRegistry:       ${svcReg.address}`);
  console.log(`    ${explorerBase}/address/${svcReg.address}`);
  console.log(`  AgentBudgetController: ${budget.address}`);
  console.log(`    ${explorerBase}/address/${budget.address}`);
  console.log(`  DeliveryVerifier:      ${verifier.address}`);
  console.log(`    ${explorerBase}/address/${verifier.address}`);

  console.log("");
  console.log("Next: put these in the frontend .env.local —");
  if (isMainnet) {
    console.log(`  VITE_0G_REGISTRY_ADDRESS=${receipt.address}`);
    console.log(`  VITE_0G_RECEIPT_REGISTRY_ADDRESS=${receipt.address}`);
    console.log(`  VITE_0G_IDENTITY_REGISTRY_ADDRESS=${identity.address}`);
    console.log(`  VITE_0G_SERVICE_REGISTRY_MAINNET_ADDRESS=${svcReg.address}`);
    console.log(`  VITE_0G_AGENT_BUDGET_MAINNET_ADDRESS=${budget.address}`);
    console.log(`  VITE_0G_DELIVERY_VERIFIER_MAINNET_ADDRESS=${verifier.address}`);
  } else {
    console.log(`  VITE_0G_RECEIPT_REGISTRY_TESTNET_ADDRESS=${receipt.address}`);
    console.log(`  VITE_0G_IDENTITY_REGISTRY_TESTNET_ADDRESS=${identity.address}`);
    console.log(`  VITE_0G_SERVICE_REGISTRY_TESTNET_ADDRESS=${svcReg.address}`);
    console.log(`  VITE_0G_AGENT_BUDGET_TESTNET_ADDRESS=${budget.address}`);
    console.log(`  VITE_0G_DELIVERY_VERIFIER_TESTNET_ADDRESS=${verifier.address}`);
  }

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const record = {
    network: net,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    explorer: explorerBase,
    deployedAt: new Date().toISOString(),
    contracts: {
      AgentReceiptRegistry:  receipt.address,
      AgentIdentityRegistry: identity.address,
      ServiceRegistry:       svcReg.address,
      AgentBudgetController: budget.address,
      DeliveryVerifier:      verifier.address,
    },
  };
  fs.writeFileSync(path.join(outDir, `${net}.json`), JSON.stringify(record, null, 2) + "\n");
  console.log(`\nWrote contracts/deployments/${net}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
