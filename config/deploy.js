import { ethers } from "hardhat";
import fs from 'fs';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy VeterinarianCredential first (required by PetNFT)
  console.log("\n1. Deploying VeterinarianCredential...");
  const VeterinarianCredential = await ethers.getContractFactory("VeterinarianCredential");
  const veterinarianCredential = await VeterinarianCredential.deploy();
  await veterinarianCredential.deployed();
  console.log("VeterinarianCredential deployed to:", veterinarianCredential.address);

  // Deploy PetNFT (requires VeterinarianCredential address)
  console.log("\n2. Deploying PetNFT...");
  const PetNFT = await ethers.getContractFactory("PetNFT");
  const petNFT = await PetNFT.deploy(veterinarianCredential.address);
  await petNFT.deployed();
  console.log("PetNFT deployed to:", petNFT.address);

  // Deploy PetIdentity
  console.log("\n3. Deploying PetIdentity...");
  const PetIdentity = await ethers.getContractFactory("PetIdentity");
  const petIdentity = await PetIdentity.deploy();
  await petIdentity.deployed();
  console.log("PetIdentity deployed to:", petIdentity.address);

  // Deploy PawGuardToken ($PAW)
  console.log("\n4. Deploying PawGuardToken ($PAW)...");
  const PawGuardToken = await ethers.getContractFactory("PawGuardToken");
  const pawGuardToken = await PawGuardToken.deploy();
  await pawGuardToken.deployed();
  console.log("PawGuardToken ($PAW) deployed to:", pawGuardToken.address);

  // Deploy GuardStableCoin ($GUARD)
  console.log("\n5. Deploying GuardStableCoin ($GUARD)...");
  const GuardStableCoin = await ethers.getContractFactory("GuardStableCoin");
  const guardStableCoin = await GuardStableCoin.deploy();
  await guardStableCoin.deployed();
  console.log("GuardStableCoin ($GUARD) deployed to:", guardStableCoin.address);

  // Deploy JuryIdentity (requires minimum stake parameter)
  console.log("\n6. Deploying JuryIdentity...");
  const minimumStake = ethers.utils.parseEther("100"); // 100 PAW minimum stake
  const JuryIdentity = await ethers.getContractFactory("JuryIdentity");
  const juryIdentity = await JuryIdentity.deploy(minimumStake);
  await juryIdentity.deployed();
  console.log("JuryIdentity deployed to:", juryIdentity.address);

  // Deploy PawPool (requires all contract addresses)
  console.log("\n7. Deploying PawPool...");
  const PawPool = await ethers.getContractFactory("PawPool");
  const pawPool = await PawPool.deploy(
    petNFT.address,
    pawGuardToken.address,
    guardStableCoin.address,
    veterinarianCredential.address,
    juryIdentity.address
  );
  await pawPool.deployed();
  console.log("PawPool deployed to:", pawPool.address);

  console.log("\n=== Deployment Summary ===");
  console.log("VeterinarianCredential:", veterinarianCredential.address);
  console.log("PetNFT:", petNFT.address);
  console.log("PetIdentity:", petIdentity.address);
  console.log("PawGuardToken:", pawGuardToken.address);
  console.log("GuardStableCoin:", guardStableCoin.address);
  console.log("JuryIdentity:", juryIdentity.address);
  console.log("PawPool:", pawPool.address);

  // Save contract addresses and ABIs to frontend for easy access
  saveFrontendFiles(
    veterinarianCredential,
    petNFT,
    petIdentity,
    pawGuardToken,
    guardStableCoin,
    juryIdentity,
    pawPool
  );
}

function saveFrontendFiles(
  veterinarianCredential,
  petNFT,
  petIdentity,
  pawGuardToken,
  guardStableCoin,
  juryIdentity,
  pawPool
) {
  const contractsDir = __dirname + "/../frontend/src/artifacts/contracts";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save contract addresses
  fs.writeFileSync(
    contractsDir + "/contract-addresses.json",
    JSON.stringify({
      VeterinarianCredential: veterinarianCredential.address,
      PetNFT: petNFT.address,
      PetIdentity: petIdentity.address,
      PawGuardToken: pawGuardToken.address,
      GuardStableCoin: guardStableCoin.address,
      JuryIdentity: juryIdentity.address,
      PawPool: pawPool.address,
    }, undefined, 2)
  );

  // Save ABIs
  const artifacts = [
    { name: "VeterinarianCredential", artifact: artifacts.readArtifactSync("VeterinarianCredential") },
    { name: "PetNFT", artifact: artifacts.readArtifactSync("PetNFT") },
    { name: "PetIdentity", artifact: artifacts.readArtifactSync("PetIdentity") },
    { name: "PawGuardToken", artifact: artifacts.readArtifactSync("PawGuardToken") },
    { name: "GuardStableCoin", artifact: artifacts.readArtifactSync("GuardStableCoin") },
    { name: "JuryIdentity", artifact: artifacts.readArtifactSync("JuryIdentity") },
    { name: "PawPool", artifact: artifacts.readArtifactSync("PawPool") }
  ];

  artifacts.forEach(({ name, artifact }) => {
    fs.writeFileSync(
      contractsDir + `/${name}.json`,
      JSON.stringify(artifact, null, 2)
    );
  });

  console.log("\nFrontend artifacts saved to:", contractsDir);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
