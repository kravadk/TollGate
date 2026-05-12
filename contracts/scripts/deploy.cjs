/* Deploy AgentReceiptRegistry to a 0G network.
 *
 *   cd contracts
 *   cp .env.example .env        # fill OG_RPC_URL + OG_PRIVATE_KEY
 *   npm install
 *   npm run deploy:0g           # mainnet  (or: npm run deploy:0g-testnet)
 *
 * Prints the address + explorer link and writes contracts/deployments/<network>.json.
 * Copy the address into the frontend's .env.local as VITE_0G_REGISTRY_ADDRESS.
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const net = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No signer — set OG_PRIVATE_KEY in contracts/.env (a funded key on this network).");
  }
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${net}`);
  console.log(`Deployer: ${deployer.address}  (balance ${hre.ethers.formatEther(bal)} native)`);

  const Factory = await hre.ethers.getContractFactory("AgentReceiptRegistry");
  const registry = await Factory.deploy();
  const tx = registry.deploymentTransaction();
  console.log(`Deploy tx: ${tx ? tx.hash : "(unknown)"} — waiting for confirmation…`);
  await registry.waitForDeployment();
  const address = await registry.getAddress();

  const explorerBase = (process.env.OG_EXPLORER_URL || "https://chainscan-galileo.0g.ai").replace(/\/+$/, "");
  console.log("");
  console.log("✓ AgentReceiptRegistry deployed");
  console.log(`  address:  ${address}`);
  console.log(`  explorer: ${explorerBase}/address/${address}`);
  if (tx) console.log(`  tx:       ${explorerBase}/tx/${tx.hash}`);
  console.log("");
  console.log("Next: put this in the frontend .env.local —");
  console.log(`  VITE_0G_REGISTRY_ADDRESS=${address}`);
  console.log(`  VITE_0G_EXPLORER=${explorerBase}`);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const record = {
    network: net,
    address,
    txHash: tx ? tx.hash : null,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    explorer: `${explorerBase}/address/${address}`,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, `${net}.json`), JSON.stringify(record, null, 2) + "\n");
  console.log(`\nWrote contracts/deployments/${net}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
