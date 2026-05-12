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
  console.log(`  VITE_MANTLE_CHAIN_ID=${net === "mantle" ? "0x1388" : "0x138b"}`);
  console.log(`  VITE_MANTLE_EXPLORER=${explorerBase}`);

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const record = {
    network: net,
    identityRegistry: identityAddress,
    agentVault: vaultAddress,
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
