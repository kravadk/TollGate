import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying AgentIntentSettler (ERC-7683) from:", deployer.address);
  console.log("Network:", hre.network.name);

  const Factory = await hre.ethers.getContractFactory("AgentIntentSettler");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("✅ AgentIntentSettler deployed to:", address);
  console.log("Network:", hre.network.name);
  console.log("");
  console.log("ERC-7683 ORDER_DATA_TYPE: keccak256('TollGateOrderData')");
  console.log("");
  console.log("Intent flow:");
  console.log("  1. Agent: USDC.approve(AgentIntentSettler, priceUsdcWei)");
  console.log("  2. Agent: AgentIntentSettler.open({fillDeadline, orderDataType, orderData})");
  console.log("  3. Solver fills x402 on destination chain");
  console.log("  4. Solver: AgentIntentSettler.fill(orderId, destinationReceiptHash)");
  console.log("  5. Solver claims USDC; agent gets service response");
  console.log("");
  console.log("Set VITE_AGENT_INTENT_SETTLER_ADDRESS=" + address);
}

main().catch((e) => { console.error(e); process.exit(1); });
