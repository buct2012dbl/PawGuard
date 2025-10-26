// Hedera DID Integration Examples for Frontend Pages
// Copy these examples into your actual pages

// ==========================================
// Example 1: Dashboard Page - Register Pet with Hedera DID
// File: frontend/src/app/dashboard/page.tsx
// ==========================================

import { getHederaDIDClient } from '../../utils/hederaDID';

// Add to your component:
const [hederaClient] = useState(() => getHederaDIDClient('testnet'));
const [petDID, setPetDID] = useState<string>('');

// Enhanced pet registration with Hedera DID
const handleRegisterPetWithHedera = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    // 1. Upload pet data to IPFS
    const petData = {
      name: petName,
      breed: petBreed,
      age: parseInt(petAge),
    };
    const ipfsHash = await uploadJsonToIpfs(petData);

    // 2. Register pet NFT on blockchain
    const tx = await contracts.petNFT.methods
      .registerPet(currentAccount, ipfsHash)
      .send({ from: currentAccount });

    // Get pet ID from transaction (simplified)
    const petId = 1; // In reality, parse from event

    // 3. Create Hedera DID for the pet (backend call)
    const response = await fetch('/api/hedera/create-pet-did', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        petId,
        name: petName,
        breed: petBreed,
        age: parseInt(petAge),
        ownerAddress: currentAccount,
        microchipId: `CHIP-${Date.now()}` // Or from user input
      })
    });

    const { did, topicId } = await response.json();
    setPetDID(did);

    // 4. Update PetIdentity contract with Hedera DID
    await contracts.petIdentity.methods
      .createPetDID(
        did,
        petId,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`CHIP-${Date.now()}`)),
        `${petBreed}/Dog`,
        Math.floor(Date.now() / 1000) - (parseInt(petAge) * 365 * 24 * 60 * 60),
        topicId
      )
      .send({ from: currentAccount });

    alert(`Pet registered with DID: ${did}`);
    fetchPetData();
  } catch (error) {
    console.error('Error:', error);
    alert('Registration failed');
  } finally {
    setLoading(false);
  }
};

// Display pet with Hedera DID info
const PetCard = ({ pet }: { pet: Pet }) => {
  const [didInfo, setDidInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadHederaInfo = async () => {
    if (!pet.did) return;

    setLoading(true);
    try {
      const info = await hederaClient.getPetInfo(pet.did);
      setDidInfo(info);
    } catch (error) {
      console.error('Error loading Hedera DID:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHederaInfo();
  }, [pet.did]);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="font-bold">{pet.basicInfo.name}</h3>
      <p className="text-sm text-gray-600">Breed: {pet.basicInfo.breed}</p>

      {pet.did && (
        <div className="mt-3 p-3 bg-blue-50 rounded">
          <p className="text-xs font-semibold text-blue-800">Hedera DID</p>
          <p className="text-xs font-mono text-blue-600 break-all">{pet.did}</p>

          {didInfo && (
            <div className="mt-2 text-xs text-gray-700">
              <p>Microchip: {didInfo.microchipId}</p>
              <p>Birth: {new Date(didInfo.birthDate).toLocaleDateString()}</p>
              <p>Owner: {didInfo.ownerEthAddress.slice(0, 10)}...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// ==========================================
// Example 2: Veterinarian Verification Page
// File: frontend/src/app/verify-vet/page.tsx (NEW)
// ==========================================

'use client';

import { useState } from 'react';
import { getHederaDIDClient } from '../../utils/hederaDID';

export default function VerifyVet() {
  const [vetDID, setVetDID] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!vetDID) {
      alert('Please enter a DID');
      return;
    }

    setLoading(true);
    try {
      const client = getHederaDIDClient('testnet');
      const result = await client.verifyVeterinarianCredential(vetDID);
      setVerificationResult(result);
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({ isValid: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Verify Veterinarian</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium mb-2">
          Veterinarian DID
        </label>
        <input
          type="text"
          value={vetDID}
          onChange={(e) => setVetDID(e.target.value)}
          placeholder="did:hedera:testnet:z..."
          className="w-full px-4 py-2 border rounded-lg mb-4"
        />
        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          {loading ? 'Verifying...' : 'Verify Credential'}
        </button>
      </div>

      {verificationResult && (
        <div className={`rounded-lg p-6 ${
          verificationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        } border`}>
          <h2 className="text-xl font-bold mb-4">
            {verificationResult.isValid ? '✅ Valid Credential' : '❌ Invalid Credential'}
          </h2>

          {verificationResult.isValid ? (
            <div className="space-y-2">
              <p><strong>Name:</strong> {verificationResult.credential.name}</p>
              <p><strong>License:</strong> {verificationResult.credential.licenseNumber}</p>
              <p><strong>Specialization:</strong> {verificationResult.credential.specialization}</p>
              <p><strong>Authority:</strong> {verificationResult.credential.issuingAuthority}</p>
              <p><strong>Expires:</strong> {new Date(verificationResult.credential.expirationDate).toLocaleDateString()}</p>
            </div>
          ) : (
            <p className="text-red-600">{verificationResult.message || verificationResult.error}</p>
          )}
        </div>
      )}
    </div>
  );
}


// ==========================================
// Example 3: Pet Profile Page with Medical History
// File: frontend/src/app/pet/[id]/page.tsx (ENHANCED)
// ==========================================

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getHederaDIDClient } from '../../../utils/hederaDID';
import { useWeb3 } from '../../../contexts/Web3Context';

export default function PetProfile() {
  const params = useParams();
  const petId = params.id as string;
  const { contracts, accounts } = useWeb3();

  const [petInfo, setPetInfo] = useState<any>(null);
  const [petDID, setPetDID] = useState<string>('');
  const [hederaInfo, setHederaInfo] = useState<any>(null);
  const [medicalHistory, setMedicalHistory] = useState<any[]>([]);

  useEffect(() => {
    if (contracts && petId) {
      loadPetData();
    }
  }, [contracts, petId]);

  const loadPetData = async () => {
    try {
      // Get basic info from blockchain
      const [owner, ipfsHash] = await contracts.petNFT.methods
        .getPetBasicInfo(petId)
        .call();

      setPetInfo({ owner, ipfsHash });

      // Get DID from PetIdentity contract
      const didData = await contracts.petIdentity.methods
        .getPetDID(petId)
        .call();

      setPetDID(didData.did);

      // Resolve DID from Hedera
      if (didData.did) {
        const client = getHederaDIDClient('testnet');
        const hederaData = await client.getPetInfo(didData.did);
        setHederaInfo(hederaData);

        // Get medical history from Hedera
        const history = await client.getPetMedicalHistory(didData.did);
        setMedicalHistory(history);
      }
    } catch (error) {
      console.error('Error loading pet data:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Pet Profile #{petId}</h1>

      {/* Basic Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Basic Information</h2>
        {hederaInfo && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-semibold">{hederaInfo.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Species/Breed</p>
              <p className="font-semibold">{hederaInfo.species}/{hederaInfo.breed}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Birth Date</p>
              <p className="font-semibold">
                {new Date(hederaInfo.birthDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Color</p>
              <p className="font-semibold">{hederaInfo.color}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hedera DID */}
      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-2">Hedera DID</h2>
        <p className="text-sm font-mono text-blue-600 break-all mb-2">{petDID}</p>
        <p className="text-xs text-gray-600">
          Stored on Hedera Consensus Service • Immutable • W3C Compliant
        </p>
      </div>

      {/* Medical History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Medical History</h2>
        {medicalHistory.length === 0 ? (
          <p className="text-gray-600">No medical records yet</p>
        ) : (
          <div className="space-y-4">
            {medicalHistory.map((record, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="font-semibold">{record.diagnosis}</p>
                <p className="text-sm text-gray-600">
                  Vet DID: {record.vetDID.slice(0, 30)}...
                </p>
                <p className="text-sm text-gray-600">
                  Date: {new Date(record.timestamp).toLocaleDateString()}
                </p>
                {record.treatment && (
                  <p className="text-sm mt-1">Treatment: {record.treatment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ==========================================
// Example 4: Claims Page - Verify Vet Before Claim
// File: frontend/src/app/claims/page.tsx (ENHANCED)
// ==========================================

// Add to your claims submission:
const [vetAddress, setVetAddress] = useState('');
const [vetVerified, setVetVerified] = useState(false);
const [vetInfo, setVetInfo] = useState<any>(null);

const verifyVeterinarian = async () => {
  try {
    // Get vet DID from VeterinarianCredential contract
    const credential = await contracts.veterinarianCredential.methods
      .getCredential(vetAddress)
      .call();

    // Verify with Hedera
    const client = getHederaDIDClient('testnet');
    const result = await client.verifyVeterinarianCredential(credential.did);

    if (result.isValid) {
      setVetVerified(true);
      setVetInfo(result.credential);
      alert(`✅ Veterinarian verified: Dr. ${result.credential.name}`);
    } else {
      alert('❌ Invalid or expired credential');
    }
  } catch (error) {
    console.error('Verification error:', error);
    alert('Failed to verify veterinarian');
  }
};

// Add to your form:
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">Veterinarian Address</label>
  <div className="flex gap-2">
    <input
      type="text"
      value={vetAddress}
      onChange={(e) => setVetAddress(e.target.value)}
      className="flex-1 px-4 py-2 border rounded-lg"
      placeholder="0x..."
    />
    <button
      onClick={verifyVeterinarian}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      Verify
    </button>
  </div>
  {vetVerified && vetInfo && (
    <div className="mt-2 p-3 bg-green-50 rounded">
      <p className="text-sm text-green-800">
        ✅ Verified: Dr. {vetInfo.name} - License {vetInfo.licenseNumber}
      </p>
    </div>
  )}
</div>


// ==========================================
// Example 5: Batch DID Resolution
// File: Anywhere you need to display multiple entities
// ==========================================

const loadMultipleDIDs = async (dids: string[]) => {
  const client = getHederaDIDClient('testnet');
  const results = await client.resolveBatch(dids);

  // Process results
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.did}:`, result.document);
    } else {
      console.log(`❌ ${result.did}: ${result.error}`);
    }
  });

  return results;
};

// Usage:
const vetDIDs = ['did:hedera:testnet:vet1', 'did:hedera:testnet:vet2'];
const resolvedVets = await loadMultipleDIDs(vetDIDs);
