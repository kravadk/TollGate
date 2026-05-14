/* Deploy AgentIdentityRegistry + ServiceRegistry to Mantle Sepolia testnet (chainId 5003).
 *
 *   cd contracts
 *   npx hardhat run scripts/deploy-mantle-sepolia.cjs --network mantleSepolia
 *
 * Requires MANTLE_PRIVATE_KEY in contracts/.env (funded with testnet MNT).
 * After deploy, add to .env.local:
 *   VITE_MANTLE_TESTNET_IDENTITY_ADDRESS=<identityRegistry>
 *   VITE_MANTLE_TESTNET_SERVICE_REGISTRY_ADDRESS=<serviceRegistry>
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const net = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("No signer — set MANTLE_PRIVATE_KEY in contracts/.env");
  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${net} (chainId ${chainId})`);
  console.log(`Deployer: ${deployer.address}  (balance ${hre.ethers.formatEther(bal)} MNT)`);

  // 1 — AgentIdentityRegistry
  console.log("\nDeploying AgentIdentityRegistry…");
  const Identity = await hre.ethers.getContractFactory("AgentIdentityRegistry");
  const identity = await Identity.deploy();
  await identity.waitForDeployment();
  const identityAddr = await identity.getAddress();
  const identityTx = identity.deploymentTransaction()?.hash ?? null;
  console.log(`✅  AgentIdentityRegistry: ${identityAddr}`);
  console.log(`    tx: ${identityTx}`);

  // 2 — ServiceRegistry
  console.log("\nDeploying ServiceRegistry…");
  const Registry = await hre.ethers.getContractFactory("ServiceRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  const registryTx = registry.deploymentTransaction()?.hash ?? null;
  console.log(`✅  ServiceRegistry: ${registryAddr}`);
  console.log(`    tx: ${registryTx}`);

  console.log("\n=== Add to .env.local ===");
  console.log(`VITE_MANTLE_TESTNET_IDENTITY_ADDRESS=${identityAddr}`);
  console.log(`VITE_MANTLE_TESTNET_SERVICE_REGISTRY_ADDRESS=${registryAddr}`);

  // Update mantleSepolia.json
  const outPath = path.join(__dirname, "..", "deployments", "mantleSepolia.json");
  const d = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};
  d.identityRegistry = identityAddr;
  d.identityTxHash = identityTx;
  d.serviceRegistry = registryAddr;
  d.serviceRegistryTxHash = registryTx;
  d.updatedAt = new Date().toISOString();
  fs.writeFileSync(outPath, JSON.stringify(d, null, 2) + "\n");
  console.log("\nUpdated: contracts/deployments/mantleSepolia.json");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
