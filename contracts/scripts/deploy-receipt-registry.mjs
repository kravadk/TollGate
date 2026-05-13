import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AgentReceiptRegistry from:", deployer.address);
  console.log("Network:", hre.network.name);

  const Factory = await hre.ethers.getContractFactory("AgentReceiptRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("✅ AgentReceiptRegistry deployed to:", address);
  console.log("Network:", hre.network.name);
  console.log("Explorer: check your chain's explorer for address:", address);
}

main().catch((e) => { console.error(e); process.exit(1); });
