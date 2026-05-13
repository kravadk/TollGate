/* Deploy ArcMind contracts to Arc L1 testnet (chainId 5042002).
 *
 * Setup:
 *   1. Get Arc testnet RPC key: arc login && arc rpc eth_chainId
 *   2. Add to contracts/.env:
 *        ARC_RPC_URL=https://rpc.testnet.arc-node.thecanteenapp.com/v1/<your-key>
 *        ARC_PRIVATE_KEY=0x<funded-key>
 *        ARC_USDC_ADDRESS=<USDC on Arc testnet>
 *   3. cd contracts && npm run deploy:arc
 *
 * Writes contracts/deployments/arcTestnet.json — copy addresses into .env.local.
 */
const fs   = require("fs");
const path = require("path");
const hre  = require("hardhat");

const ARC_TESTNET_USDC = process.env.ARC_USDC_ADDRESS || "0x0000000000000000000000000000000000000000";

async function main() {
  const net = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No signer — set ARC_PRIVATE_KEY in contracts/.env.\n" +
      "Get testnet USDC from: https://testnet.arcscan.app/faucet"
    );
  }

  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${net} (chainId 5042002)`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${hre.ethers.formatUnits(bal, 6)} USDC`);

  const usdc     = ARC_TESTNET_USDC;
  const explorer = (process.env.ARC_EXPLORER_URL || "https://testnet.arcscan.app").replace(/\/+$/, "");

  // ── ArcMindRegistry (ERC-8004) ────────────────────────────────────────────

  let registryAddress = process.env.ARC_REGISTRY_ADDRESS?.trim() || null;
  let regTx = null;

  if (registryAddress) {
    console.log(`ArcMindRegistry: reusing existing ${registryAddress}`);
  } else {
    try {
      const Registry = await hre.ethers.getContractFactory("ArcMindRegistry");
      const registry = await Registry.deploy();
      regTx = registry.deploymentTransaction();
      console.log(`ArcMindRegistry deploy tx: ${regTx?.hash ?? "(unknown)"} — waiting…`);
      await registry.waitForDeployment();
      registryAddress = await registry.getAddress();
      console.log(`  ✓ ArcMindRegistry: ${registryAddress}`);
    } catch (e) {
      console.warn(`  ⚠ ArcMindRegistry NOT deployed: ${e?.shortMessage ?? e?.message ?? e}`);
    }
  }

  // ── CopyTradeEscrow (ERC-8183) ─────────────────────────────────────────────
  // Kill threshold 15% (1500 bps), performance fee 5% (500 bps)

  let escrowAddress = process.env.ARC_ESCROW_ADDRESS?.trim() || null;
  let escrowTx = null;

  if (escrowAddress) {
    console.log(`CopyTradeEscrow: reusing existing ${escrowAddress}`);
  } else {
    try {
      const Escrow = await hre.ethers.getContractFactory("CopyTradeEscrow");
      const escrow = await Escrow.deploy(usdc, 1500, 500);
      escrowTx = escrow.deploymentTransaction();
      console.log(`CopyTradeEscrow deploy tx: ${escrowTx?.hash ?? "(unknown)"} — waiting…`);
      await escrow.waitForDeployment();
      escrowAddress = await escrow.getAddress();
      console.log(`  ✓ CopyTradeEscrow: ${escrowAddress}`);
    } catch (e) {
      console.warn(`  ⚠ CopyTradeEscrow NOT deployed: ${e?.shortMessage ?? e?.message ?? e}`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log("");
  console.log("✓ ArcMind contracts deployed");
  if (registryAddress) {
    console.log(`  ArcMindRegistry:  ${registryAddress}`);
    console.log(`    ${explorer}/address/${registryAddress}`);
  }
  if (escrowAddress) {
    console.log(`  CopyTradeEscrow:  ${escrowAddress}`);
    console.log(`    ${explorer}/address/${escrowAddress}`);
  }

  console.log("\nNext: add to frontend .env.local —");
  if (registryAddress) console.log(`  VITE_ARC_REGISTRY_ADDRESS=${registryAddress}`);
  if (escrowAddress)   console.log(`  VITE_ARC_ESCROW_ADDRESS=${escrowAddress}`);
  console.log(`  VITE_ARC_CHAIN_ID=5042002`);
  console.log(`  VITE_ARC_EXPLORER=${explorer}`);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${net}.json`),
    JSON.stringify({
      network:      net,
      chainId:      5042002,
      deployer:     deployer.address,
      registry:     registryAddress,
      escrow:       escrowAddress,
      usdc,
      explorer,
      deployedAt:   new Date().toISOString(),
      regTxHash:    regTx?.hash ?? null,
      escrowTxHash: escrowTx?.hash ?? null,
    }, null, 2) + "\n"
  );
  console.log(`\nWrote contracts/deployments/${net}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
