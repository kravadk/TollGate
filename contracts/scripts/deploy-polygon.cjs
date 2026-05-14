/* Deploy AgentEscrow to a Polygon zkEVM network (mainnet or Cardona testnet).
 *
 *   cd contracts
 *   npm run deploy:polygon         # Polygon zkEVM mainnet (1101)
 *   npm run deploy:polygon-cardona # Polygon Cardona testnet (2442)
 *
 * Requires ARBITRUM_PRIVATE_KEY in contracts/.env — same key used for all EVM chains.
 * Fund the deployer on Polygon zkEVM: bridge ETH via https://portal.polygon.technology/
 * Fund the deployer on Cardona testnet: https://faucet.polygon.technology/
 *
 * Prints the address + explorer link and writes contracts/deployments/<network>.json.
 * Copy into .env.local as VITE_POLYGON_MAINNET_ESCROW_ADDRESS or VITE_POLYGON_TESTNET_ESCROW_ADDRESS.
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function explorerFor(net) {
  if (net === "polygonMainnet") return "https://zkevm.polygonscan.com";
  if (net === "polygonCardona") return "https://cardona-zkevm.polygonscan.com";
  return "";
}

function chainHexHint(net) {
  if (net === "polygonMainnet") return "0x44d";
  if (net === "polygonCardona") return "0x985";
  return "";
}

function envVarHint(net) {
  if (net === "polygonMainnet") return "VITE_POLYGON_MAINNET_ESCROW_ADDRESS";
  if (net === "polygonCardona") return "VITE_POLYGON_TESTNET_ESCROW_ADDRESS";
  return "VITE_POLYGON_ESCROW_ADDRESS";
}

async function main() {
  const net = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No signer — set ARBITRUM_PRIVATE_KEY in contracts/.env (a funded key on this network).");
  }
  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${net} (chainId ${chainId})`);
  console.log(`Deployer: ${deployer.address}  (balance ${hre.ethers.formatEther(bal)} ETH)`);

  const Escrow = await hre.ethers.getContractFactory("AgentEscrow");
  const escrow = await Escrow.deploy();
  const tx = escrow.deploymentTransaction();
  console.log(`AgentEscrow deploy tx: ${tx ? tx.hash : "(unknown)"} — waiting…`);
  await escrow.waitForDeployment();
  const address = await escrow.getAddress();

  const explorerBase = explorerFor(net);
  console.log("");
  console.log("✓ AgentEscrow deployed");
  console.log(`  address:  ${address}`);
  if (explorerBase) {
    console.log(`  explorer: ${explorerBase}/address/${address}`);
    if (tx) console.log(`  tx:       ${explorerBase}/tx/${tx.hash}`);
  }
  console.log("");
  console.log("Next: put this in the frontend .env.local —");
  console.log(`  ${envVarHint(net)}=${address}`);
  if (chainHexHint(net)) console.log(`  VITE_POLYGON_CHAIN_ID=${chainHexHint(net)}`);
  if (explorerBase) console.log(`  VITE_POLYGON_EXPLORER=${explorerBase}`);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const record = {
    network: net,
    contract: "AgentEscrow",
    address,
    txHash: tx ? tx.hash : null,
    chainId,
    deployer: deployer.address,
    explorer: explorerBase ? `${explorerBase}/address/${address}` : null,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, `${net}.json`), JSON.stringify(record, null, 2) + "\n");
  console.log(`\nWrote contracts/deployments/${net}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
