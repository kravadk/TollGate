import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AgentIdentityRegistry from:", deployer.address);
  console.log("Network:", hre.network.name);

  // AgentIdentityRegistry constructor: ERC721("AgentPay Router Agent Identity", "APRAID")
  // No external constructor args — name/symbol are hardcoded in the contract.
  const Factory = await hre.ethers.getContractFactory("AgentIdentityRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("✅ AgentIdentityRegistry deployed to:", address);
  console.log("Network:", hre.network.name);
  console.log("Explorer: check your chain's explorer for address:", address);
}

main().catch((e) => { console.error(e); process.exit(1); });
