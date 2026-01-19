import hre from "hardhat";
const { ethers } = hre;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n🚀 Deploying PawGuard (Minimal Version) to Localhost");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

  try {
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

    // For testing, we'll deploy a minimal version without complex identity contracts
    // This allows the frontend to work with basic functionality

    console.log("\n2️⃣  Deploying Core Contracts (Simplified)...");

    // Create mock addresses for identity contracts (we'll use zero address for now)
    const mockVetCredential = ethers.constants.AddressZero;
    const mockJuryIdentity = ethers.constants.AddressZero;
    const mockPetIdentity = ethers.constants.AddressZero;

    // Save addresses for frontend
    const addresses = {
      PetNFT: ethers.constants.AddressZero, // Placeholder
      PawGuardToken: pawGuardToken.address,
      GuardStableCoin: guardStableCoin.address,
      PawPool: ethers.constants.AddressZero, // Placeholder
      VeterinarianCredential: mockVetCredential,
      PetIdentity: mockPetIdentity,
      JuryIdentity: mockJuryIdentity,
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
    console.log("🎉 DEPLOYMENT COMPLETE (Minimal Version)!");
    console.log("=".repeat(60));
    console.log("\n📋 Deployed Contracts:\n");
    console.log(`  PawGuardToken ($PAW)     ${pawGuardToken.address}`);
    console.log(`  GuardStableCoin ($GUARD) ${guardStableCoin.address}`);
    console.log("\n⚠️  Note: Complex identity contracts skipped due to size limits");
    console.log("   The frontend will work with mock data for testing.\n");
    console.log("=".repeat(60));
    console.log("\n✅ Next Steps:");
    console.log("  1. Start frontend: cd frontend && npm run dev");
    console.log("  2. Open browser: http://localhost:3000");
    console.log("  3. Connect MetaMask to Hardhat Local (Chain ID: 31337)");
    console.log("  4. Test the UI with Base Chain DID functionality");
    console.log("");

  } catch (error) {
    console.error("\n❌ Deployment error:", error.message);
    console.error("\nTroubleshooting:");
    console.error("  - Try restarting Hardhat node (Ctrl+C and run again)");
    console.error("  - Make sure no other process is using port 8545");
    console.error("  - Consider using a simpler contract version");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
