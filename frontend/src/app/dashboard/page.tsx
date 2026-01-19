'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { uploadJsonToIpfs, retrieveJsonFromIpfs } from '../../utils/web3';
import { queryFilterWithPagination } from '../../utils/eventQuery';
import { getBaseChainDIDClient } from '../../utils/baseDID';
import { config, isDevelopment } from '../../config/app.config';
import Link from 'next/link';

interface Pet {
  id: number;
  owner: string;
  basicInfoIPFSHash: string;
  did?: string;
  basicInfo: {
    name?: string;
    breed?: string;
    age?: number;
  };
}

export default function Dashboard() {
  const { accounts, contracts, loading: web3Loading } = useWeb3();
  const [petName, setPetName] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [petAge, setPetAge] = useState('');
  const [microchipId, setMicrochipId] = useState('');
  const [registeredPets, setRegisteredPets] = useState<Pet[]>([]);
  const [pawBalance, setPawBalance] = useState('0');
  const [guardBalance, setGuardBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [baseDIDClient] = useState(() => 
    getBaseChainDIDClient(
      process.env.NEXT_PUBLIC_PET_IDENTITY_ADDRESS || '', 
      'base-sepolia'
    )
  );

  const currentAccount = accounts[0];

  useEffect(() => {
    if (contracts && currentAccount) {
      fetchPetData();
      fetchTokenBalances();
    }
  }, [contracts, currentAccount]);

  const fetchPetData = async () => {
    try {
      if (!contracts || !currentAccount) {
        console.log('⏳ Waiting for contracts or account...');
        return;
      }
      
      console.log('🔍 Fetching registered pets for account:', currentAccount);

      try {
        // Use ethers.js queryFilter with pagination for large block ranges
        const petNFT = contracts.petNFT;
        console.log('📋 PetNFT contract:', petNFT.address);
        console.log('🔗 Creating filter for PetRegistered events...');
        
        const filter = petNFT.filters.PetRegistered(currentAccount);
        console.log('📊 Filter:', filter);
        
        console.log('⏱️ Querying past events with pagination (this may take a moment)...');
        // Use pagination helper to handle large block ranges
        const events = await queryFilterWithPagination(petNFT, filter, 0, 'latest');

        console.log('✅ Found pet events:', events.length);

        // Fetch details for each pet
        const pets: Pet[] = [];
        for (const event of events) {
          try {
            const petId = event.args?.[0]; // First arg is usually petId
            if (!petId) {
              console.warn('⚠️ No petId in event');
              continue;
            }

            console.log(`🐕 Fetching pet ID: ${petId}`);

            // Fetch basic info from contract using ethers.js syntax
            const petInfo = await petNFT.getPetBasicInfo(petId);
            console.log('📄 Pet info for ID', petId, ':', petInfo);

            // Extract from ethers.js result (array-like)
            const owner = petInfo[0] || currentAccount;
            const ipfsHash = petInfo[1] || '';

            // Try to retrieve pet data from IPFS (with timeout)
            let basicInfo = { name: 'Unknown', breed: 'Unknown', age: 0 };
            if (ipfsHash) {
              try {
                const ipfsData = await Promise.race([
                  retrieveJsonFromIpfs(ipfsHash),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('IPFS timeout')), 3000))
                ]);
                basicInfo = ipfsData as any;
                console.log('✅ Loaded IPFS data for pet', petId);
              } catch (ipfsError) {
                console.warn('⚠️ Could not fetch IPFS data for pet', petId, ipfsError);
              }
            }

            pets.push({
              id: Number(petId),
              owner: String(owner),
              basicInfoIPFSHash: String(ipfsHash),
              basicInfo
            });
          } catch (err) {
            console.error('❌ Error processing pet event:', err);
          }
        }

        console.log('📦 Loaded pets:', pets);
        setRegisteredPets(pets);
      } catch (rpcError: any) {
        console.error('❌ RPC Error fetching pet data:', rpcError.message);
        // Set empty pet list but don't fail completely
        setRegisteredPets([]);
        console.info('ℹ️ No pets found or RPC connection issue - continuing anyway');
      }
    } catch (error) {
      console.error('❌ Unexpected error fetching pet data:', error);
      setRegisteredPets([]);
    }
  };

  const fetchTokenBalances = async () => {
    try {
      if (!contracts || !currentAccount) {
        console.log('⏳ Waiting for contracts or account...');
        return;
      }
      
      console.log('💰 Fetching token balances for:', currentAccount);
      console.log('📋 PAW Token address:', process.env.NEXT_PUBLIC_PAW_TOKEN_ADDRESS);
      console.log('📋 GUARD Token address:', process.env.NEXT_PUBLIC_GUARD_TOKEN_ADDRESS);

      try {
        // Use ethers.js syntax instead of web3.js
        const pawBal = await contracts.pawToken.balanceOf(currentAccount);
        console.log('🔍 Raw PAW balance:', pawBal.toString());
        let pawFormatted = ethers.formatEther(pawBal);
        console.log('✅ PAW balance formatted:', pawFormatted);
        
        // Ensure we don't show scientific notation
        if (parseFloat(pawFormatted) === 0) {
          pawFormatted = '0';
        }
        setPawBalance(pawFormatted);

        const guardBal = await contracts.guardToken.balanceOf(currentAccount);
        console.log('🔍 Raw GUARD balance:', guardBal.toString());
        let guardFormatted = ethers.formatEther(guardBal);
        console.log('✅ GUARD balance formatted:', guardFormatted);
        
        // Ensure we don't show scientific notation
        if (parseFloat(guardFormatted) === 0) {
          guardFormatted = '0';
        }
        setGuardBalance(guardFormatted);
      } catch (rpcError: any) {
        console.error('❌ RPC Error fetching token balances:', rpcError.message);
        // Set default balances but don't fail
        setPawBalance('0');
        setGuardBalance('0');
        console.info('ℹ️ Continuing without token balances');
      }
    } catch (error) {
      console.error('❌ Unexpected error fetching token balances:', error);
      setPawBalance('0');
      setGuardBalance('0');
    }
  };

  const handleRegisterPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName || !petBreed || !petAge) {
      alert('Please fill in all fields');
      return;
    }

    // Check if we're on the correct network (Hardhat Local = Chain ID 31337)
    const chainId = await contracts.web3.eth.getChainId();
    console.log('Current Chain ID:', chainId);

    if (chainId !== 31337 && Number(chainId) !== 31337) {
      console.log('Wrong network detected, attempting to switch to Hardhat Local...');

      try {
        // Try to switch to Hardhat Local network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7a69' }], // 31337 in hex
        });

        // Wait a bit for the switch to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Retry after switching
        console.log('Network switched, retrying...');
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x7a69', // 31337 in hex
                chainName: 'Hardhat Local',
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['http://127.0.0.1:8545'],
              }],
            });
          } catch (addError) {
            alert('Failed to add Hardhat Local network to MetaMask. Please add it manually.');
            return;
          }
        } else {
          alert(`Failed to switch network: ${switchError.message}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      // Step 1: Upload pet data to IPFS
      const petData = {
        name: petName,
        breed: petBreed,
        age: parseInt(petAge),
      };

      console.log('Uploading pet data to IPFS...');
      const ipfsHash = await uploadJsonToIpfs(petData);
      console.log('IPFS Hash:', ipfsHash);

      // Step 2: Register pet NFT on blockchain
      const tx = await contracts.petNFT.methods
        .registerPet(currentAccount, ipfsHash)
        .send({ from: currentAccount });

      // Extract pet ID from transaction events
      const petId = tx.events?.PetRegistered?.returnValues?.petId || 1;

      // Step 3: Create Base chain DID
      let did: string;

      // Development mode: Use generated Base chain DID
      did = baseDIDClient.generatePetDID(
        petId.toString(),
        petName,
        microchipId,
        `Dog/${petBreed}`,
        Math.floor(Date.now() / 1000) - (parseInt(petAge) * 365 * 24 * 60 * 60),
        ipfsHash
      );
      console.log('✅ Base Chain DID created');
      console.log('DID:', did);

      // Step 4: Link DID to PetIdentity contract (if contract is available)
      if (contracts.petIdentity) {
        const microchipHash = contracts.web3.utils.keccak256(microchipId || `CHIP-${Date.now()}`);
        const birthTimestamp = Math.floor(Date.now() / 1000) - (parseInt(petAge) * 365 * 24 * 60 * 60);

        await contracts.petIdentity.methods
          .createPetDID(
            did,
            petId,
            microchipHash,
            `Dog/${petBreed}`,
            birthTimestamp,
            ipfsHash
          )
          .send({ from: currentAccount });
      }

      const modeLabel = isDevelopment() ? '(Development Mode)' : '(Production Mode)';
      alert(`✅ Pet registered successfully! ${modeLabel}\n\nPet ID: ${petId}\nIPFS Hash: ${ipfsHash}\nBase Chain DID: ${did}`);
      setPetName('');
      setPetBreed('');
      setPetAge('');
      setMicrochipId('');
      fetchPetData();
    } catch (error) {
      console.error('Error registering pet:', error);
      alert('Failed to register pet. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  if (web3Loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (!currentAccount) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">Please connect your wallet to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-foreground mb-6">Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Connected Account</p>
          <p className="text-lg font-mono font-semibold text-foreground mt-2 break-all">
            {currentAccount}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">$PAW Balance</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {parseFloat(pawBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">$GUARD Balance</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {parseFloat(guardBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Register New Pet</h2>
        <p className="text-sm text-gray-600 mb-4">
          Your pet will be registered with a Base Chain DID for secure, verifiable identity
        </p>
        <form onSubmit={handleRegisterPet} className="space-y-4">
          <div>
            <label htmlFor="petName" className="block text-sm font-medium text-gray-700 mb-1">
              Pet Name
            </label>
            <input
              type="text"
              id="petName"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label htmlFor="petBreed" className="block text-sm font-medium text-gray-700 mb-1">
              Breed
            </label>
            <input
              type="text"
              id="petBreed"
              value={petBreed}
              onChange={(e) => setPetBreed(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label htmlFor="petAge" className="block text-sm font-medium text-gray-700 mb-1">
              Age (years)
            </label>
            <input
              type="number"
              id="petAge"
              value={petAge}
              onChange={(e) => setPetAge(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label htmlFor="microchipId" className="block text-sm font-medium text-gray-700 mb-1">
              Microchip ID (Optional)
            </label>
            <input
              type="text"
              id="microchipId"
              value={microchipId}
              onChange={(e) => setMicrochipId(e.target.value)}
              placeholder="Auto-generated if empty"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Registering Pet with Base Chain DID...' : 'Register Pet with Base Chain DID'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Your Registered Pets</h2>
        {registeredPets.length === 0 ? (
          <p className="text-gray-600">No pets registered under this account.</p>
        ) : (
          <ul className="space-y-3">
            {registeredPets.map((pet) => (
              <li
                key={pet.id}
                className="border border-gray-200 rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-foreground">Pet ID: {pet.id}</p>
                  <p className="text-gray-700">
                    Name: <strong>{pet.basicInfo.name}</strong>
                  </p>
                  <p className="text-gray-600">Breed: {pet.basicInfo.breed}</p>
                  <p className="text-gray-600">Age: {pet.basicInfo.age} years</p>
                </div>
                <Link
                  href={`/pet/${pet.id}`}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  View Profile
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
