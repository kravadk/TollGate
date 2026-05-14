// Deploy all QIE contracts to QIE testnet (Chain ID 1983) or mainnet (5656).
// Usage:
//   npx hardhat run contracts/scripts/deploy-qie.mjs --network qieTestnet
//   npx hardhat run contracts/scripts/deploy-qie.mjs --network qieMainnet
//
// After running, copy the printed addresses to .env.local / Vercel env:
//   VITE_QIE_CHECKOUT_ADDRESS=0x...
//   VITE_QIE_PASS_ADDRESS=0x...
//   VITE_QIE_AGENT_CREDIT_ADDRESS=0x...
//   VITE_QIE_ORACLE_FEED_ADDRESS=0x...

import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log(`\n🚀 Deploying QIE contracts`);
  console.log(`   Network : ${network} (chainId ${chainId})`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} QIE\n`);

  const Checkout = await ethers.getContractFactory("QieCheckout");
  const checkout = await Checkout.deploy();
  await checkout.waitForDeployment();
  const checkoutAddr = await checkout.getAddress();
  console.log(`✅ QieCheckout       : ${checkoutAddr}`);

  const Pass = await ethers.getContractFactory("QiePass");
  const pass = await Pass.deploy();
  await pass.waitForDeployment();
  const passAddr = await pass.getAddress();
  console.log(`✅ QiePass           : ${passAddr}`);

  const Credit = await ethers.getContractFactory("QieAgentCredit");
  const credit = await Credit.deploy();
  await credit.waitForDeployment();
  const creditAddr = await credit.getAddress();
  console.log(`✅ QieAgentCredit    : ${creditAddr}`);

  const Oracle = await ethers.getContractFactory("QieOracleFeed");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log(`✅ QieOracleFeed     : ${oracleAddr}`);

  const explorer = chainId === 1983n
    ? "https://testnet.qie.digital"
    : chainId === 1990n
      ? "https://mainnet.qie.digital"
      : "https://mainnet.qiblockchain.online";

  console.log(`\n📋 Copy to .env.local / Vercel:`);
  console.log(`VITE_QIE_CHECKOUT_ADDRESS=${checkoutAddr}`);
  console.log(`VITE_QIE_PASS_ADDRESS=${passAddr}`);
  console.log(`VITE_QIE_AGENT_CREDIT_ADDRESS=${creditAddr}`);
  console.log(`VITE_QIE_ORACLE_FEED_ADDRESS=${oracleAddr}`);
  console.log(`\n🔍 Explorer links:`);
  console.log(`  ${explorer}/address/${checkoutAddr}`);
  console.log(`  ${explorer}/address/${passAddr}`);
  console.log(`  ${explorer}/address/${creditAddr}`);
  console.log(`  ${explorer}/address/${oracleAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
