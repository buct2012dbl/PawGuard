'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { retrieveJsonFromIpfs } from '../../utils/web3';

interface ClaimForVoting {
  claimId: number;
  petId: number;
  owner: string;
  treatingVet: string;
  vetDiagnosisIPFSHash: string;
  submissionTimestamp: number;
  requestedPayoutAmount: string;
  status: number;
  approveVotes: number;
  rejectVotes: number;
  juryMembers: string[];
  hasVoted: boolean;
  voteApproved: boolean | null;
  diagnosisData?: any;
}

const ClaimStatus: Record<number, string> = {
  0: 'Pending',
  1: 'In Review',
  2: 'Approved',
  3: 'Rejected',
  4: 'Refunded',
};

const statusStyle: Record<number, { bg: string; text: string; dot: string }> = {
  0: { bg: 'bg-white/10 border border-white/20',            text: 'text-white',       dot: 'bg-white' },
  1: { bg: 'bg-bitcoin/10 border border-bitcoin/30',        text: 'text-bitcoin',     dot: 'bg-bitcoin animate-pulse' },
  2: { bg: 'bg-emerald-500/10 border border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  3: { bg: 'bg-red-500/10 border border-red-500/30',         text: 'text-red-400',     dot: 'bg-red-400' },
  4: { bg: 'bg-white/5 border border-white/10',              text: 'text-muted',       dot: 'bg-muted' },
};

export default function JuryVoting() {
  const { accounts, contracts, loading: web3Loading } = useWeb3();
  const [assignedClaims, setAssignedClaims] = useState<ClaimForVoting[]>([]);
  const [allClaims, setAllClaims] = useState<ClaimForVoting[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedClaimId, setExpandedClaimId] = useState<number | null>(null);
  const [pawStake, setPawStake] = useState('0');

  const currentAccount = accounts[0];

  useEffect(() => {
    if (contracts && currentAccount) {
      fetchJuryData();
      fetchPawStake();
    }
  }, [contracts, currentAccount]);

  const fetchPawStake = async () => {
    try {
      const stake = await contracts.pawPool.pawStakes(currentAccount);
      setPawStake(String(stake));
    } catch (error) {
      console.error('Error fetching PAW stake:', error);
    }
  };

  const fetchJuryData = async () => {
    setLoading(true);
    try {
      const claimsData: ClaimForVoting[] = [];
      let claimId = 1;

      while (claimId <= 100) {
        try {
          const claim = await contracts.pawPool.claims(claimId);
          if (claim.owner === '0x0000000000000000000000000000000000000000') break;

          const isJuror = claim.juryMembers.includes(currentAccount);
          const hasVoted = await contracts.pawPool.claimHasVoted(claimId, currentAccount);
          let voteApproved = null;
          if (hasVoted) voteApproved = await contracts.pawPool.claimVoteApproved(claimId, currentAccount);

          const claimData: ClaimForVoting = {
            claimId,
            petId: Number(claim.petId),
            owner: claim.owner,
            treatingVet: claim.treatingVet,
            vetDiagnosisIPFSHash: claim.vetDiagnosisIPFSHash,
            submissionTimestamp: Number(claim.submissionTimestamp),
            requestedPayoutAmount: claim.requestedPayoutAmount.toString(),
            status: Number(claim.status),
            approveVotes: Number(claim.approveVotes),
            rejectVotes: Number(claim.rejectVotes),
            juryMembers: claim.juryMembers,
            hasVoted,
            voteApproved,
          };

          if (isJuror) {
            try {
              claimData.diagnosisData = await retrieveJsonFromIpfs(claim.vetDiagnosisIPFSHash);
            } catch { /* IPFS data unavailable */ }
          }

          claimsData.push(claimData);
          claimId++;
        } catch {
          break;
        }
      }

      setAssignedClaims(claimsData.filter(c => c.juryMembers.includes(currentAccount)));
      setAllClaims(claimsData);
    } catch (error) {
      console.error('Error fetching jury data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (claimId: number, approve: boolean) => {
    if (!window.confirm(`Are you sure you want to ${approve ? 'APPROVE' : 'REJECT'} this claim?`)) return;

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const poolWithSigner = contracts.pawPool.connect(signer);
      const tx = await poolWithSigner.voteOnClaim(claimId, approve);
      await tx.wait();

      alert(`Vote ${approve ? 'approved' : 'rejected'} successfully!`);
      fetchJuryData();
    } catch (error: any) {
      alert(`Failed to vote: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getVotingTimeRemaining = (submissionTimestamp: number) => {
    const endTime = submissionTimestamp + 3 * 24 * 60 * 60;
    const remaining = endTime - Math.floor(Date.now() / 1000);
    if (remaining <= 0) return 'Voting period ended';
    const d = Math.floor(remaining / 86400);
    const h = Math.floor((remaining % 86400) / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    return `${d}d ${h}h ${m}m remaining`;
  };

  const isEligible = parseInt(pawStake) > 0;

  if (web3Loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-bitcoin/20"></div>
            <div className="absolute inset-0 rounded-full border-t-2 border-bitcoin animate-spin"></div>
          </div>
          <p className="font-mono text-xs tracking-widest text-muted uppercase">Loading Jury Dashboard...</p>
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
          <p className="text-muted text-sm">Connect your wallet to view jury assignments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="font-mono text-xs tracking-widest text-bitcoin uppercase mb-2">Governance</p>
        <h1 className="font-heading font-bold text-4xl md:text-5xl text-white">
          Jury <span className="bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent">Voting</span>
        </h1>
      </div>

      {/* Juror Status */}
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        <div className={`bg-surface border rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 ${
          isEligible ? 'border-bitcoin/40 hover:border-bitcoin hover:shadow-glow-orange' : 'border-white/10 hover:border-bitcoin/50 hover:shadow-card-hover'
        }`}>
          <p className="font-mono text-xs tracking-widest text-muted uppercase mb-3">PAW Staked</p>
          <p className={`font-heading font-bold text-3xl ${isEligible ? 'bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent' : 'text-white'}`}>
            {(parseInt(pawStake) / 10 ** 18).toFixed(2)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isEligible ? 'bg-gold animate-pulse' : 'bg-muted'}`}></div>
            <p className={`font-mono text-xs uppercase tracking-wider ${isEligible ? 'text-gold' : 'text-muted'}`}>
              {isEligible ? 'Jury Eligible' : 'Stake PAW to Qualify'}
            </p>
          </div>
        </div>

        <div className="bg-surface border border-white/10 rounded-2xl p-6 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300">
          <p className="font-mono text-xs tracking-widest text-muted uppercase mb-3">Assigned Claims</p>
          <p className="font-heading font-bold text-3xl text-white">{assignedClaims.length}</p>
          <p className="font-mono text-xs text-muted mt-2 tracking-wider">
            {assignedClaims.filter(c => !c.hasVoted && c.status === 1).length} pending your vote
          </p>
        </div>

        <div className="bg-surface border border-white/10 rounded-2xl p-6 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300">
          <p className="font-mono text-xs tracking-widest text-muted uppercase mb-3">Total Claims</p>
          <p className="font-heading font-bold text-3xl text-white">{allClaims.length}</p>
          <p className="font-mono text-xs text-muted mt-2 tracking-wider">
            {allClaims.filter(c => c.status === 1).length} in review
          </p>
        </div>
      </div>

      {/* Assigned Claims */}
      <div className="bg-surface border border-white/10 rounded-2xl p-8 mb-8">
        <h2 className="font-heading font-bold text-2xl text-white mb-6">Your Assigned Claims</h2>

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-bitcoin/20"></div>
              <div className="absolute inset-0 rounded-full border-t-2 border-bitcoin animate-spin"></div>
            </div>
            <p className="font-mono text-xs tracking-widest text-muted uppercase">Loading Claims...</p>
          </div>
        ) : assignedClaims.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/10 rounded-xl">
            <svg className="w-12 h-12 mx-auto mb-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3v18M3 6l9-3 9 3M5 10l-2 5h4L5 10zM19 10l-2 5h4l-2-5zM3 21h18"/>
            </svg>
            <p className="font-heading font-semibold text-white mb-2">No assigned claims</p>
            <p className="text-muted text-sm">
              {!isEligible
                ? 'Stake PAW tokens to become eligible for jury selection.'
                : 'Wait for the contract owner to select jurors for new claims.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {assignedClaims.map((claim) => {
              const ss = statusStyle[claim.status] || statusStyle[0];
              const totalVotes = claim.approveVotes + claim.rejectVotes;
              const approvePercent = totalVotes > 0 ? Math.round((claim.approveVotes / totalVotes) * 100) : 0;

              return (
                <div
                  key={claim.claimId}
                  className="group bg-black/30 border border-white/10 rounded-2xl overflow-hidden hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300"
                >
                  {/* Claim Header */}
                  <div className="p-6 border-b border-white/5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-heading font-bold text-xl text-white">
                          Claim <span className="text-bitcoin">#{claim.claimId}</span>
                        </h3>
                        <p className="font-mono text-xs text-muted mt-1">Pet ID: {claim.petId}</p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${ss.bg}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${ss.dot}`}></div>
                        <span className={`font-mono text-xs tracking-wider uppercase ${ss.text}`}>
                          {ClaimStatus[claim.status]}
                        </span>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Requested</p>
                        <p className="font-heading font-semibold text-white">
                          {(parseInt(claim.requestedPayoutAmount) / 10 ** 18).toFixed(2)}
                          <span className="text-muted text-xs ml-1">GUARD</span>
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Pet Owner</p>
                        <p className="font-mono text-xs text-white">
                          {claim.owner.slice(0, 8)}...{claim.owner.slice(-6)}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Treating Vet</p>
                        <p className="font-mono text-xs text-white">
                          {claim.treatingVet.slice(0, 8)}...{claim.treatingVet.slice(-6)}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-xs text-muted uppercase tracking-wider mb-1">Jury ({claim.juryMembers.length})</p>
                        <p className="font-mono text-xs text-bitcoin">You are assigned</p>
                      </div>
                    </div>
                  </div>

                  {/* Vote Progress */}
                  <div className="px-6 py-4 border-b border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-xs text-muted uppercase tracking-wider">Votes</p>
                      <p className="font-mono text-xs text-muted">
                        <span className="text-emerald-400">{claim.approveVotes} approve</span>
                        {' · '}
                        <span className="text-red-400">{claim.rejectVotes} reject</span>
                      </p>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${approvePercent}%` }}
                      ></div>
                    </div>

                    {claim.status === 1 && (
                      <p className="font-mono text-xs text-bitcoin mt-2 flex items-center gap-1">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {getVotingTimeRemaining(claim.submissionTimestamp)}
                      </p>
                    )}
                  </div>

                  {/* Medical Details Toggle */}
                  <div className="px-6 py-3 border-b border-white/5">
                    <button
                      onClick={() => setExpandedClaimId(expandedClaimId === claim.claimId ? null : claim.claimId)}
                      className="flex items-center gap-2 font-mono text-xs tracking-wider text-bitcoin hover:text-gold uppercase transition-colors duration-200"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${expandedClaimId === claim.claimId ? 'rotate-90' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      >
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                      {expandedClaimId === claim.claimId ? 'Hide' : 'View'} Medical Details
                    </button>

                    {expandedClaimId === claim.claimId && (
                      <div className="mt-4 bg-black/40 border border-white/5 rounded-xl p-4">
                        <p className="font-mono text-xs text-muted uppercase tracking-wider mb-3">Veterinary Diagnosis</p>
                        {claim.diagnosisData ? (
                          <pre className="font-mono text-xs text-white/80 whitespace-pre-wrap leading-relaxed">
                            {JSON.stringify(claim.diagnosisData, null, 2)}
                          </pre>
                        ) : (
                          <div>
                            <p className="font-mono text-xs text-muted">
                              IPFS Hash: <span className="text-white">{claim.vetDiagnosisIPFSHash}</span>
                            </p>
                            <p className="font-mono text-xs text-white/30 mt-1">
                              Unable to fetch IPFS data — ensure IPFS daemon is running
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vote Section */}
                  <div className="p-6">
                    {claim.hasVoted ? (
                      <div className={`flex items-center gap-3 p-4 rounded-xl ${
                        claim.voteApproved
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                      }`}>
                        <svg className={`w-5 h-5 ${claim.voteApproved ? 'text-emerald-400' : 'text-red-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d={claim.voteApproved ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"}/>
                        </svg>
                        <p className={`font-mono text-xs tracking-wider uppercase ${claim.voteApproved ? 'text-emerald-400' : 'text-red-400'}`}>
                          You voted to {claim.voteApproved ? 'APPROVE' : 'REJECT'} this claim
                        </p>
                      </div>
                    ) : claim.status === 1 ? (
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleVote(claim.claimId, true)}
                          disabled={loading}
                          className="flex-1 bg-emerald-500/10 border border-emerald-500/40 hover:bg-emerald-500/20 hover:border-emerald-400 text-emerald-400 font-mono font-semibold tracking-wider uppercase h-12 rounded-full transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          APPROVE
                        </button>
                        <button
                          onClick={() => handleVote(claim.claimId, false)}
                          disabled={loading}
                          className="flex-1 bg-red-500/10 border border-red-500/40 hover:bg-red-500/20 hover:border-red-400 text-red-400 font-mono font-semibold tracking-wider uppercase h-12 rounded-full transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          REJECT
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <p className="font-mono text-xs text-muted text-center">
                          Voting not available — Status: {ClaimStatus[claim.status]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Claims Overview */}
      <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-8 border-b border-white/10">
          <h2 className="font-heading font-bold text-2xl text-white">All Claims Overview</h2>
          <p className="text-muted text-sm mt-1">{allClaims.length} total claims on-chain</p>
        </div>

        {allClaims.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              <line x1="2" y1="20" x2="22" y2="20"/>
            </svg>
            <p className="font-heading font-semibold text-white mb-1">No claims submitted yet</p>
            <p className="text-muted text-sm">All on-chain claims will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Claim', 'Pet', 'Amount', 'Votes', 'Status', 'Jury'].map((h) => (
                    <th key={h} className="px-6 py-4 text-left font-mono text-xs tracking-widest text-muted uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allClaims.map((claim) => {
                  const ss = statusStyle[claim.status] || statusStyle[0];
                  return (
                    <tr key={claim.claimId} className="hover:bg-white/5 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-bitcoin">#{claim.claimId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-white">{claim.petId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-white">
                          {(parseInt(claim.requestedPayoutAmount) / 10 ** 18).toFixed(2)}
                          <span className="text-muted text-xs ml-1">GUARD</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs">
                          <span className="text-emerald-400">{claim.approveVotes}</span>
                          <span className="text-muted"> / </span>
                          <span className="text-red-400">{claim.rejectVotes}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${ss.bg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${ss.dot}`}></div>
                          <span className={`font-mono text-xs tracking-wider uppercase ${ss.text}`}>
                            {ClaimStatus[claim.status]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {claim.juryMembers.includes(currentAccount) ? (
                          <span className="font-mono text-xs text-bitcoin">You</span>
                        ) : (
                          <span className="font-mono text-xs text-muted">{claim.juryMembers.length} jurors</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
