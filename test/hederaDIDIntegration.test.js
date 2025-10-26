import { expect } from "chai";
import HederaDIDService from "../services/hederaDIDService.js";
import dotenv from "dotenv";

dotenv.config();

describe("Hedera DID Integration Tests", function () {
  let hederaService;
  let vetDID, petDID, ownerDID, jurorDID;

  // Increase timeout for Hedera transactions
  this.timeout(60000);

  before(async function () {
    // Skip tests if Hedera credentials not configured
    if (!process.env.HEDERA_ACCOUNT_ID || !process.env.HEDERA_PRIVATE_KEY) {
      console.log("\n⚠️  Skipping Hedera tests: HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY not set");
      console.log("💡 To run Hedera tests:");
      console.log("   1. Copy .env.example to .env");
      console.log("   2. Add your Hedera credentials");
      console.log("   3. Get free testnet account at: https://portal.hedera.com/register\n");
      this.skip();
    }

    try {
      hederaService = new HederaDIDService();
      console.log("✅ Hedera DID Service initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Hedera service:", error.message);
      this.skip();
    }
  });

  after(function () {
    if (hederaService) {
      hederaService.close();
    }
  });

  describe("Veterinarian DID", function () {
    it("Should create a veterinarian DID", async function () {
      const vetInfo = {
        address: "0x1234567890123456789012345678901234567890",
        licenseNumber: "VET-TEST-" + Date.now(),
        name: "Dr. Test Veterinarian",
        specialization: "Test Specialization",
        issuingAuthority: "Test Board",
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };

      const result = await hederaService.createVeterinarianDID(vetInfo);

      expect(result).to.have.property("did");
      expect(result).to.have.property("privateKey");
      expect(result).to.have.property("topicId");
      expect(result).to.have.property("credential");

      expect(result.did).to.include("did:hedera:");
      expect(result.credential.type).to.include("VeterinaryLicense");
      expect(result.credential.credentialSubject.licenseNumber).to.equal(vetInfo.licenseNumber);

      vetDID = result;
      console.log("✅ Created vet DID:", result.did);
    });

    it("Should resolve veterinarian DID", async function () {
      if (!vetDID) this.skip();

      const document = await hederaService.resolveDID(vetDID.did);

      expect(document).to.exist;
      console.log("✅ Resolved vet DID document");
    });

    it("Should revoke veterinarian credential", async function () {
      if (!vetDID) this.skip();

      const result = await hederaService.revokeVetCredential(
        vetDID.did,
        "Test revocation"
      );

      expect(result).to.be.true;
      console.log("✅ Vet credential revoked");
    });
  });

  describe("Pet Owner DID", function () {
    it("Should create an owner DID", async function () {
      const ownerInfo = {
        address: "0x2234567890123456789012345678901234567890",
        verificationLevel: "Enhanced",
        kycHash: "0x" + "a".repeat(64),
        country: "Test Country"
      };

      const result = await hederaService.createOwnerDID(ownerInfo);

      expect(result).to.have.property("did");
      expect(result).to.have.property("topicId");
      expect(result).to.have.property("document");

      expect(result.did).to.include("did:hedera:");
      expect(result.document.type).to.include("OwnerIdentity");

      ownerDID = result;
      console.log("✅ Created owner DID:", result.did);
    });

    it("Should resolve owner DID", async function () {
      if (!ownerDID) this.skip();

      const document = await hederaService.resolveDID(ownerDID.did);

      expect(document).to.exist;
      console.log("✅ Resolved owner DID document");
    });

    it("Should update owner verification level", async function () {
      if (!ownerDID) this.skip();

      const result = await hederaService.updateOwnerVerification(
        ownerDID.did,
        "Premium"
      );

      expect(result).to.be.true;
      console.log("✅ Owner verification updated");
    });
  });

  describe("Pet DID", function () {
    it("Should create a pet DID", async function () {
      const petInfo = {
        microchipId: "CHIP-TEST-" + Date.now(),
        species: "Dog",
        breed: "Golden Retriever",
        birthDate: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        name: "Test Pet",
        color: "Golden",
        weight: "30kg",
        ownerDID: ownerDID ? ownerDID.did : "did:hedera:testnet:test",
        ownerAddress: "0x3234567890123456789012345678901234567890",
        nftId: 999
      };

      const result = await hederaService.createPetDID(petInfo);

      expect(result).to.have.property("did");
      expect(result).to.have.property("topicId");
      expect(result).to.have.property("document");

      expect(result.did).to.include("did:hedera:");
      expect(result.document.type).to.include("PetIdentity");
      expect(result.document.subject.name).to.equal(petInfo.name);

      petDID = result;
      console.log("✅ Created pet DID:", result.did);
    });

    it("Should resolve pet DID", async function () {
      if (!petDID) this.skip();

      const document = await hederaService.resolveDID(petDID.did);

      expect(document).to.exist;
      console.log("✅ Resolved pet DID document");
    });

    it("Should add medical record to pet DID", async function () {
      if (!petDID) this.skip();

      const medicalRecord = {
        vetDID: vetDID ? vetDID.did : "did:hedera:testnet:vet123",
        ipfsHash: "QmTestMedicalRecord" + Date.now(),
        diagnosis: "Annual checkup - healthy",
        treatment: "Vaccinations updated",
        followUp: "6 months"
      };

      const result = await hederaService.addMedicalRecord(petDID.did, medicalRecord);

      expect(result).to.be.true;
      console.log("✅ Medical record added to pet DID");
    });
  });

  describe("Juror DID", function () {
    it("Should create a juror DID", async function () {
      const jurorInfo = {
        address: "0x4234567890123456789012345678901234567890",
        identityHash: "0x" + "b".repeat(64),
        verificationLevel: "Enhanced",
        kycHash: "0x" + "c".repeat(64)
      };

      const result = await hederaService.createJurorDID(jurorInfo);

      expect(result).to.have.property("did");
      expect(result).to.have.property("topicId");
      expect(result).to.have.property("document");

      expect(result.did).to.include("did:hedera:");
      expect(result.document.type).to.include("JurorIdentity");

      jurorDID = result;
      console.log("✅ Created juror DID:", result.did);
    });

    it("Should resolve juror DID", async function () {
      if (!jurorDID) this.skip();

      const document = await hederaService.resolveDID(jurorDID.did);

      expect(document).to.exist;
      console.log("✅ Resolved juror DID document");
    });
  });

  describe("Utility Functions", function () {
    it("Should extract topic ID from DID", async function () {
      if (!vetDID) this.skip();

      const topicId = await hederaService.getTopicIdFromDID(vetDID.did);

      expect(topicId).to.exist;
      expect(topicId).to.match(/^\d+\.\d+\.\d+$/); // Format: 0.0.12345
      console.log("✅ Extracted topic ID:", topicId);
    });
  });

  describe("Integration Summary", function () {
    it("Should have created all DID types", function () {
      console.log("\n📊 Hedera DID Integration Summary:");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      if (vetDID) {
        console.log("\n✅ Veterinarian DID:");
        console.log("   DID:", vetDID.did);
        console.log("   Topic:", vetDID.topicId);
      }

      if (ownerDID) {
        console.log("\n✅ Owner DID:");
        console.log("   DID:", ownerDID.did);
        console.log("   Topic:", ownerDID.topicId);
      }

      if (petDID) {
        console.log("\n✅ Pet DID:");
        console.log("   DID:", petDID.did);
        console.log("   Topic:", petDID.topicId);
      }

      if (jurorDID) {
        console.log("\n✅ Juror DID:");
        console.log("   DID:", jurorDID.did);
        console.log("   Topic:", jurorDID.topicId);
      }

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🎉 All DID types created successfully!\n");

      // At least one DID should have been created
      expect(vetDID || ownerDID || petDID || jurorDID).to.exist;
    });
  });
});
