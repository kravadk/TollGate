import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AgentCreditRegistry from:", deployer.address);
  console.log("Network:", hre.network.name);

  const Factory = await hre.ethers.getContractFactory("AgentCreditRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("✅ AgentCreditRegistry deployed to:", address);
  console.log("Network:", hre.network.name);
  console.log("Explorer: check your chain's explorer for address:", address);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Set VITE_MANTLE_CREDIT_REGISTRY_ADDRESS=" + address + " in your .env");
  console.log("  2. Call recordPayment(agentAddress, amountWei) after each successful x402 payment");
  console.log("  3. Read creditScore(agentAddress) to get the agent's score (0–1000)");
}

main().catch((e) => { console.error(e); process.exit(1); });
