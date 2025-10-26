import { ethers } from "hardhat";
import HederaDIDService from "../services/hederaDIDService.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Integration script to connect Hedera DIDs with PawGuard smart contracts
 */

async function main() {
  console.log("🚀 Starting Hedera DID Integration for PawGuard\n");

  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Initialize Hedera DID Service
  let hederaService;
  try {
    hederaService = new HederaDIDService();
    console.log("✅ Hedera DID Service initialized\n");
  } catch (error) {
    console.error("❌ Failed to initialize Hedera service:", error.message);
    console.error("💡 Make sure you have set HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY in .env");
    process.exit(1);
  }

  // Get contract instances
  console.log("📜 Loading deployed contracts...");
  const contractAddressesPath = path.join(__dirname, "../frontend/src/artifacts/contracts/contract-addresses.json");

  let addresses;
  try {
    const addressData = fs.readFileSync(contractAddressesPath, 'utf8');
    addresses = JSON.parse(addressData);
    console.log("✅ Contract addresses loaded\n");
  } catch (error) {
    console.error("❌ Could not load contract addresses. Have you deployed the contracts?");
    console.error("Run: npx hardhat run config/deploy.js --network <network>");
    process.exit(1);
  }

  const veterinarianCredential = await ethers.getContractAt("VeterinarianCredential", addresses.VeterinarianCredential);
  const petIdentity = await ethers.getContractAt("PetIdentity", addresses.PetIdentity);
  const petNFT = await ethers.getContractAt("PetNFT", addresses.PetNFT);
  const juryIdentity = await ethers.getContractAt("JuryIdentity", addresses.JuryIdentity);

  console.log("✅ All contract instances loaded\n");

  // Example 1: Create and register a veterinarian with Hedera DID
  await integrateVeterinarian(hederaService, veterinarianCredential, deployer);

  // Example 2: Create and register a pet owner with Hedera DID
  await integrateOwner(hederaService, petIdentity, deployer);

  // Example 3: Create and register a pet with Hedera DID
  await integratePet(hederaService, petNFT, petIdentity, deployer);

  // Example 4: Create and register a juror with Hedera DID
  await integrateJuror(hederaService, juryIdentity, deployer);

  // Save Hedera DID mappings
  await saveDIDMappings(hederaService);

  // Close Hedera client
  hederaService.close();

  console.log("\n🎉 Hedera DID Integration Complete!");
}

/**
 * Integrate a veterinarian with Hedera DID
 */
async function integrateVeterinarian(hederaService, veterinarianCredential, deployer) {
  console.log("👨‍⚕️ Integrating Veterinarian with Hedera DID...\n");

  const vetInfo = {
    address: deployer.address,
    licenseNumber: "VET-2025-" + Math.floor(Math.random() * 10000),
    name: "Dr. Sarah Johnson",
    specialization: "Small Animal Surgery",
    issuingAuthority: "State Veterinary Medical Board",
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  };

  // Create Hedera DID for veterinarian
  const hederaDID = await hederaService.createVeterinarianDID(vetInfo);

  console.log("\n📋 Veterinarian DID Details:");
  console.log("  DID:", hederaDID.did);
  console.log("  Topic ID:", hederaDID.topicId);
  console.log("  License:", vetInfo.licenseNumber);

  // Issue on-chain credential referencing Hedera DID
  const expirationTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);

  console.log("\n📝 Issuing on-chain credential...");
  const tx = await veterinarianCredential.issueCredential(
    deployer.address,
    hederaDID.did, // Use Hedera DID
    vetInfo.licenseNumber,
    hederaDID.topicId, // Store Hedera topic ID in IPFS hash field
    expirationTimestamp
  );
  await tx.wait();

  console.log("✅ Veterinarian registered:");
  console.log("  - Hedera DID created on HCS");
  console.log("  - On-chain credential issued");
  console.log("  - Ethereum address:", deployer.address, "\n");

  return hederaDID;
}

/**
 * Integrate a pet owner with Hedera DID
 */
async function integrateOwner(hederaService, petIdentity, deployer) {
  console.log("👤 Integrating Pet Owner with Hedera DID...\n");

  const ownerInfo = {
    address: deployer.address,
    verificationLevel: "Enhanced",
    kycHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("sample-kyc-data-" + Date.now())),
    country: "United States"
  };

  // Create Hedera DID for owner
  const ownerDID = await hederaService.createOwnerDID(ownerInfo);

  console.log("\n📋 Owner DID Details:");
  console.log("  DID:", ownerDID.did);
  console.log("  Topic ID:", ownerDID.topicId);

  // Register on PetIdentity contract
  console.log("\n📝 Registering on-chain identity...");
  const tx = await petIdentity.registerOwnerIdentity(
    ownerDID.did, // Use Hedera DID
    ownerDID.topicId // Store Hedera topic ID
  );
  await tx.wait();

  console.log("✅ Owner registered:");
  console.log("  - Hedera DID created on HCS");
  console.log("  - On-chain identity registered");
  console.log("  - Ethereum address:", deployer.address, "\n");

  return ownerDID;
}

/**
 * Integrate a pet with Hedera DID
 */
async function integratePet(hederaService, petNFT, petIdentity, deployer) {
  console.log("🐕 Integrating Pet with Hedera DID...\n");

  // First register pet NFT
  console.log("📝 Minting Pet NFT...");
  const registerTx = await petNFT.registerPet(deployer.address, "QmPetBasicInfo123");
  const receipt = await registerTx.wait();

  // Get pet ID from event (simplified - in real scenario parse event)
  const petNFTId = 1;
  console.log("  Pet NFT ID:", petNFTId);

  const petInfo = {
    microchipId: "CHIP-" + Math.floor(Math.random() * 1000000),
    species: "Dog",
    breed: "Golden Retriever",
    birthDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 years old
    name: "Max",
    color: "Golden",
    weight: "30kg",
    ownerDID: "did:hedera:testnet:owner123", // Would be actual owner DID
    ownerAddress: deployer.address,
    nftId: petNFTId
  };

  // Create Hedera DID for pet
  const petDID = await hederaService.createPetDID(petInfo);

  console.log("\n📋 Pet DID Details:");
  console.log("  DID:", petDID.did);
  console.log("  Topic ID:", petDID.topicId);
  console.log("  Name:", petInfo.name);
  console.log("  Microchip:", petInfo.microchipId);

  // Register on PetIdentity contract
  console.log("\n📝 Registering pet identity on-chain...");
  const tx = await petIdentity.createPetDID(
    petDID.did, // Use Hedera DID
    petNFTId,
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes(petInfo.microchipId)), // Hash microchip ID
    `${petInfo.species}/${petInfo.breed}`,
    Math.floor(new Date(petInfo.birthDate).getTime() / 1000),
    petDID.topicId // Store Hedera topic ID
  );
  await tx.wait();

  console.log("✅ Pet registered:");
  console.log("  - Pet NFT minted (ID:", petNFTId + ")");
  console.log("  - Hedera DID created on HCS");
  console.log("  - On-chain identity registered\n");

  return { petDID, petNFTId };
}

/**
 * Integrate a juror with Hedera DID
 */
async function integrateJuror(hederaService, juryIdentity, deployer) {
  console.log("⚖️  Integrating Juror with Hedera DID...\n");

  const jurorInfo = {
    address: deployer.address,
    identityHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("unique-biometric-" + Date.now())),
    verificationLevel: "Enhanced",
    kycHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("juror-kyc-" + Date.now()))
  };

  // Create Hedera DID for juror
  const jurorDID = await hederaService.createJurorDID(jurorInfo);

  console.log("\n📋 Juror DID Details:");
  console.log("  DID:", jurorDID.did);
  console.log("  Topic ID:", jurorDID.topicId);

  // Register on JuryIdentity contract
  console.log("\n📝 Registering juror identity...");
  const registerTx = await juryIdentity.registerJuryMember(
    jurorDID.did, // Use Hedera DID
    jurorDID.topicId // Store Hedera topic ID
  );
  await registerTx.wait();

  // Perform Sybil check (would be done by authorized verifier in production)
  console.log("🔍 Performing Sybil check...");
  const sybilTx = await juryIdentity.performSybilCheck(
    deployer.address,
    jurorInfo.identityHash,
    true // Passed
  );
  await sybilTx.wait();

  console.log("✅ Juror registered:");
  console.log("  - Hedera DID created on HCS");
  console.log("  - On-chain identity registered");
  console.log("  - Sybil check passed");
  console.log("  - Ethereum address:", deployer.address, "\n");

  return jurorDID;
}

/**
 * Save DID mappings to file for future reference
 */
async function saveDIDMappings(hederaService) {
  console.log("💾 Saving DID mappings...");

  const mappingsPath = path.join(__dirname, "../hedera-did-mappings.json");

  const mappings = {
    network: hederaService.network,
    timestamp: new Date().toISOString(),
    note: "This file contains example DIDs created during integration. In production, store these securely.",
    warning: "NEVER commit private keys to version control!",
    examples: {
      veterinarian: "See console output above",
      owner: "See console output above",
      pet: "See console output above",
      juror: "See console output above"
    }
  };

  fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2));
  console.log("✅ DID mappings saved to:", mappingsPath, "\n");
}

// Run the integration
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Integration failed:", error);
    process.exit(1);
  });
