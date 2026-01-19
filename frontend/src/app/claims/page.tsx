'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { uploadJsonToIpfs } from '../../utils/web3';
import { getBaseChainDIDClient } from '../../utils/baseDID';

interface Claim {
  id: number;
  petId: number;
  owner: string;
  requestedAmount: string;
  status: string;
}

interface VetVerification {
  isValid: boolean;
  credential?: any;
  isExpired?: boolean;
  message?: string;
}

export default function Claims() {
  const { accounts, contracts, loading: web3Loading } = useWeb3();
  const [petId, setPetId] = useState('');
  const [treatmentDetails, setTreatmentDetails] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [vetAddress, setVetAddress] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [vetVerification, setVetVerification] = useState<VetVerification | null>(null);
  const [baseDIDClient] = useState(() => 
    getBaseChainDIDClient(
      process.env.NEXT_PUBLIC_PET_IDENTITY_ADDRESS || '', 
      'base-sepolia'
    )
  );

  const currentAccount = accounts[0];

  useEffect(() => {
    if (contracts && currentAccount) {
      fetchClaims();
    }
  }, [contracts, currentAccount]);

  const fetchClaims = async () => {
    try {
      // Fetch claims from contract
      // This is a placeholder - needs actual implementation
      setClaims([]);
    } catch (error) {
      console.error('Error fetching claims:', error);
    }
  };

  const verifyVeterinarian = async () => {
    if (!vetAddress) {
      alert('Please enter a veterinarian address');
      return;
    }

    setVerifying(true);
    setVetVerification(null);

    try {
      // Step 1: Get vet credential from contract (if contract is available)
      if (contracts.veterinarianCredential) {
        // Use ethers.js syntax instead of web3.js
        const credential = await contracts.veterinarianCredential.getCredential(vetAddress);

        if (!credential.did || credential.did === '') {
          setVetVerification({
            isValid: false,
            message: 'No credential found for this veterinarian'
          });
          return;
        }

        // Step 2: Verify credential with Base Chain
        const result = await baseDIDClient.verifyVeterinarianCredential(vetAddress);
        setVetVerification(result);

        if (result.verified) {
          alert(`✅ Verified Veterinarian\n\nDID: ${result.vetDID}\nVerified at: ${result.verifiedAt}`);
        } else {
          alert(`❌ ${result.message || 'Failed to verify veterinarian'}`);
        }
      }
    } catch (error) {
      console.error('Error verifying veterinarian:', error);
      setVetVerification({
        isValid: false,
        message: 'Failed to verify veterinarian. Please try again.'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId || !treatmentDetails || !requestedAmount) {
      alert('Please fill in all fields');
      return;
    }

    // Check if vet is verified before allowing claim submission
    if (vetAddress && !vetVerification?.isValid) {
      alert('Please verify the veterinarian before submitting the claim');
      return;
    }

    setLoading(true);
    try {
      const claimData = {
        petId: parseInt(petId),
        treatmentDetails,
        vetAddress: vetAddress || 'Not specified',
        vetVerified: vetVerification?.isValid || false,
        date: new Date().toISOString(),
      };

      const ipfsHash = await uploadJsonToIpfs(claimData);
      // Use ethers.js to convert to wei
      const amount = ethers.parseEther(requestedAmount);

      // Get signer for transaction signing
      const { getSigner } = await import('../../utils/web3Ethers');
      const signer = await getSigner();
      
      if (!signer) {
        throw new Error('No signer available. Please connect your wallet.');
      }

      // Use ethers.js contract with signer for write operations
      const pawPoolWithSigner = contracts.pawPool.connect(signer);
      await pawPoolWithSigner.submitClaim(parseInt(petId), ipfsHash, amount);

      alert('Claim submitted successfully!');
      setPetId('');
      setTreatmentDetails('');
      setRequestedAmount('');
      setVetAddress('');
      setVetVerification(null);
      fetchClaims();
    } catch (error) {
      console.error('Error submitting claim:', error);
      alert('Failed to submit claim. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (web3Loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading claims...</p>
      </div>
    );
  }

  if (!currentAccount) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">Please connect your wallet to view claims.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-foreground mb-6">Insurance Claims</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Submit New Claim</h2>
        <p className="text-sm text-gray-600 mb-4">
          Verify veterinarian credentials on Base Chain before submitting your claim
        </p>
        <form onSubmit={handleSubmitClaim} className="space-y-4">
          <div>
            <label htmlFor="petId" className="block text-sm font-medium text-gray-700 mb-1">
              Pet ID
            </label>
            <input
              type="number"
              id="petId"
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          {/* Vet Verification Section */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <label htmlFor="vetAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Veterinarian Address (Optional but Recommended)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="vetAddress"
                value={vetAddress}
                onChange={(e) => {
                  setVetAddress(e.target.value);
                  setVetVerification(null); // Reset verification when address changes
                }}
                placeholder="0x..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={verifyVeterinarian}
                disabled={verifying || !vetAddress}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {verifying ? 'Verifying...' : 'Verify Vet'}
              </button>
            </div>

            {/* Verification Result */}
            {vetVerification && (
              <div className={`mt-3 p-3 rounded-lg ${vetVerification.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {vetVerification.isValid ? (
                  <div>
                    <p className="text-green-800 font-semibold flex items-center gap-2">
                      <span>✅</span> Verified Veterinarian
                    </p>
                    {vetVerification.credential && (
                      <div className="mt-2 text-sm text-green-700">
                        <p>Name: Dr. {vetVerification.credential.name}</p>
                        <p>License: {vetVerification.credential.licenseNumber}</p>
                        <p>Specialty: {vetVerification.credential.specialty}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-red-800 flex items-center gap-2">
                    <span>❌</span> {vetVerification.message || 'Invalid or expired credential'}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="treatmentDetails" className="block text-sm font-medium text-gray-700 mb-1">
              Treatment Details
            </label>
            <textarea
              id="treatmentDetails"
              value={treatmentDetails}
              onChange={(e) => setTreatmentDetails(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Describe the treatment and medical situation..."
              required
            />
          </div>
          <div>
            <label htmlFor="requestedAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Requested Amount ($GUARD)
            </label>
            <input
              type="number"
              id="requestedAmount"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || (!!vetAddress && !vetVerification?.isValid)}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Submitting...' : 'Submit Claim'}
          </button>
          {!!vetAddress && !vetVerification?.isValid && (
            <p className="text-sm text-orange-600 text-center">
              Please verify the veterinarian before submitting
            </p>
          )}
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Your Claims</h2>
        {claims.length === 0 ? (
          <p className="text-gray-600">No claims submitted yet.</p>
        ) : (
          <ul className="space-y-3">
            {claims.map((claim) => (
              <li
                key={claim.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">Claim #{claim.id}</p>
                    <p className="text-gray-700">Pet ID: {claim.petId}</p>
                    <p className="text-gray-700">
                      Requested: {ethers.formatEther(claim.requestedAmount)} $GUARD
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      claim.status === 'Approved'
                        ? 'bg-green-100 text-green-800'
                        : claim.status === 'Rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {claim.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
