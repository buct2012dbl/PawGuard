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

const inputClass =
  'w-full bg-black/50 border-b-2 border-white/20 px-4 h-12 text-white text-sm placeholder:text-white/30 focus:border-bitcoin focus:outline-none focus:shadow-[0_10px_20px_-10px_rgba(247,147,26,0.3)] transition-all duration-200';

const labelClass = 'block text-xs font-mono tracking-widest text-muted uppercase mb-2';

const primaryBtn =
  'w-full bg-gradient-to-r from-bitcoin-dark to-bitcoin text-white font-mono font-semibold tracking-wider uppercase h-12 rounded-full shadow-glow-orange hover:shadow-glow-orange-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100';

export default function Dashboard() {
  const { accounts, contracts, provider, signer, loading: web3Loading } = useWeb3();
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
    if (currentAccount) {
      fetchPetData();
      if (contracts) {
        fetchTokenBalances();
      }
    }
  }, [contracts, currentAccount]);

  const fetchPetData = async () => {
    try {
      if (!currentAccount) return;
      try {
        const response = await fetch(`/api/pets?owner=${currentAccount}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data = await response.json();
        setRegisteredPets(data.pets || []);
      } catch {
        setRegisteredPets([]);
      }
    } catch {
      setRegisteredPets([]);
    }
  };

  const fetchTokenBalances = async () => {
    try {
      if (!contracts || !currentAccount) return;
      try {
        const pawBal = await contracts.pawToken.balanceOf(currentAccount);
        let pawFormatted = ethers.formatEther(pawBal);
        if (parseFloat(pawFormatted) === 0) pawFormatted = '0';
        setPawBalance(pawFormatted);

        const guardBal = await contracts.guardToken.balanceOf(currentAccount);
        let guardFormatted = ethers.formatEther(guardBal);
        if (parseFloat(guardFormatted) === 0) guardFormatted = '0';
        setGuardBalance(guardFormatted);
      } catch {
        setPawBalance('0');
        setGuardBalance('0');
      }
    } catch {
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

    const network = await provider?.getNetwork();
    const chainId = network?.chainId || 0;
    if (chainId !== BigInt(84532) && chainId !== BigInt(31337)) {
      alert('Please connect to Base Sepolia testnet or Hardhat Local network');
      return;
    }

    setLoading(true);
    try {
      const petData = { name: petName, breed: petBreed, age: parseInt(petAge) };
      const ipfsHash = await uploadJsonToIpfs(petData);

      if (!signer) {
        alert('Please connect your wallet first');
        setLoading(false);
        return;
      }

      const petNFTWithSigner = contracts.petNFT.connect(signer);
      const registerTx = await petNFTWithSigner.registerPet(currentAccount, ipfsHash);
      const receipt = await registerTx.wait();

      let petId = 1;
      if (receipt?.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contracts.petNFT.interface.parseLog(log);
            if (parsed?.name === 'PetRegistered') { petId = parsed.args[0] || 1; break; }
          } catch { /* continue */ }
        }
      }

      const did = baseDIDClient.generatePetDID(
        petId.toString(), petName, microchipId, `Dog/${petBreed}`,
        Math.floor(Date.now() / 1000) - (parseInt(petAge) * 365 * 24 * 60 * 60), ipfsHash
      );

      if (contracts.petIdentity && signer) {
        const microchipHash = ethers.keccak256(ethers.toUtf8Bytes(microchipId || `CHIP-${Date.now()}`));
        const ageInSeconds = parseInt(petAge) * 365 * 24 * 60 * 60;
        const birthTimestamp = Math.max(0, Math.floor(Date.now() / 1000) - ageInSeconds);
        const petIdentityWithSigner = contracts.petIdentity.connect(signer);
        const didTx = await petIdentityWithSigner.createPetDID(did, petId, microchipHash, `Dog/${petBreed}`, birthTimestamp, ipfsHash);
        await didTx.wait();
      }

      try {
        const dbResponse = await fetch('/api/pets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            petId: Number(petId), owner: currentAccount, basicInfoIPFSHash: ipfsHash,
            basicInfo: petData, did, transactionHash: receipt?.hash
          }),
        });
        if (!dbResponse.ok) console.warn('Failed to save to database');
      } catch { /* non-critical */ }

      const modeLabel = isDevelopment() ? '(Development Mode)' : '(Production Mode)';
      alert(`✅ Pet registered successfully! ${modeLabel}\n\nPet ID: ${petId}\nIPFS Hash: ${ipfsHash}\nBase Chain DID: ${did}`);
      setPetName(''); setPetBreed(''); setPetAge(''); setMicrochipId('');
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-bitcoin/20"></div>
            <div className="absolute inset-0 rounded-full border-t-2 border-bitcoin animate-spin"></div>
          </div>
          <p className="font-mono text-xs tracking-widest text-muted uppercase">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-surface border border-bitcoin/30 rounded-2xl p-8 text-center max-w-md shadow-glow-orange">
          <div className="w-12 h-12 bg-bitcoin/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-bitcoin/40">
            <svg className="w-6 h-6 text-bitcoin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </div>
          <h2 className="font-heading font-bold text-xl text-white mb-2">Wallet Required</h2>
          <p className="text-muted text-sm">Connect your wallet to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="mb-10">
        <p className="font-mono text-xs tracking-widest text-bitcoin uppercase mb-2">Protocol</p>
        <h1 className="font-heading font-bold text-4xl md:text-5xl text-white">
          My <span className="bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent">Dashboard</span>
        </h1>
      </div>

      {/* Stats Row */}
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        {/* Connected Account */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300 group col-span-1">
          <p className="font-mono text-xs tracking-widest text-muted uppercase mb-3">Connected Account</p>
          <p className="font-mono text-sm text-white break-all leading-relaxed">
            {currentAccount}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-gold rounded-full animate-pulse"></div>
            <span className="font-mono text-xs text-gold">ACTIVE</span>
          </div>
        </div>

        {/* PAW Balance */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300 group">
          <p className="font-mono text-xs tracking-widest text-muted uppercase mb-3">$PAW Balance</p>
          <p className="font-heading font-bold text-4xl bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent">
            {parseFloat(pawBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="font-mono text-xs text-muted mt-2 tracking-wider">PAW TOKENS</p>
        </div>

        {/* GUARD Balance */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300 group">
          <p className="font-mono text-xs tracking-widest text-muted uppercase mb-3">$GUARD Balance</p>
          <p className="font-heading font-bold text-4xl bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent">
            {parseFloat(guardBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="font-mono text-xs text-muted mt-2 tracking-wider">GUARD TOKENS</p>
        </div>
      </div>

      {/* Register New Pet */}
      <div className="bg-surface border border-white/10 rounded-2xl p-8 mb-8 hover:border-bitcoin/30 transition-all duration-300">
        <div className="flex items-start gap-4 mb-6">
          <div className="bg-bitcoin/20 border border-bitcoin/40 rounded-xl p-3 flex-shrink-0">
            <svg className="w-6 h-6 text-bitcoin" viewBox="0 0 24 24" fill="currentColor">
              <ellipse cx="9" cy="4.5" rx="2" ry="2.5"/>
              <ellipse cx="15" cy="4.5" rx="2" ry="2.5"/>
              <ellipse cx="5.5" cy="9" rx="1.75" ry="2.25"/>
              <ellipse cx="18.5" cy="9" rx="1.75" ry="2.25"/>
              <path d="M12 11c-3 0-5.5 1.8-5.5 4.5 0 2 1.6 3.5 3.8 3.5h3.4c2.2 0 3.8-1.5 3.8-3.5C17.5 12.8 15 11 12 11z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-heading font-bold text-2xl text-white">Register New Pet</h2>
            <p className="text-muted text-sm mt-1">
              Your pet will be registered with a Base Chain DID for secure, verifiable identity
            </p>
          </div>
        </div>

        <form onSubmit={handleRegisterPet} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="petName" className={labelClass}>Pet Name</label>
              <input
                type="text" id="petName" value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="e.g. Buddy" className={inputClass} required
              />
            </div>
            <div>
              <label htmlFor="petBreed" className={labelClass}>Breed</label>
              <input
                type="text" id="petBreed" value={petBreed}
                onChange={(e) => setPetBreed(e.target.value)}
                placeholder="e.g. Golden Retriever" className={inputClass} required
              />
            </div>
            <div>
              <label htmlFor="petAge" className={labelClass}>Age (years)</label>
              <input
                type="number" id="petAge" value={petAge}
                onChange={(e) => setPetAge(e.target.value)}
                placeholder="e.g. 3" className={inputClass} required
              />
            </div>
            <div>
              <label htmlFor="microchipId" className={labelClass}>Microchip ID <span className="text-white/30 normal-case">(optional)</span></label>
              <input
                type="text" id="microchipId" value={microchipId}
                onChange={(e) => setMicrochipId(e.target.value)}
                placeholder="Auto-generated if empty" className={inputClass}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></div>
                Registering with Base Chain DID...
              </span>
            ) : 'Register Pet with Base Chain DID'}
          </button>
        </form>
      </div>

      {/* Registered Pets */}
      <div className="bg-surface border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading font-bold text-2xl text-white">Your Registered Pets</h2>
            <p className="text-muted text-sm mt-1">
              {registeredPets.length} pet{registeredPets.length !== 1 ? 's' : ''} registered
            </p>
          </div>
          <button
            onClick={fetchPetData} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 border border-white/10 hover:border-bitcoin/50 hover:bg-bitcoin/10 font-mono text-xs tracking-widest text-muted hover:text-white transition-all duration-300 disabled:opacity-40"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {loading ? 'REFRESHING...' : 'REFRESH'}
          </button>
        </div>

        {registeredPets.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
            <svg className="w-14 h-14 mx-auto mb-4 text-white/20" viewBox="0 0 24 24" fill="currentColor">
              <ellipse cx="9" cy="4.5" rx="2" ry="2.5"/>
              <ellipse cx="15" cy="4.5" rx="2" ry="2.5"/>
              <ellipse cx="5.5" cy="9" rx="1.75" ry="2.25"/>
              <ellipse cx="18.5" cy="9" rx="1.75" ry="2.25"/>
              <path d="M12 11c-3 0-5.5 1.8-5.5 4.5 0 2 1.6 3.5 3.8 3.5h3.4c2.2 0 3.8-1.5 3.8-3.5C17.5 12.8 15 11 12 11z"/>
            </svg>
            <p className="font-heading font-semibold text-white mb-2">No pets registered yet</p>
            <p className="text-muted text-sm">Register your first pet above to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {registeredPets.map((pet) => (
              <div
                key={pet.id}
                className="group flex items-center justify-between bg-black/30 border border-white/10 rounded-xl p-5 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-bitcoin/20 border border-bitcoin/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:shadow-glow-orange transition-all duration-300">
                    <svg className="w-5 h-5 text-bitcoin" viewBox="0 0 24 24" fill="currentColor">
                      <ellipse cx="9" cy="4.5" rx="2" ry="2.5"/>
                      <ellipse cx="15" cy="4.5" rx="2" ry="2.5"/>
                      <ellipse cx="5.5" cy="9" rx="1.75" ry="2.25"/>
                      <ellipse cx="18.5" cy="9" rx="1.75" ry="2.25"/>
                      <path d="M12 11c-3 0-5.5 1.8-5.5 4.5 0 2 1.6 3.5 3.8 3.5h3.4c2.2 0 3.8-1.5 3.8-3.5C17.5 12.8 15 11 12 11z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-white">
                      {pet.basicInfo.name || 'Unnamed Pet'}
                      <span className="font-mono text-xs text-muted ml-2">#{pet.id}</span>
                    </p>
                    <p className="text-muted text-xs mt-0.5 font-mono">
                      {pet.basicInfo.breed} · {pet.basicInfo.age}yr
                    </p>
                  </div>
                </div>
                <Link
                  href={`/pet/${pet.id}`}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-bitcoin-dark to-bitcoin text-white font-mono text-xs tracking-wider uppercase shadow-glow-orange hover:shadow-glow-orange-lg hover:scale-105 transition-all duration-300"
                >
                  View Profile
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
