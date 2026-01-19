import hre from "hardhat";
const { ethers } = hre;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log("\n" + "=".repeat(60));
  console.log("🚀 PawGuard Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Network: ${network}`);
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await deployer.getBalance();
  console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH\n`);

  const contractAddresses = {};

  try {
    // Deploy VeterinarianCredential first (PetNFT depends on it)
    console.log("📝 Deploying VeterinarianCredential...");
    const VeterinarianCredential = await ethers.getContractFactory("VeterinarianCredential");
    const vetCredential = await VeterinarianCredential.deploy();
    await vetCredential.deployed();
    contractAddresses.VeterinarianCredential = vetCredential.address;
    console.log("✅ VeterinarianCredential deployed to:", vetCredential.address);

    // Deploy PetNFT (requires vetCredential address)
    console.log("\n📝 Deploying PetNFT...");
    const PetNFT = await ethers.getContractFactory("PetNFT");
    const petNFT = await PetNFT.deploy(vetCredential.address);
    await petNFT.deployed();
    contractAddresses.PetNFT = petNFT.address;
    console.log("✅ PetNFT deployed to:", petNFT.address);

    // Deploy PawGuardToken ($PAW)
    console.log("\n📝 Deploying PawGuardToken ($PAW)...");
    const PawGuardToken = await ethers.getContractFactory("PawGuardToken");
    const pawGuardToken = await PawGuardToken.deploy();
    await pawGuardToken.deployed();
    contractAddresses.PawGuardToken = pawGuardToken.address;
    console.log("✅ PawGuardToken ($PAW) deployed to:", pawGuardToken.address);

    // Deploy GuardStableCoin ($GUARD)
    console.log("\n📝 Deploying GuardStableCoin ($GUARD)...");
    const GuardStableCoin = await ethers.getContractFactory("GuardStableCoin");
    const guardStableCoin = await GuardStableCoin.deploy();
    await guardStableCoin.deployed();
    contractAddresses.GuardStableCoin = guardStableCoin.address;
    console.log("✅ GuardStableCoin ($GUARD) deployed to:", guardStableCoin.address);

    // Deploy JuryIdentity (needs to be before PawPool)
    console.log("\n📝 Deploying JuryIdentity...");
    const minimumStake = ethers.utils.parseEther("100"); // 100 PAW minimum stake
    const JuryIdentity = await ethers.getContractFactory("JuryIdentity");
    const juryIdentity = await JuryIdentity.deploy(minimumStake);
    await juryIdentity.deployed();
    contractAddresses.JuryIdentity = juryIdentity.address;
    console.log("✅ JuryIdentity deployed to:", juryIdentity.address);

    // Deploy PawPool (depends on PetNFT, PawGuardToken, GuardStableCoin, VeterinarianCredential, JuryIdentity)
    console.log("\n📝 Deploying PawPool...");
    const PawPool = await ethers.getContractFactory("PawPool");
    const pawPool = await PawPool.deploy(
      petNFT.address,
      pawGuardToken.address,
      guardStableCoin.address,
      vetCredential.address,
      juryIdentity.address
    );
    await pawPool.deployed();
    contractAddresses.PawPool = pawPool.address;
    console.log("✅ PawPool deployed to:", pawPool.address);

    // Deploy PetIdentity
    console.log("\n📝 Deploying PetIdentity...");
    const PetIdentity = await ethers.getContractFactory("PetIdentity");
    const petIdentity = await PetIdentity.deploy();
    await petIdentity.deployed();
    contractAddresses.PetIdentity = petIdentity.address;
    console.log("✅ PetIdentity deployed to:", petIdentity.address);

    // Transfer tokens for rewards (only if not on mainnet)
    if (network !== "base-mainnet") {
      console.log("\n💰 Setting up reward tokens for development...");
      const pawRewardAmount = ethers.utils.parseEther("100000"); // 100,000 PAW tokens
      await pawGuardToken.transfer(pawPool.address, pawRewardAmount);
      console.log("✅ Transferred 100,000 PAW tokens to PawPool for rewards");
    }

    // Save contract addresses and ABIs to frontend
    console.log("\n💾 Saving deployment info to frontend...");
    saveFrontendFiles(contractAddresses);

    // Display summary
    console.log("\n" + "=".repeat(60));
    console.log("✨ Deployment Summary");
    console.log("=".repeat(60));
    console.log("Network:", network);
    console.log("\nContract Addresses:");
    Object.entries(contractAddresses).forEach(([name, address]) => {
      console.log(`  ${name.padEnd(25)} ${address}`);
    });
    console.log("=".repeat(60));

    // Save to .env.deployed for reference
    saveDeploymentEnv(network, contractAddresses);

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

function saveFrontendFiles(contractAddresses) {
  const contractsDir = path.join(__dirname, "../frontend/src/artifacts/contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save contract addresses
  fs.writeFileSync(
    path.join(contractsDir, "contract-addresses.json"),
    JSON.stringify(contractAddresses, undefined, 2)
  );

  console.log("✅ Contract addresses saved to frontend/src/artifacts/contracts/contract-addresses.json");
}

function saveDeploymentEnv(network, contractAddresses) {
  const envContent = `# Deployment on ${network}
# Generated: ${new Date().toISOString()}

NEXT_PUBLIC_PET_NFT_ADDRESS=${contractAddresses.PetNFT}
NEXT_PUBLIC_PET_IDENTITY_ADDRESS=${contractAddresses.PetIdentity}
NEXT_PUBLIC_PAW_TOKEN_ADDRESS=${contractAddresses.PawGuardToken}
NEXT_PUBLIC_GUARD_TOKEN_ADDRESS=${contractAddresses.GuardStableCoin}
NEXT_PUBLIC_PAW_POOL_ADDRESS=${contractAddresses.PawPool}
NEXT_PUBLIC_JURY_IDENTITY_ADDRESS=${contractAddresses.JuryIdentity}
NEXT_PUBLIC_VET_CREDENTIAL_ADDRESS=${contractAddresses.VeterinarianCredential}
`;

  const envPath = path.join(__dirname, `../.env.${network}`);
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ Deployment env saved to .env.${network}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
