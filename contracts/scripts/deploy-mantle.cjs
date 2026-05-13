/* Deploy the Mantle pieces — AgentIdentityRegistry (ERC-8004 identity NFT) and
 * AgentVault (AI-callable surplus → mETH vault + on-chain decision log).
 *
 *   cd contracts
 *   cp .env.example .env          # set MANTLE_PRIVATE_KEY (a funded key); RPCs have defaults
 *   npm install
 *   npm run deploy:mantle         # Mantle mainnet (5000)   — or: npm run deploy:mantle-sepolia (5003)
 *
 * Prints both addresses + explorer links and writes contracts/deployments/<network>.json.
 * Copy the addresses into the frontend .env.local as VITE_MANTLE_IDENTITY_ADDRESS / VITE_MANTLE_VAULT_ADDRESS.
 */
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

// mETH on Mantle mainnet. On Mantle Sepolia / the demo build we use the zero address
// (the vault becomes intent + accounting only — no external swap).
const METH_MANTLE_MAINNET = "0xcDA86A272531e8640cD7F1a92c01839911B90bb0";

async function main() {
  const net = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No signer — set MANTLE_PRIVATE_KEY in contracts/.env (a funded key on this network).");
  }
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${net}`);
  console.log(`Deployer: ${deployer.address}  (balance ${hre.ethers.formatEther(bal)} MNT)`);

  const yieldToken =
    process.env.MANTLE_METH_ADDRESS ||
    (net === "mantle" ? METH_MANTLE_MAINNET : hre.ethers.ZeroAddress);
  console.log(`Vault yield token: ${yieldToken}${yieldToken === hre.ethers.ZeroAddress ? " (none — intent/accounting only)" : " (mETH)"}`);

  // Deploy the cheaper AgentVault first; then the (larger) ERC-721 identity registry.
  // If the identity deploy runs out of funds, we still record the vault and exit with a clear
  // message. Set MANTLE_VAULT_ADDRESS in .env to reuse an already-deployed vault (skips that step).
  let vaultAddress = process.env.MANTLE_VAULT_ADDRESS && process.env.MANTLE_VAULT_ADDRESS.trim();
  let vTx = null;
  if (vaultAddress) {
    console.log(`AgentVault: reusing existing ${vaultAddress} (MANTLE_VAULT_ADDRESS set)`);
  } else {
    const Vault = await hre.ethers.getContractFactory("AgentVault");
    const vault = await Vault.deploy(yieldToken);
    vTx = vault.deploymentTransaction();
    console.log(`AgentVault deploy tx: ${vTx ? vTx.hash : "(unknown)"} — waiting…`);
    await vault.waitForDeployment();
    vaultAddress = await vault.getAddress();
    console.log(`  ✓ AgentVault: ${vaultAddress}`);
  }

  let identityAddress = process.env.MANTLE_IDENTITY_ADDRESS && process.env.MANTLE_IDENTITY_ADDRESS.trim() || null;
  let idTx = null;
  if (identityAddress) {
    console.log(`AgentIdentityRegistry: reusing existing ${identityAddress} (MANTLE_IDENTITY_ADDRESS set)`);
  } else {
    try {
      const Identity = await hre.ethers.getContractFactory("AgentIdentityRegistry");
      const identity = await Identity.deploy();
      idTx = identity.deploymentTransaction();
      console.log(`AgentIdentityRegistry deploy tx: ${idTx ? idTx.hash : "(unknown)"} — waiting…`);
      await identity.waitForDeployment();
      identityAddress = await identity.getAddress();
      console.log(`  ✓ AgentIdentityRegistry: ${identityAddress}`);
    } catch (e) {
      console.warn(`  ⚠ AgentIdentityRegistry NOT deployed: ${(e && (e.shortMessage || e.message)) || e}`);
      console.warn("    Top up the deployer and re-run — set MANTLE_VAULT_ADDRESS in .env first so the vault isn't redeployed.");
    }
  }

  // ── AgentBudgetController ──────────────────────────────────────────────────
  let budgetControllerAddress = process.env.MANTLE_BUDGET_CONTROLLER_ADDRESS?.trim() || null;
  if (budgetControllerAddress) {
    console.log(`AgentBudgetController: reusing existing ${budgetControllerAddress}`);
  } else {
    try {
      const BudgetController = await hre.ethers.getContractFactory("AgentBudgetController");
      const budgetController = await BudgetController.deploy();
      await budgetController.waitForDeployment();
      budgetControllerAddress = await budgetController.getAddress();
      console.log(`  ✓ AgentBudgetController: ${budgetControllerAddress}`);
    } catch (e) {
      console.warn(`  ⚠ AgentBudgetController NOT deployed: ${(e && (e.shortMessage || e.message)) || e}`);
    }
  }

  // ── ServiceRegistry ────────────────────────────────────────────────────────
  let serviceRegistryAddress = process.env.MANTLE_SERVICE_REGISTRY_ADDRESS?.trim() || null;
  const treasury = process.env.MANTLE_TREASURY_ADDRESS?.trim() || deployer.address;
  if (serviceRegistryAddress) {
    console.log(`ServiceRegistry: reusing existing ${serviceRegistryAddress}`);
  } else {
    try {
      const ServiceRegistry = await hre.ethers.getContractFactory("ServiceRegistry");
      const serviceRegistry = await ServiceRegistry.deploy(treasury);
      await serviceRegistry.waitForDeployment();
      serviceRegistryAddress = await serviceRegistry.getAddress();
      console.log(`  ✓ ServiceRegistry: ${serviceRegistryAddress} (treasury: ${treasury})`);
    } catch (e) {
      console.warn(`  ⚠ ServiceRegistry NOT deployed: ${(e && (e.shortMessage || e.message)) || e}`);
    }
  }

  // ── AgentCreditRegistry ────────────────────────────────────────────────────
  let creditRegistryAddress = process.env.MANTLE_CREDIT_ADDRESS?.trim() || null;
  if (creditRegistryAddress) {
    console.log(`AgentCreditRegistry: reusing existing ${creditRegistryAddress}`);
  } else {
    try {
      const CreditRegistry = await hre.ethers.getContractFactory("AgentCreditRegistry");
      const creditRegistry = await CreditRegistry.deploy();
      await creditRegistry.waitForDeployment();
      creditRegistryAddress = await creditRegistry.getAddress();
      console.log(`  ✓ AgentCreditRegistry: ${creditRegistryAddress}`);
    } catch (e) {
      console.warn(`  ⚠ AgentCreditRegistry NOT deployed: ${(e && (e.shortMessage || e.message)) || e}`);
    }
  }

  // ── ReceiptNFT ─────────────────────────────────────────────────────────────
  let receiptNftAddress = process.env.MANTLE_RECEIPT_NFT_ADDRESS?.trim() || null;
  const gatewayMinter = process.env.MANTLE_GATEWAY_MINTER?.trim() || deployer.address;
  if (receiptNftAddress) {
    console.log(`ReceiptNFT: reusing existing ${receiptNftAddress}`);
  } else {
    try {
      const ReceiptNFT = await hre.ethers.getContractFactory("ReceiptNFT");
      const receiptNft = await ReceiptNFT.deploy(gatewayMinter);
      await receiptNft.waitForDeployment();
      receiptNftAddress = await receiptNft.getAddress();
      console.log(`  ✓ ReceiptNFT: ${receiptNftAddress} (gateway minter: ${gatewayMinter})`);
    } catch (e) {
      console.warn(`  ⚠ ReceiptNFT NOT deployed: ${(e && (e.shortMessage || e.message)) || e}`);
    }
  }

  const explorerBase = (
    process.env.MANTLE_EXPLORER_URL ||
    (net === "mantle" ? "https://explorer.mantle.xyz" : "https://explorer.sepolia.mantle.xyz")
  ).replace(/\/+$/, "");

  console.log("");
  console.log("✓ Deployed");
  if (identityAddress) {
    console.log(`  AgentIdentityRegistry: ${identityAddress}`);
    console.log(`    ${explorerBase}/address/${identityAddress}`);
  } else {
    console.log("  AgentIdentityRegistry: (not deployed — see warning above)");
  }
  console.log(`  AgentVault:            ${vaultAddress}`);
  console.log(`    ${explorerBase}/address/${vaultAddress}`);
  console.log("");
  console.log("Next: put these in the frontend .env.local —");
  if (identityAddress) console.log(`  VITE_MANTLE_IDENTITY_ADDRESS=${identityAddress}`);
  console.log(`  VITE_MANTLE_VAULT_ADDRESS=${vaultAddress}`);
  if (budgetControllerAddress) console.log(`  VITE_BUDGET_CONTROLLER=${budgetControllerAddress}`);
  if (serviceRegistryAddress) console.log(`  VITE_SERVICE_REGISTRY=${serviceRegistryAddress}`);
  if (creditRegistryAddress) console.log(`  VITE_MANTLE_CREDIT_ADDRESS=${creditRegistryAddress}`);
  console.log(`  VITE_MANTLE_CHAIN_ID=${net === "mantle" ? "0x1388" : "0x138b"}`);
  console.log(`  VITE_MANTLE_EXPLORER=${explorerBase}`);
  console.log("And in server/.env —");
  if (receiptNftAddress) console.log(`  RECEIPT_NFT_ADDRESS=${receiptNftAddress}`);
  console.log(`  MINTER_PRIVATE_KEY=<deployer or dedicated minter key>`);
  console.log(`  MANTLE_RPC_URL=https://rpc.mantle.xyz`);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const record = {
    network: net,
    identityRegistry: identityAddress,
    agentVault: vaultAddress,
    budgetController: budgetControllerAddress,
    serviceRegistry: serviceRegistryAddress,
    receiptNft: receiptNftAddress,
    creditRegistry: creditRegistryAddress,
    yieldToken,
    identityTxHash: idTx ? idTx.hash : null,
    vaultTxHash: vTx ? vTx.hash : null,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
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
