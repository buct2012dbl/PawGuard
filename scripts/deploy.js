import hre from "hardhat";
const { ethers } = hre;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy PetNFT
  console.log("\nDeploying PetNFT...");
  const PetNFT = await ethers.getContractFactory("PetNFT");
  const petNFT = await PetNFT.deploy();
  await petNFT.deployed();
  console.log("PetNFT deployed to:", petNFT.address);

  // Deploy PawGuardToken ($PAW)
  console.log("\nDeploying PawGuardToken ($PAW)...");
  const PawGuardToken = await ethers.getContractFactory("PawGuardToken");
  const pawGuardToken = await PawGuardToken.deploy();
  await pawGuardToken.deployed();
  console.log("PawGuardToken ($PAW) deployed to:", pawGuardToken.address);

  // Deploy GuardStableCoin ($GUARD)
  console.log("\nDeploying GuardStableCoin ($GUARD)...");
  const GuardStableCoin = await ethers.getContractFactory("GuardStableCoin");
  const guardStableCoin = await GuardStableCoin.deploy();
  await guardStableCoin.deployed();
  console.log("GuardStableCoin ($GUARD) deployed to:", guardStableCoin.address);

  // Deploy PawPool
  console.log("\nDeploying PawPool...");
  const PawPool = await ethers.getContractFactory("PawPool");
  const pawPool = await PawPool.deploy(
    petNFT.address,
    pawGuardToken.address,
    guardStableCoin.address
  );
  await pawPool.deployed();
  console.log("PawPool deployed to:", pawPool.address);

  // Transfer some PAW tokens to PawPool for rewards
  console.log("\nTransferring PAW tokens to PawPool for jury rewards...");
  const pawRewardAmount = ethers.utils.parseEther("10000"); // 10,000 PAW tokens
  await pawGuardToken.transfer(pawPool.address, pawRewardAmount);
  console.log("Transferred 10,000 PAW tokens to PawPool");

  // Save contract addresses and ABIs to frontend for easy access
  console.log("\nSaving deployment info to frontend...");
  saveFrontendFiles(petNFT.address, pawGuardToken.address, guardStableCoin.address, pawPool.address);

  console.log("\n=== Deployment Summary ===");
  console.log("PetNFT:", petNFT.address);
  console.log("PawGuardToken ($PAW):", pawGuardToken.address);
  console.log("GuardStableCoin ($GUARD):", guardStableCoin.address);
  console.log("PawPool:", pawPool.address);
  console.log("==========================\n");
}

function saveFrontendFiles(petNFTAddress, pawGuardTokenAddress, guardStableCoinAddress, pawPoolAddress) {
  const contractsDir = path.join(__dirname, "../frontend/src/artifacts/contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save contract addresses
  fs.writeFileSync(
    path.join(contractsDir, "contract-addresses.json"),
    JSON.stringify({
      PetNFT: petNFTAddress,
      PawGuardToken: pawGuardTokenAddress,
      GuardStableCoin: guardStableCoinAddress,
      PawPool: pawPoolAddress,
    }, undefined, 2)
  );

  console.log("Contract addresses saved to frontend/src/artifacts/contracts/contract-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
