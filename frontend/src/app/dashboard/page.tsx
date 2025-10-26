'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';
import { uploadJsonToIpfs, retrieveJsonFromIpfs } from '../../utils/web3';
import { getHederaDIDClient } from '../../utils/hederaDID';
import Link from 'next/link';

interface Pet {
  id: number;
  owner: string;
  basicInfoIPFSHash: string;
  did?: string;
  topicId?: string;
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
  const [hederaClient] = useState(() => getHederaDIDClient('testnet'));

  const currentAccount = accounts[0];

  useEffect(() => {
    if (contracts && currentAccount) {
      fetchPetData();
      fetchTokenBalances();
    }
  }, [contracts, currentAccount]);

  const fetchPetData = async () => {
    try {
      console.log('Fetching registered pets for account:', currentAccount);

      // Get all PetRegistered events for the current user
      const events = await contracts.petNFT.getPastEvents('PetRegistered', {
        filter: { owner: currentAccount },
        fromBlock: 0,
        toBlock: 'latest'
      });

      console.log('Found pet events:', events);

      // Fetch details for each pet
      const pets: Pet[] = [];
      for (const event of events) {
        const petId = event.returnValues.petId;
        const ipfsHash = event.returnValues.basicInfoIPFSHash;

        try {
          // Fetch basic info from contract - Web3.js v4 needs explicit .call()
          const petInfoResult = contracts.petNFT.methods.getPetBasicInfo(petId);
          const petInfo = await petInfoResult.call();
          console.log('Pet info for ID', petId, ':', petInfo);

          // Extract owner and IPFS hash from the result
          const owner = String(petInfo['0'] || petInfo[0] || currentAccount);
          const contractIpfsHash = String(petInfo['1'] || petInfo[1] || ipfsHash);

          // Try to retrieve pet data from IPFS (with timeout)
          let basicInfo = { name: 'Unknown', breed: 'Unknown', age: 0 };
          try {
            const ipfsData = await Promise.race([
              retrieveJsonFromIpfs(ipfsHash),
              new Promise((_, reject) => setTimeout(() => reject(new Error('IPFS timeout')), 3000))
            ]);
            basicInfo = ipfsData as any;
          } catch (ipfsError) {
            console.warn('Could not fetch IPFS data for pet', petId, ipfsError);
          }

          pets.push({
            id: Number(petId),
            owner,
            basicInfoIPFSHash: ipfsHash,
            basicInfo
          });
        } catch (err) {
          console.error('Error fetching pet', petId, err);
        }
      }

      console.log('Loaded pets:', pets);
      setRegisteredPets(pets);
    } catch (error) {
      console.error('Error fetching pet data:', error);
    }
  };

  const fetchTokenBalances = async () => {
    try {
      // Web3.js v4 syntax - needs explicit .call()
      const pawBalResult = contracts.pawToken.methods.balanceOf(currentAccount);
      const pawBal = await pawBalResult.call();
      setPawBalance(String(pawBal));

      const guardBalResult = contracts.guardToken.methods.balanceOf(currentAccount);
      const guardBal = await guardBalResult.call();
      setGuardBalance(String(guardBal));
    } catch (error) {
      console.error('Error fetching token balances:', error);
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

    if (chainId !== 31337n && chainId !== 31337) {
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

      // Step 3: For local development, use mock Hedera DID
      // In production, this would call: await fetch('/api/hedera/create-pet-did', ...)
      const mockDid = `did:hedera:testnet:${currentAccount.slice(2, 10)}_${Date.now()}`;
      const mockTopicId = `0.0.${Date.now()}`;

      console.log('Mock Hedera DID created for local development');
      console.log('DID:', mockDid);
      console.log('Topic ID:', mockTopicId);

      // Step 4: Link DID to PetIdentity contract (if contract is available)
      if (contracts.petIdentity) {
        const microchipHash = contracts.web3.utils.keccak256(microchipId || `CHIP-${Date.now()}`);
        const birthTimestamp = Math.floor(Date.now() / 1000) - (parseInt(petAge) * 365 * 24 * 60 * 60);

        await contracts.petIdentity.methods
          .createPetDID(
            mockDid,
            petId,
            microchipHash,
            `Dog/${petBreed}`,
            birthTimestamp,
            mockTopicId
          )
          .send({ from: currentAccount });
      }

      alert(`✅ Pet registered successfully!\n\nPet ID: ${petId}\nIPFS Hash: ${ipfsHash}\nHedera DID: ${mockDid}`);
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
            {(parseInt(pawBalance) / 10 ** 18).toFixed(2)}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">$GUARD Balance</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {(parseInt(guardBalance) / 10 ** 18).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Register New Pet</h2>
        <p className="text-sm text-gray-600 mb-4">
          Your pet will be registered with a Hedera DID for secure, verifiable identity
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
            {loading ? 'Registering with Hedera DID...' : 'Register Pet with Hedera DID'}
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
