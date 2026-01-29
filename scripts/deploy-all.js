import hre from "hardhat";
const { ethers } = hre;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("🚀 Deploying PawGuard contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  // 1. Deploy Identity Contracts First
  console.log("📋 Step 1: Deploying Identity Contracts...");
  console.log("=" .repeat(50));

  // Deploy VeterinarianCredential
  console.log("\n1.1 Deploying VeterinarianCredential...");
  const VeterinarianCredential = await ethers.getContractFactory("VeterinarianCredential");
  const veterinarianCredential = await VeterinarianCredential.deploy();
  await veterinarianCredential.deployed();
  console.log("✅ VeterinarianCredential deployed to:", veterinarianCredential.address);

  // Deploy PetIdentity
  console.log("\n1.2 Deploying PetIdentity...");
  const PetIdentity = await ethers.getContractFactory("PetIdentity");
  const petIdentity = await PetIdentity.deploy();
  await petIdentity.deployed();
  console.log("✅ PetIdentity deployed to:", petIdentity.address);

  // Deploy JuryIdentity
  console.log("\n1.3 Deploying JuryIdentity...");
  const JuryIdentity = await ethers.getContractFactory("JuryIdentity");
  const minimumStake = ethers.utils.parseEther("100"); // 100 PAW tokens minimum stake
  const juryIdentity = await JuryIdentity.deploy(minimumStake);
  await juryIdentity.deployed();
  console.log("✅ JuryIdentity deployed to:", juryIdentity.address);

  // 2. Deploy Core Contracts
  console.log("\n📋 Step 2: Deploying Core Contracts...");
  console.log("=" .repeat(50));

  // Deploy PetNFT with VeterinarianCredential address
  console.log("\n2.1 Deploying PetNFT...");
  const PetNFT = await ethers.getContractFactory("PetNFT");
  const petNFT = await PetNFT.deploy(veterinarianCredential.address);
  await petNFT.deployed();
  console.log("✅ PetNFT deployed to:", petNFT.address);

  // Deploy PawGuardToken ($PAW)
  console.log("\n2.2 Deploying PawGuardToken ($PAW)...");
  const PawGuardToken = await ethers.getContractFactory("PawGuardToken");
  const pawGuardToken = await PawGuardToken.deploy();
  await pawGuardToken.deployed();
  console.log("✅ PawGuardToken ($PAW) deployed to:", pawGuardToken.address);

  // Deploy GuardStableCoin ($GUARD)
  console.log("\n2.3 Deploying GuardStableCoin ($GUARD)...");
  const GuardStableCoin = await ethers.getContractFactory("GuardStableCoin");
  const guardStableCoin = await GuardStableCoin.deploy();
  await guardStableCoin.deployed();
  console.log("✅ GuardStableCoin ($GUARD) deployed to:", guardStableCoin.address);

  // Deploy PawPool with all required addresses
  console.log("\n2.4 Deploying PawPool...");
  const PawPool = await ethers.getContractFactory("PawPool");
  const pawPool = await PawPool.deploy(
    petNFT.address,
    pawGuardToken.address,
    guardStableCoin.address,
    veterinarianCredential.address,
    juryIdentity.address
  );
  await pawPool.deployed();
  console.log("✅ PawPool deployed to:", pawPool.address);

  // 3. Initial Setup
  console.log("\n📋 Step 3: Initial Setup...");
  console.log("=" .repeat(50));

  // Transfer PAW tokens to PawPool for rewards
  console.log("\n3.1 Transferring PAW tokens to PawPool for jury rewards...");
  const pawRewardAmount = ethers.utils.parseEther("100000"); // 100,000 PAW tokens
  await pawGuardToken.transfer(pawPool.address, pawRewardAmount);
  console.log("✅ Transferred 100,000 PAW tokens to PawPool");

  // Transfer GUARD tokens to deployer for testing
  console.log("\n3.2 Keeping GUARD tokens for testing...");
  const deployerGuardBalance = await guardStableCoin.balanceOf(deployer.address);
  console.log("✅ Deployer GUARD balance:", ethers.utils.formatEther(deployerGuardBalance), "$GUARD");

  // 4. Save deployment info
  console.log("\n📋 Step 4: Saving Deployment Info...");
  console.log("=" .repeat(50));

  const addresses = {
    VeterinarianCredential: veterinarianCredential.address,
    PetIdentity: petIdentity.address,
    JuryIdentity: juryIdentity.address,
    PetNFT: petNFT.address,
    PawGuardToken: pawGuardToken.address,
    GuardStableCoin: guardStableCoin.address,
    PawPool: pawPool.address,
    network: "localhost",
    chainId: 31337,
    deployer: deployer.address
  };

  saveFrontendFiles(addresses);
  saveDeploymentLog(addresses);

  // 5. Deployment Summary
  console.log("\n" + "=" .repeat(70));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(70));
  console.log("\n📝 Contract Addresses:\n");
  console.log("Identity Contracts:");
  console.log("  VeterinarianCredential:", veterinarianCredential.address);
  console.log("  PetIdentity:          ", petIdentity.address);
  console.log("  JuryIdentity:         ", juryIdentity.address);
  console.log("\nCore Contracts:");
  console.log("  PetNFT:               ", petNFT.address);
  console.log("  PawGuardToken ($PAW): ", pawGuardToken.address);
  console.log("  GuardStableCoin ($GUARD):", guardStableCoin.address);
  console.log("  PawPool:              ", pawPool.address);
  console.log("\n🌐 Network: localhost (Hardhat)");
  console.log("🔗 Chain ID: 31337");
  console.log("👤 Deployer:", deployer.address);
  console.log("\n" + "=" .repeat(70));

  console.log("\n✅ Next Steps:");
  console.log("1. Configure MetaMask:");
  console.log("   - Network: Localhost 8545");
  console.log("   - Chain ID: 31337");
  console.log("   - Import one of the test accounts using private key");
  console.log("\n2. Start the frontend:");
  console.log("   cd frontend && npm run dev");
  console.log("\n3. Access the app:");
  console.log("   http://localhost:3000");
  console.log("");
}

function saveFrontendFiles(addresses) {
  const contractsDir = path.join(__dirname, "../frontend/src/artifacts/contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save contract addresses
  fs.writeFileSync(
    path.join(contractsDir, "contract-addresses.json"),
    JSON.stringify(addresses, undefined, 2)
  );

  console.log("✅ Contract addresses saved to frontend/src/artifacts/contracts/contract-addresses.json");
}

function saveDeploymentLog(addresses) {
  const deploymentsDir = path.join(__dirname, "../deployments");

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const logFile = path.join(deploymentsDir, `localhost-${timestamp}.json`);

  fs.writeFileSync(
    logFile,
    JSON.stringify({
      ...addresses,
      timestamp: new Date().toISOString()
    }, undefined, 2)
  );

  console.log("✅ Deployment log saved to", logFile);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
