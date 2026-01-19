'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useParams, useRouter } from 'next/navigation';
import { useWeb3 } from '../../../contexts/Web3Context';
import { retrieveJsonFromIpfs } from '../../../utils/web3';
import Link from 'next/link';

interface PetData {
  name: string;
  breed: string;
  age: number;
}

interface MedicalRecord {
  vet: string;
  diagnosisIPFSHash: string;
  timestamp: number;
  verified: boolean;
  diagnosis?: any;
}

export default function PetProfile() {
  const params = useParams();
  const router = useRouter();
  const petId = params.id as string;
  const { accounts, contracts, loading: web3Loading } = useWeb3();

  const [petData, setPetData] = useState<PetData | null>(null);
  const [owner, setOwner] = useState<string>('');
  const [ipfsHash, setIpfsHash] = useState<string>('');
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const currentAccount = accounts[0];

  useEffect(() => {
    if (contracts && petId) {
      fetchPetDetails();
    }
  }, [contracts, petId]);

  const fetchPetDetails = async () => {
    setLoading(true);
    try {
      // Fetch basic pet info from contract using ethers.js
      const petInfo = await contracts.petNFT.getPetBasicInfo(petId);
      console.log('Pet info returned:', petInfo);
      console.log('Pet info type:', typeof petInfo);
      console.log('Pet info keys:', Object.keys(petInfo));

      // In ethers.js, the result is returned as an array or object
      const ownerAddress = String(petInfo[0] || currentAccount);
      const hash = String(petInfo[1] || '');

      console.log('Owner:', ownerAddress);
      console.log('IPFS Hash:', hash);

      setOwner(ownerAddress);
      setIpfsHash(hash);

      // Fetch pet data from IPFS only if we have a valid hash
      if (hash && hash.length > 10) { // Valid IPFS hashes are longer than 10 chars
        try {
          console.log('Fetching from IPFS:', hash);
          const ipfsData = await retrieveJsonFromIpfs(hash);
          console.log('IPFS data retrieved:', ipfsData);
          setPetData(ipfsData as PetData);
        } catch (ipfsError) {
          console.error('Error fetching IPFS data:', ipfsError);
          setPetData({ name: 'Unknown', breed: 'Unknown', age: 0 });
        }
      } else {
        console.warn('Invalid or missing IPFS hash');
        setPetData({ name: 'Unknown', breed: 'Unknown', age: 0 });
      }

      // Fetch medical records
      try {
        const recordCount = await contracts.petNFT.getMedicalHistoryLength(petId);
        console.log('Medical record count:', recordCount);
        const records: MedicalRecord[] = [];

        const count = Number(recordCount || 0);

        for (let i = 0; i < count; i++) {
          const record = await contracts.petNFT.getMedicalRecord(petId, i);

          records.push({
            vet: String(record[0] || ''),
            diagnosisIPFSHash: String(record[1] || ''),
            timestamp: Number(record[2] || 0),
            verified: !!(record[3])
          });
        }

        setMedicalRecords(records);
      } catch (err) {
        console.error('Error fetching medical records:', err);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching pet details:', err);
      setError(err.message || 'Failed to load pet details');
      setLoading(false);
    }
  };

  if (web3Loading || loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading pet profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Pet</h2>
        <p className="text-red-700">{error}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="text-blue-600 hover:underline flex items-center gap-2">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {petData?.name || 'Unknown Pet'}
            </h1>
            <p className="text-xl text-gray-600">Pet ID: #{petId}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold">
              Registered
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Breed</p>
            <p className="text-lg font-semibold text-gray-900">{petData?.breed || 'Unknown'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Age</p>
            <p className="text-lg font-semibold text-gray-900">{petData?.age || 0} years</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Blockchain Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Owner Address</p>
              <p className="font-mono text-sm text-gray-900 break-all">{owner}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">IPFS Hash</p>
              <p className="font-mono text-sm text-gray-900 break-all">{ipfsHash}</p>
            </div>
            {currentAccount?.toLowerCase() === owner?.toLowerCase() && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  ✓ You are the owner of this pet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Medical Records Section */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Medical Records</h2>
        {medicalRecords.length === 0 ? (
          <p className="text-gray-600">No medical records found for this pet.</p>
        ) : (
          <div className="space-y-4">
            {medicalRecords.map((record, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">Record #{index + 1}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(record.timestamp * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  {record.verified && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Veterinarian</p>
                  <p className="font-mono text-sm text-gray-900 break-all">{record.vet}</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">Diagnosis IPFS Hash</p>
                  <p className="font-mono text-xs text-gray-900 break-all">{record.diagnosisIPFSHash}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
