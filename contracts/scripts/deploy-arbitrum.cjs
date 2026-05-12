/* Deploy AgentEscrow to an Arbitrum chain (Sepolia / One / an Orbit chain like Robinhood Chain).
 *
 *   cd contracts
 *   cp .env.example .env          # set ARBITRUM_PRIVATE_KEY (a funded key); RPCs have defaults
 *   npm install
 *   npm run deploy:arb            # Arbitrum Sepolia (421614)   — recommended first
 *   # or: npm run deploy:arb-one  # Arbitrum One (42161)
 *   # or: npm run deploy:orbit    # set ORBIT_RPC_URL / ORBIT_CHAIN_ID / ORBIT_EXPLORER_URL first
 *
 * Prints the address + explorer link and writes contracts/deployments/<network>.json.
 * Copy the address into the frontend .env.local as VITE_ARBITRUM_ESCROW_ADDRESS.
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function explorerFor(net) {
  if (process.env.ORBIT_EXPLORER_URL && net === "orbit") return process.env.ORBIT_EXPLORER_URL.replace(/\/+$/, "");
  if (net === "arbitrumOne") return "https://arbiscan.io";
  if (net === "arbitrumSepolia") return "https://sepolia.arbiscan.io";
  return ""; // unknown Orbit chain → no explorer base
}

function chainHexHint(net, chainId) {
  if (net === "arbitrumOne") return "0xa4b1";
  if (net === "arbitrumSepolia") return "0x66eee";
  return "0x" + Number(chainId).toString(16);
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
  console.log(`  VITE_ARBITRUM_ESCROW_ADDRESS=${address}`);
  console.log(`  VITE_ARBITRUM_CHAIN_ID=${chainHexHint(net, chainId)}`);
  if (explorerBase) console.log(`  VITE_ARBITRUM_EXPLORER=${explorerBase}`);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const record = {
    network: net,
    contract: "AgentEscrow",
    address,
    txHash: tx ? tx.hash : null,
    chainId,
    deployer: deployer.address,
    explorer: explorerBase || null,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, `${net}.json`), JSON.stringify(record, null, 2) + "\n");
  console.log(`\nWrote contracts/deployments/${net}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
