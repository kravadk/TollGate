/* Deploy the QIE pieces — QieCheckout (invoice/payment/split) and QiePass (tiered ERC-721).
 *
 *   cd contracts
 *   cp .env.example .env          # set QIE_PRIVATE_KEY (a funded key on QIE testnet)
 *   npm install
 *   npm run deploy:qie            # QIE testnet (chainId 1983)
 *
 * Prints both addresses + explorer links and writes contracts/deployments/qieTestnet.json.
 * Copy the addresses into the frontend .env.local as VITE_QIE_CHECKOUT_ADDRESS / VITE_QIE_PASS_ADDRESS.
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

const EXPLORER_BASE = "https://testnet.qie.digital";

async function main() {
  const net = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No signer — set QIE_PRIVATE_KEY in contracts/.env (a funded key on QIE testnet).");
  }
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${net}`);
  console.log(`Deployer: ${deployer.address}  (balance ${hre.ethers.formatEther(bal)} QIE)`);

  // ── QieCheckout ──────────────────────────────────────────────────────────────
  let checkoutAddress = process.env.QIE_CHECKOUT_ADDRESS && process.env.QIE_CHECKOUT_ADDRESS.trim();
  let checkoutTxHash = null;
  if (checkoutAddress) {
    console.log(`QieCheckout: reusing existing ${checkoutAddress} (QIE_CHECKOUT_ADDRESS set)`);
  } else {
    const Checkout = await hre.ethers.getContractFactory("QieCheckout");
    const checkout = await Checkout.deploy();
    const tx = checkout.deploymentTransaction();
    console.log(`QieCheckout deploy tx: ${tx ? tx.hash : "(unknown)"} — waiting…`);
    await checkout.waitForDeployment();
    checkoutAddress = await checkout.getAddress();
    checkoutTxHash = tx ? tx.hash : null;
    console.log(`  ✓ QieCheckout: ${checkoutAddress}`);
  }

  // ── QiePass ──────────────────────────────────────────────────────────────────
  let passAddress = process.env.QIE_PASS_ADDRESS && process.env.QIE_PASS_ADDRESS.trim();
  let passTxHash = null;
  if (passAddress) {
    console.log(`QiePass: reusing existing ${passAddress} (QIE_PASS_ADDRESS set)`);
  } else {
    try {
      const Pass = await hre.ethers.getContractFactory("QiePass");
      const pass = await Pass.deploy();
      const tx = pass.deploymentTransaction();
      console.log(`QiePass deploy tx: ${tx ? tx.hash : "(unknown)"} — waiting…`);
      await pass.waitForDeployment();
      passAddress = await pass.getAddress();
      passTxHash = tx ? tx.hash : null;
      console.log(`  ✓ QiePass: ${passAddress}`);
    } catch (e) {
      console.warn(`  ⚠ QiePass NOT deployed: ${(e && (e.shortMessage || e.message)) || e}`);
      console.warn("    Top up the deployer and re-run — set QIE_CHECKOUT_ADDRESS in .env first so checkout isn't redeployed.");
    }
  }

  const explorerBase = EXPLORER_BASE.replace(/\/+$/, "");

  console.log("");
  console.log("✓ Deployed");
  console.log(`  QieCheckout: ${checkoutAddress}`);
  console.log(`    ${explorerBase}/address/${checkoutAddress}`);
  if (passAddress) {
    console.log(`  QiePass:     ${passAddress}`);
    console.log(`    ${explorerBase}/address/${passAddress}`);
  } else {
    console.log("  QiePass: (not deployed — see warning above)");
  }
  console.log("");
  console.log("Next: put these in the frontend .env.local —");
  console.log(`  VITE_QIE_CHECKOUT_ADDRESS=${checkoutAddress}`);
  if (passAddress) console.log(`  VITE_QIE_PASS_ADDRESS=${passAddress}`);
  console.log(`  VITE_QIE_CHAIN_ID=0x7bf`);
  console.log(`  VITE_QIE_EXPLORER=${explorerBase}`);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const chainId = Number((await hre.ethers.provider.getNetwork()).chainId);
  const record = {
    network: net,
    checkout: checkoutAddress,
    pass: passAddress || null,
    checkoutTxHash,
    passTxHash,
    chainId,
    deployer: deployer.address,
    explorer: explorerBase,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, `${net}.json`), JSON.stringify(record, null, 2) + "\n");
  console.log(`\nWrote contracts/deployments/${net}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
