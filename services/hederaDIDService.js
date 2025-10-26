import { HcsDid, HcsDidMessage } from "@hashgraph/did-sdk-js";
import { Client, PrivateKey, TopicId } from "@hashgraph/sdk";
import dotenv from "dotenv";

dotenv.config();

/**
 * Hedera DID Service for PawGuard
 * Manages decentralized identifiers on the Hedera Consensus Service
 */
class HederaDIDService {
  constructor() {
    // Initialize Hedera client based on environment
    const network = process.env.HEDERA_NETWORK || "testnet";

    if (network === "mainnet") {
      this.client = Client.forMainnet();
    } else {
      this.client = Client.forTestnet();
    }

    // Set operator from environment variables
    const operatorId = process.env.HEDERA_ACCOUNT_ID;
    const operatorKey = process.env.HEDERA_PRIVATE_KEY;

    if (!operatorId || !operatorKey) {
      throw new Error(
        "HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY must be set in .env file"
      );
    }

    this.client.setOperator(operatorId, operatorKey);
    this.network = network;
  }

  /**
   * Create a new DID for a veterinarian
   * @param {Object} vetInfo - Veterinarian information
   * @returns {Promise<Object>} - DID information
   */
  async createVeterinarianDID(vetInfo) {
    try {
      console.log("Creating veterinarian DID...");

      // Generate new private key for the DID
      const privateKey = PrivateKey.generate();

      // Create DID on Hedera
      const did = new HcsDid({
        privateKey: privateKey,
        client: this.client
      });

      // Register DID on HCS
      console.log("Registering DID on Hedera Consensus Service...");
      await did.register();

      // Create verifiable credential
      const credential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://pawguard.io/credentials/v1"
        ],
        type: ["VerifiableCredential", "VeterinaryLicense"],
        issuer: `did:hedera:${this.network}:${process.env.HEDERA_ACCOUNT_ID}`,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: did.getIdentifier(),
          ethereumAddress: vetInfo.address,
          licenseNumber: vetInfo.licenseNumber,
          name: vetInfo.name || "Anonymous",
          specialization: vetInfo.specialization || "General Practice",
          issuingAuthority: vetInfo.issuingAuthority || "State Veterinary Board",
          expirationDate: vetInfo.expirationDate
        }
      };

      // Store credential on HCS
      console.log("Storing credential on HCS...");
      const message = new HcsDidMessage(
        MessageType.DIDOwner,
        did.getIdentifier(),
        JSON.stringify(credential)
      );

      await message.submitToHcs(this.client, did.getTopicId());

      console.log("✅ Veterinarian DID created successfully!");

      return {
        did: did.getIdentifier(),
        privateKey: privateKey.toString(),
        topicId: did.getTopicId().toString(),
        credential: credential,
        network: this.network
      };
    } catch (error) {
      console.error("❌ Error creating veterinarian DID:", error);
      throw error;
    }
  }

  /**
   * Create a DID for a pet
   * @param {Object} petInfo - Pet information
   * @returns {Promise<Object>} - DID information
   */
  async createPetDID(petInfo) {
    try {
      console.log("Creating pet DID...");

      const privateKey = PrivateKey.generate();
      const did = new HcsDid({
        privateKey: privateKey,
        client: this.client
      });

      await did.register();
      console.log("Pet DID registered on HCS");

      const petDocument = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://pawguard.io/credentials/v1"
        ],
        type: ["PetIdentity"],
        id: did.getIdentifier(),
        subject: {
          microchipId: petInfo.microchipId,
          species: petInfo.species,
          breed: petInfo.breed,
          birthDate: petInfo.birthDate,
          name: petInfo.name,
          color: petInfo.color || "Unknown",
          weight: petInfo.weight || "Unknown",
          owner: petInfo.ownerDID,
          ownerEthAddress: petInfo.ownerAddress
        },
        nftId: petInfo.nftId,
        registrationDate: new Date().toISOString()
      };

      const message = new HcsDidMessage(
        MessageType.DIDOwner,
        did.getIdentifier(),
        JSON.stringify(petDocument)
      );

      await message.submitToHcs(this.client, did.getTopicId());

      console.log("✅ Pet DID created successfully!");

      return {
        did: did.getIdentifier(),
        privateKey: privateKey.toString(),
        topicId: did.getTopicId().toString(),
        document: petDocument,
        network: this.network
      };
    } catch (error) {
      console.error("❌ Error creating pet DID:", error);
      throw error;
    }
  }

  /**
   * Create a DID for a pet owner
   * @param {Object} ownerInfo - Owner information
   * @returns {Promise<Object>} - DID information
   */
  async createOwnerDID(ownerInfo) {
    try {
      console.log("Creating owner DID...");

      const privateKey = PrivateKey.generate();
      const did = new HcsDid({
        privateKey: privateKey,
        client: this.client
      });

      await did.register();
      console.log("Owner DID registered on HCS");

      const ownerDocument = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://pawguard.io/credentials/v1"
        ],
        type: ["OwnerIdentity"],
        id: did.getIdentifier(),
        subject: {
          ethereumAddress: ownerInfo.address,
          verificationLevel: ownerInfo.verificationLevel || "Unverified",
          kycHash: ownerInfo.kycHash, // Hash of KYC documents
          country: ownerInfo.country || "Unknown",
          registrationDate: new Date().toISOString()
        }
      };

      const message = new HcsDidMessage(
        MessageType.DIDOwner,
        did.getIdentifier(),
        JSON.stringify(ownerDocument)
      );

      await message.submitToHcs(this.client, did.getTopicId());

      console.log("✅ Owner DID created successfully!");

      return {
        did: did.getIdentifier(),
        privateKey: privateKey.toString(),
        topicId: did.getTopicId().toString(),
        document: ownerDocument,
        network: this.network
      };
    } catch (error) {
      console.error("❌ Error creating owner DID:", error);
      throw error;
    }
  }

  /**
   * Create a DID for a jury member
   * @param {Object} jurorInfo - Juror information
   * @returns {Promise<Object>} - DID information
   */
  async createJurorDID(jurorInfo) {
    try {
      console.log("Creating juror DID...");

      const privateKey = PrivateKey.generate();
      const did = new HcsDid({
        privateKey: privateKey,
        client: this.client
      });

      await did.register();
      console.log("Juror DID registered on HCS");

      const jurorDocument = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://pawguard.io/credentials/v1"
        ],
        type: ["JurorIdentity"],
        id: did.getIdentifier(),
        subject: {
          ethereumAddress: jurorInfo.address,
          identityHash: jurorInfo.identityHash,
          verificationLevel: jurorInfo.verificationLevel || "Basic",
          kycHash: jurorInfo.kycHash,
          registrationDate: new Date().toISOString()
        }
      };

      const message = new HcsDidMessage(
        MessageType.DIDOwner,
        did.getIdentifier(),
        JSON.stringify(jurorDocument)
      );

      await message.submitToHcs(this.client, did.getTopicId());

      console.log("✅ Juror DID created successfully!");

      return {
        did: did.getIdentifier(),
        privateKey: privateKey.toString(),
        topicId: did.getTopicId().toString(),
        document: jurorDocument,
        network: this.network
      };
    } catch (error) {
      console.error("❌ Error creating juror DID:", error);
      throw error;
    }
  }

  /**
   * Resolve a DID and get its document
   * @param {string} didIdentifier - DID to resolve
   * @returns {Promise<Object>} - DID document
   */
  async resolveDID(didIdentifier) {
    try {
      console.log("Resolving DID:", didIdentifier);

      const did = new HcsDid({ identifier: didIdentifier });
      const document = await did.resolve(this.client);

      console.log("✅ DID resolved successfully");
      return document;
    } catch (error) {
      console.error("❌ Error resolving DID:", error);
      throw error;
    }
  }

  /**
   * Revoke a veterinarian credential
   * @param {string} didIdentifier - DID to revoke
   * @param {string} reason - Reason for revocation
   * @returns {Promise<boolean>} - Success status
   */
  async revokeVetCredential(didIdentifier, reason) {
    try {
      console.log("Revoking vet credential:", didIdentifier);

      const revocationMessage = {
        type: "CredentialRevocation",
        did: didIdentifier,
        reason: reason,
        timestamp: new Date().toISOString(),
        revokedBy: `did:hedera:${this.network}:${process.env.HEDERA_ACCOUNT_ID}`
      };

      // Get topic ID from DID
      const topicId = await this.getTopicIdFromDID(didIdentifier);

      // Submit revocation to HCS
      const message = new HcsDidMessage(
        MessageType.DIDOwner,
        didIdentifier,
        JSON.stringify(revocationMessage)
      );

      await message.submitToHcs(this.client, TopicId.fromString(topicId));

      console.log("✅ Credential revoked successfully");
      return true;
    } catch (error) {
      console.error("❌ Error revoking credential:", error);
      throw error;
    }
  }

  /**
   * Add a medical record to pet's DID
   * @param {string} petDID - Pet DID
   * @param {Object} medicalRecord - Medical record data
   * @returns {Promise<boolean>} - Success status
   */
  async addMedicalRecord(petDID, medicalRecord) {
    try {
      console.log("Adding medical record to pet DID:", petDID);

      const recordMessage = {
        type: "MedicalRecord",
        petDID: petDID,
        vetDID: medicalRecord.vetDID,
        recordHash: medicalRecord.ipfsHash,
        timestamp: new Date().toISOString(),
        diagnosis: medicalRecord.diagnosis,
        treatment: medicalRecord.treatment || "Not specified",
        followUp: medicalRecord.followUp || "None"
      };

      const topicId = await this.getTopicIdFromDID(petDID);
      const message = new HcsDidMessage(
        MessageType.DIDOwner,
        petDID,
        JSON.stringify(recordMessage)
      );

      await message.submitToHcs(this.client, TopicId.fromString(topicId));

      console.log("✅ Medical record added successfully");
      return true;
    } catch (error) {
      console.error("❌ Error adding medical record:", error);
      throw error;
    }
  }

  /**
   * Helper method to extract topic ID from DID
   * @param {string} didIdentifier - DID identifier
   * @returns {Promise<string>} - Topic ID
   */
  async getTopicIdFromDID(didIdentifier) {
    try {
      // Parse DID format: did:hedera:testnet:z...._0.0.12345_...
      const parts = didIdentifier.split("_");
      if (parts.length >= 2) {
        return parts[1]; // Returns "0.0.12345"
      }
      throw new Error("Invalid DID format");
    } catch (error) {
      console.error("❌ Error extracting topic ID from DID:", error);
      throw error;
    }
  }

  /**
   * Get all messages from a DID topic
   * @param {string} topicId - Topic ID
   * @returns {Promise<Array>} - Array of messages
   */
  async getTopicMessages(topicId) {
    try {
      console.log("Fetching messages from topic:", topicId);

      // This would require additional implementation
      // to query HCS topic messages
      // For now, return empty array

      console.log("⚠️  Topic message fetching not yet implemented");
      return [];
    } catch (error) {
      console.error("❌ Error fetching topic messages:", error);
      throw error;
    }
  }

  /**
   * Update owner verification level
   * @param {string} ownerDID - Owner DID
   * @param {string} newLevel - New verification level
   * @returns {Promise<boolean>} - Success status
   */
  async updateOwnerVerification(ownerDID, newLevel) {
    try {
      console.log("Updating owner verification level:", ownerDID, "to", newLevel);

      const updateMessage = {
        type: "VerificationUpdate",
        did: ownerDID,
        newVerificationLevel: newLevel,
        timestamp: new Date().toISOString(),
        updatedBy: `did:hedera:${this.network}:${process.env.HEDERA_ACCOUNT_ID}`
      };

      const topicId = await this.getTopicIdFromDID(ownerDID);
      const message = new HcsDidMessage(
        MessageType.DIDOwner,
        ownerDID,
        JSON.stringify(updateMessage)
      );

      await message.submitToHcs(this.client, TopicId.fromString(topicId));

      console.log("✅ Verification level updated successfully");
      return true;
    } catch (error) {
      console.error("❌ Error updating verification:", error);
      throw error;
    }
  }

  /**
   * Close the client connection
   */
  close() {
    if (this.client) {
      this.client.close();
      console.log("Hedera client connection closed");
    }
  }
}

export default HederaDIDService;
