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

const inputClass =
  'w-full bg-black/50 border-b-2 border-white/20 px-4 h-12 text-white text-sm placeholder:text-white/30 focus:border-bitcoin focus:outline-none focus:shadow-[0_10px_20px_-10px_rgba(247,147,26,0.3)] transition-all duration-200';

const textareaClass =
  'w-full bg-black/50 border-b-2 border-white/20 px-4 py-3 text-white text-sm placeholder:text-white/30 focus:border-bitcoin focus:outline-none focus:shadow-[0_10px_20px_-10px_rgba(247,147,26,0.3)] transition-all duration-200 resize-none';

const labelClass = 'block text-xs font-mono tracking-widest text-muted uppercase mb-2';

const primaryBtn =
  'w-full bg-gradient-to-r from-bitcoin-dark to-bitcoin text-white font-mono font-semibold tracking-wider uppercase h-12 rounded-full shadow-glow-orange hover:shadow-glow-orange-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100';

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  Approved:  { bg: 'bg-emerald-500/10 border border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  Rejected:  { bg: 'bg-red-500/10 border border-red-500/30',         text: 'text-red-400',     dot: 'bg-red-400' },
  Pending:   { bg: 'bg-bitcoin/10 border border-bitcoin/30',          text: 'text-bitcoin',     dot: 'bg-bitcoin' },
};

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
    getBaseChainDIDClient(process.env.NEXT_PUBLIC_PET_IDENTITY_ADDRESS || '', 'base-sepolia')
  );

  const currentAccount = accounts[0];

  useEffect(() => {
    if (contracts && currentAccount) fetchClaims();
  }, [contracts, currentAccount]);

  const fetchClaims = async () => {
    try {
      setClaims([]);
    } catch (error) {
      console.error('Error fetching claims:', error);
    }
  };

  const verifyVeterinarian = async () => {
    if (!vetAddress) { alert('Please enter a veterinarian address'); return; }
    setVerifying(true);
    setVetVerification(null);
    try {
      if (contracts.veterinarianCredential) {
        const credential = await contracts.veterinarianCredential.getCredential(vetAddress);
        if (!credential.did || credential.did === '') {
          setVetVerification({ isValid: false, message: 'No credential found for this veterinarian' });
          return;
        }
        const result = await baseDIDClient.verifyVeterinarianCredential(vetAddress);
        setVetVerification(result);
        if (result.verified) {
          alert(`✅ Verified Veterinarian\n\nDID: ${result.vetDID}\nVerified at: ${result.verifiedAt}`);
        } else {
          alert(`❌ ${result.message || 'Failed to verify veterinarian'}`);
        }
      }
    } catch {
      setVetVerification({ isValid: false, message: 'Failed to verify veterinarian. Please try again.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId || !treatmentDetails || !requestedAmount) { alert('Please fill in all fields'); return; }
    if (vetAddress && !vetVerification?.isValid) { alert('Please verify the veterinarian before submitting'); return; }

    setLoading(true);
    try {
      const claimData = {
        petId: parseInt(petId), treatmentDetails,
        vetAddress: vetAddress || 'Not specified',
        vetVerified: vetVerification?.isValid || false,
        date: new Date().toISOString(),
      };
      const ipfsHash = await uploadJsonToIpfs(claimData);
      const amount = ethers.parseEther(requestedAmount);
      const { getSigner } = await import('../../utils/web3Ethers');
      const signer = await getSigner();
      if (!signer) throw new Error('No signer available. Please connect your wallet.');

      const pawPoolWithSigner = contracts.pawPool.connect(signer);
      await pawPoolWithSigner.submitClaim(parseInt(petId), ipfsHash, amount);

      alert('Claim submitted successfully!');
      setPetId(''); setTreatmentDetails(''); setRequestedAmount('');
      setVetAddress(''); setVetVerification(null);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-bitcoin/20"></div>
            <div className="absolute inset-0 rounded-full border-t-2 border-bitcoin animate-spin"></div>
          </div>
          <p className="font-mono text-xs tracking-widest text-muted uppercase">Loading Claims...</p>
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
          <p className="text-muted text-sm">Connect your wallet to view and submit claims.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="font-mono text-xs tracking-widest text-bitcoin uppercase mb-2">Protocol</p>
        <h1 className="font-heading font-bold text-4xl md:text-5xl text-white">
          Insurance <span className="bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent">Claims</span>
        </h1>
      </div>

      {/* Submit Claim Form */}
      <div className="bg-surface border border-white/10 rounded-2xl p-8 mb-8 hover:border-bitcoin/30 transition-all duration-300">
        <div className="flex items-start gap-4 mb-8">
          <div className="bg-bitcoin/20 border border-bitcoin/40 rounded-xl p-3 flex-shrink-0">
            <svg className="w-5 h-5 text-bitcoin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-heading font-bold text-2xl text-white">Submit New Claim</h2>
            <p className="text-muted text-sm mt-1">
              Verify veterinarian credentials on Base Chain before submitting your claim
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitClaim} className="space-y-6">
          {/* Pet ID */}
          <div>
            <label htmlFor="petId" className={labelClass}>Pet ID</label>
            <input
              type="number" id="petId" value={petId}
              onChange={(e) => setPetId(e.target.value)}
              placeholder="Enter your pet ID" className={inputClass} required
            />
          </div>

          {/* Vet Verification */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-5">
            <p className="font-mono text-xs tracking-widest text-muted uppercase mb-4">
              Veterinarian Verification
              <span className="ml-2 text-white/30 normal-case font-body">(optional but recommended)</span>
            </p>
            <div className="flex gap-3">
              <input
                type="text" id="vetAddress" value={vetAddress}
                onChange={(e) => { setVetAddress(e.target.value); setVetVerification(null); }}
                placeholder="0x... veterinarian wallet address"
                className="flex-1 bg-black/50 border-b-2 border-white/20 px-4 h-12 text-white text-sm placeholder:text-white/30 focus:border-bitcoin focus:outline-none transition-all duration-200"
              />
              <button
                type="button" onClick={verifyVeterinarian}
                disabled={verifying || !vetAddress}
                className="flex-shrink-0 px-6 h-12 rounded-full border border-bitcoin/50 bg-bitcoin/10 hover:bg-bitcoin/20 hover:border-bitcoin text-bitcoin font-mono text-xs tracking-widest uppercase transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {verifying ? 'VERIFYING...' : 'VERIFY VET'}
              </button>
            </div>

            {vetVerification && (
              <div className={`mt-4 p-4 rounded-xl ${
                vetVerification.isValid
                  ? 'bg-emerald-500/10 border border-emerald-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                {vetVerification.isValid ? (
                  <div>
                    <p className="font-mono text-xs tracking-widest text-emerald-400 uppercase flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Verified Veterinarian
                    </p>
                    {vetVerification.credential && (
                      <div className="mt-3 space-y-1">
                        {[
                          ['Name', `Dr. ${vetVerification.credential.name}`],
                          ['License', vetVerification.credential.licenseNumber],
                          ['Specialty', vetVerification.credential.specialty],
                        ].map(([k, v]) => (
                          <p key={k} className="font-mono text-xs text-muted">
                            <span className="text-white/50">{k}:</span> <span className="text-white">{v}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="font-mono text-xs tracking-widest text-red-400 uppercase flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {vetVerification.message || 'Invalid or expired credential'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Treatment Details */}
          <div>
            <label htmlFor="treatmentDetails" className={labelClass}>Treatment Details</label>
            <textarea
              id="treatmentDetails" value={treatmentDetails}
              onChange={(e) => setTreatmentDetails(e.target.value)}
              rows={4} className={textareaClass}
              placeholder="Describe the treatment and medical situation in detail..."
              required
            />
          </div>

          {/* Requested Amount */}
          <div>
            <label htmlFor="requestedAmount" className={labelClass}>Requested Amount ($GUARD)</label>
            <input
              type="number" id="requestedAmount" value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              step="0.01" min="0" placeholder="0.00" className={inputClass} required
            />
          </div>

          <button
            type="submit"
            disabled={loading || (!!vetAddress && !vetVerification?.isValid)}
            className={primaryBtn}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></div>
                Submitting Claim...
              </span>
            ) : 'Submit Claim'}
          </button>

          {!!vetAddress && !vetVerification?.isValid && (
            <p className="font-mono text-xs text-bitcoin text-center tracking-wider">
              ↑ Verify the veterinarian above before submitting
            </p>
          )}
        </form>
      </div>

      {/* Claims List */}
      <div className="bg-surface border border-white/10 rounded-2xl p-8">
        <h2 className="font-heading font-bold text-2xl text-white mb-6">Your Claims</h2>

        {claims.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
            <svg className="w-14 h-14 mx-auto mb-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
            <p className="font-heading font-semibold text-white mb-2">No claims submitted yet</p>
            <p className="text-muted text-sm">Submit your first insurance claim above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => {
              const sc = statusConfig[claim.status] || statusConfig.Pending;
              return (
                <div
                  key={claim.id}
                  className="group bg-black/30 border border-white/10 rounded-xl p-5 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-heading font-semibold text-white">
                        Claim <span className="text-bitcoin">#{claim.id}</span>
                      </p>
                      <p className="font-mono text-xs text-muted">Pet ID: {claim.petId}</p>
                      <p className="font-mono text-sm text-white">
                        {ethers.formatEther(claim.requestedAmount)} <span className="text-muted">$GUARD</span>
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${sc.bg}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></div>
                      <span className={`font-mono text-xs tracking-wider uppercase ${sc.text}`}>
                        {claim.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
