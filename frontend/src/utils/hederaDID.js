/**
 * Frontend Hedera DID Client for PawGuard
 * Browser-compatible client that uses API routes for Hedera operations
 *
 * Note: The Hedera SDK requires Node.js features not available in browsers,
 * so this client proxies all requests through Next.js API routes.
 */
export class HederaDIDClient {
  constructor(network = "testnet") {
    this.network = network;
    this.apiBase = '/api/hedera';
  }

  /**
   * Resolve a DID and get its document via API
   * @param {string} didIdentifier - DID to resolve
   * @returns {Promise<Object>} DID document
   */
  async resolveDID(didIdentifier) {
    try {
      console.log("Resolving DID:", didIdentifier);

      const response = await fetch(`${this.apiBase}/create-pet-did?did=${encodeURIComponent(didIdentifier)}`);

      if (!response.ok) {
        throw new Error(`Failed to resolve DID: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to resolve DID');
      }

      console.log("✅ DID resolved successfully");
      return data.document;
    } catch (error) {
      console.error("❌ Error resolving DID:", error);
      throw error;
    }
  }

  /**
   * Verify a veterinarian's credential via API
   * @param {string} didIdentifier - Vet's DID
   * @returns {Promise<Object>} Verification result
   */
  async verifyVeterinarianCredential(didIdentifier) {
    try {
      const response = await fetch(`${this.apiBase}/verify-vet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did: didIdentifier })
      });

      if (!response.ok) {
        throw new Error(`Failed to verify credential: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        isValid: data.isValid || false,
        isExpired: data.isExpired || false,
        credential: data.credential,
        document: data.document,
        message: data.message || (data.isValid ? 'Valid credential' : 'Invalid credential')
      };
    } catch (error) {
      console.error("❌ Error verifying credential:", error);
      return {
        isValid: false,
        error: error.message,
        message: 'Failed to verify credential'
      };
    }
  }

  /**
   * Get pet information from DID via API
   * @param {string} petDID - Pet's DID
   * @returns {Promise<Object>} Pet information
   */
  async getPetInfo(petDID) {
    try {
      const document = await this.resolveDID(petDID);

      if (!document || !document.subject) {
        throw new Error("Invalid pet DID document");
      }

      return {
        ...document.subject,
        did: petDID,
        registrationDate: document.registrationDate,
        nftId: document.nftId
      };
    } catch (error) {
      console.error("❌ Error fetching pet info:", error);
      throw error;
    }
  }

  /**
   * Get owner information from DID via API
   * @param {string} ownerDID - Owner's DID
   * @returns {Promise<Object>} Owner information
   */
  async getOwnerInfo(ownerDID) {
    try {
      const document = await this.resolveDID(ownerDID);

      if (!document || !document.subject) {
        throw new Error("Invalid owner DID document");
      }

      return {
        did: ownerDID,
        ethereumAddress: document.subject.ethereumAddress,
        verificationLevel: document.subject.verificationLevel,
        country: document.subject.country,
        registrationDate: document.subject.registrationDate
      };
    } catch (error) {
      console.error("❌ Error fetching owner info:", error);
      throw error;
    }
  }

  /**
   * Get pet's medical history from Hedera
   * @param {string} petDID - Pet's DID
   * @returns {Promise<Array>} Medical records
   */
  async getPetMedicalHistory(petDID) {
    try {
      // This would require querying all messages from the pet's topic
      // For now, return empty array as this requires additional implementation
      console.warn("⚠️  Medical history retrieval not yet fully implemented");

      // In full implementation, would:
      // 1. Extract topic ID from DID
      // 2. Query all messages from topic
      // 3. Filter for medical records
      // 4. Return sorted by timestamp

      return [];
    } catch (error) {
      console.error("❌ Error fetching medical history:", error);
      throw error;
    }
  }

  /**
   * Batch resolve multiple DIDs
   * @param {Array<string>} dids - Array of DID identifiers
   * @returns {Promise<Array>} Array of DID documents
   */
  async resolveBatch(dids) {
    try {
      const promises = dids.map(did => this.resolveDID(did));
      const results = await Promise.allSettled(promises);

      return results.map((result, index) => ({
        did: dids[index],
        success: result.status === "fulfilled",
        document: result.status === "fulfilled" ? result.value : null,
        error: result.status === "rejected" ? result.reason.message : null
      }));
    } catch (error) {
      console.error("❌ Error in batch resolve:", error);
      throw error;
    }
  }

  /**
   * Check if a DID exists and is valid
   * @param {string} didIdentifier - DID to check
   * @returns {Promise<boolean>} True if valid
   */
  async isDIDValid(didIdentifier) {
    try {
      await this.resolveDID(didIdentifier);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract topic ID from DID
   * @param {string} didIdentifier - DID identifier
   * @returns {string} Topic ID
   */
  getTopicIdFromDID(didIdentifier) {
    // Parse DID format: did:hedera:testnet:z...._0.0.12345_...
    const parts = didIdentifier.split("_");
    if (parts.length >= 2) {
      return parts[1]; // Returns "0.0.12345"
    }
    throw new Error("Invalid DID format");
  }
}

// Export singleton instance
let clientInstance = null;

export function getHederaDIDClient(network = "testnet") {
  if (!clientInstance || clientInstance.network !== network) {
    clientInstance = new HederaDIDClient(network);
  }
  return clientInstance;
}

export default HederaDIDClient;
