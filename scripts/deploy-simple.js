import hre from "hardhat";
const { ethers } = hre;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n🚀 Deploying PawGuard to Localhost");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // Deploy tokens first
  console.log("1️⃣  Deploying Tokens...");
  const PawGuardToken = await ethers.getContractFactory("PawGuardToken");
  const pawGuardToken = await PawGuardToken.deploy();
  await pawGuardToken.deployed();
  console.log("✅ PawGuardToken ($PAW):", pawGuardToken.address);

  const GuardStableCoin = await ethers.getContractFactory("GuardStableCoin");
  const guardStableCoin = await GuardStableCoin.deploy();
  await guardStableCoin.deployed();
  console.log("✅ GuardStableCoin ($GUARD):", guardStableCoin.address);

  // Deploy identity contracts
  console.log("\n2️⃣  Deploying Identity Contracts...");
  const VeterinarianCredential = await ethers.getContractFactory("VeterinarianCredential");
  const veterinarianCredential = await VeterinarianCredential.deploy();
  await veterinarianCredential.deployed();
  console.log("✅ VeterinarianCredential:", veterinarianCredential.address);

  const JuryIdentity = await ethers.getContractFactory("JuryIdentity");
  const minimumStake = ethers.utils.parseEther("100"); // 100 PAW tokens minimum stake
  const juryIdentity = await JuryIdentity.deploy(minimumStake);
  await juryIdentity.deployed();
  console.log("✅ JuryIdentity:", juryIdentity.address);

  const PetIdentity = await ethers.getContractFactory("PetIdentity");
  const petIdentity = await PetIdentity.deploy();
  await petIdentity.deployed();
  console.log("✅ PetIdentity:", petIdentity.address);

  // Deploy core contracts
  console.log("\n3️⃣  Deploying Core Contracts...");
  const PetNFT = await ethers.getContractFactory("PetNFT");
  const petNFT = await PetNFT.deploy(veterinarianCredential.address);
  await petNFT.deployed();
  console.log("✅ PetNFT:", petNFT.address);

  const PawPool = await ethers.getContractFactory("PawPool");
  const pawPool = await PawPool.deploy(
    petNFT.address,
    pawGuardToken.address,
    guardStableCoin.address,
    veterinarianCredential.address,
    juryIdentity.address
  );
  await pawPool.deployed();
  console.log("✅ PawPool:", pawPool.address);

  // Initial setup
  console.log("\n4️⃣  Initial Setup...");
  const pawRewardAmount = ethers.utils.parseEther("100000");
  await pawGuardToken.transfer(pawPool.address, pawRewardAmount);
  console.log("✅ Transferred 100,000 $PAW to PawPool for rewards");

  // Save addresses
  const addresses = {
    PetNFT: petNFT.address,
    PawGuardToken: pawGuardToken.address,
    GuardStableCoin: guardStableCoin.address,
    PawPool: pawPool.address,
    VeterinarianCredential: veterinarianCredential.address,
    PetIdentity: petIdentity.address,
    JuryIdentity: juryIdentity.address,
  };

  const contractsDir = path.join(__dirname, "../frontend/src/artifacts/contracts");
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-addresses.json"),
    JSON.stringify(addresses, undefined, 2)
  );
  console.log("✅ Contract addresses saved to frontend");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:\n");
  Object.entries(addresses).forEach(([name, address]) => {
    console.log(`  ${name.padEnd(25)} ${address}`);
  });
  console.log("\n" + "=".repeat(60));
  console.log("\n✅ Next Steps:");
  console.log("  1. Start frontend: cd frontend && npm run dev");
  console.log("  2. Open browser: http://localhost:3000");
  console.log("  3. Connect MetaMask to Hardhat Local (Chain ID: 31337)");
  console.log("  4. Import test account with this private key:");
  console.log("     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
