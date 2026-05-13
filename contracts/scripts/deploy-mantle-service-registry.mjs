/**
 * Deploy ServiceRegistry to Mantle mainnet (chainId 5000).
 *
 *   cd contracts
 *   node scripts/deploy-mantle-service-registry.mjs
 *
 * Requires:
 *   - MANTLE_PRIVATE_KEY in contracts/.env (funded with MNT for gas)
 *   - contracts compiled: npx hardhat compile
 *
 * After deploy, copy the printed address into:
 *   .env.local  →  VITE_MANTLE_SERVICE_REGISTRY_ADDRESS=0x…
 *   contracts/deployments/mantle.json  →  "serviceRegistry": "0x…"  (auto-updated)
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS  = path.join(__dirname, "../artifacts/contracts/ServiceRegistry.sol/ServiceRegistry.json");
const DEPLOYMENTS = path.join(__dirname, "../deployments/mantle.json");

const RPC         = process.env.MANTLE_RPC_URL ?? "https://rpc.mantle.xyz";
const PRIVATE_KEY = process.env.MANTLE_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("Set MANTLE_PRIVATE_KEY in contracts/.env");
  process.exit(1);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  const network  = await provider.getNetwork();

  console.log(`Network:  Mantle (chainId ${network.chainId})`);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance:  ${ethers.formatEther(await provider.getBalance(wallet.address))} MNT`);

  if (!fs.existsSync(ARTIFACTS)) {
    console.error("Artifact not found — run: npx hardhat compile");
    process.exit(1);
  }

  const { abi, bytecode } = JSON.parse(fs.readFileSync(ARTIFACTS, "utf8"));
  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);

  console.log("\nDeploying ServiceRegistry…");
  const contract = await factory.deploy();
  const tx = contract.deploymentTransaction();
  console.log(`Tx:  ${tx?.hash ?? "unknown"} — waiting…`);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`\n✅  ServiceRegistry: ${address}`);
  console.log(`    https://explorer.mantle.xyz/address/${address}`);
  console.log(`\nAdd to .env.local:\n    VITE_MANTLE_SERVICE_REGISTRY_ADDRESS=${address}`);

  if (fs.existsSync(DEPLOYMENTS)) {
    const d = JSON.parse(fs.readFileSync(DEPLOYMENTS, "utf8"));
    d.serviceRegistry        = address;
    d.serviceRegistryTxHash  = tx?.hash ?? null;
    fs.writeFileSync(DEPLOYMENTS, JSON.stringify(d, null, 2));
    console.log("Updated: contracts/deployments/mantle.json");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
