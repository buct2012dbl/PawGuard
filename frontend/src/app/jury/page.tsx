'use client';

import { useState, useEffect } from 'react';
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

const ClaimStatus = {
  0: 'Pending',
  1: 'In Review',
  2: 'Approved',
  3: 'Rejected',
  4: 'Refunded'
};

export default function JuryVoting() {
  const { accounts, contracts, loading: web3Loading } = useWeb3();
  const [assignedClaims, setAssignedClaims] = useState<ClaimForVoting[]>([]);
  const [allClaims, setAllClaims] = useState<ClaimForVoting[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimForVoting | null>(null);
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
      // Web3.js v4 syntax - needs explicit .call()
      const stakeResult = contracts.pawPool.methods.pawStakes(currentAccount);
      const stake = await stakeResult.call();
      setPawStake(String(stake));
    } catch (error) {
      console.error('Error fetching PAW stake:', error);
    }
  };

  const fetchJuryData = async () => {
    setLoading(true);
    try {
      // Get total number of claims by trying to fetch claims until we hit an error
      const claimsData: ClaimForVoting[] = [];
      let claimId = 1;
      let hasMore = true;

      while (hasMore && claimId <= 100) { // Limit to 100 to prevent infinite loop
        try {
          // Web3.js v4 syntax - needs explicit .call()
          const claimResult = contracts.pawPool.methods.claims(claimId);
          const claim = await claimResult.call();

          // Check if this claim exists (owner is not zero address)
          if (claim.owner === '0x0000000000000000000000000000000000000000') {
            hasMore = false;
            break;
          }

          // Check if current user is a juror for this claim
          const isJuror = claim.juryMembers.includes(currentAccount);

          // Check if user has voted
          const hasVotedResult = contracts.pawPool.methods
            .claimHasVoted(claimId, currentAccount);
          const hasVoted = await hasVotedResult.call();

          let voteApproved = null;
          if (hasVoted) {
            const voteApprovedResult = contracts.pawPool.methods
              .claimVoteApproved(claimId, currentAccount);
            voteApproved = await voteApprovedResult.call();
          }

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
            voteApproved
          };

          claimsData.push(claimData);

          // Separate assigned claims
          if (isJuror) {
            // Try to fetch IPFS data for assigned claims
            try {
              const diagnosisData = await retrieveJsonFromIpfs(claim.vetDiagnosisIPFSHash);
              claimData.diagnosisData = diagnosisData;
            } catch (ipfsError) {
              console.log('Could not fetch IPFS data for claim', claimId);
            }
          }

          claimId++;
        } catch (error) {
          hasMore = false;
        }
      }

      const assigned = claimsData.filter(c => c.juryMembers.includes(currentAccount));
      setAssignedClaims(assigned);
      setAllClaims(claimsData);
    } catch (error) {
      console.error('Error fetching jury data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (claimId: number, approve: boolean) => {
    if (!window.confirm(`Are you sure you want to ${approve ? 'APPROVE' : 'REJECT'} this claim?`)) {
      return;
    }

    setLoading(true);
    try {
      await contracts.pawPool.methods
        .voteOnClaim(claimId, approve)
        .send({ from: currentAccount });

      alert(`Vote ${approve ? 'approved' : 'rejected'} successfully!`);
      fetchJuryData();
    } catch (error: any) {
      console.error('Error voting on claim:', error);
      alert(`Failed to vote: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getVotingTimeRemaining = (submissionTimestamp: number) => {
    const votingPeriod = 3 * 24 * 60 * 60; // 3 days in seconds
    const endTime = submissionTimestamp + votingPeriod;
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;

    if (remaining <= 0) return 'Voting period ended';

    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);

    return `${days}d ${hours}h ${minutes}m remaining`;
  };

  if (web3Loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading jury dashboard...</p>
      </div>
    );
  }

  if (!currentAccount) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">Please connect your wallet to view jury assignments.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-foreground mb-6">Jury Voting Dashboard</h1>

      {/* Juror Status */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-purple-50 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Your PAW Stake</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {(parseInt(pawStake) / 10 ** 18).toFixed(2)} PAW
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {parseInt(pawStake) > 0 ? '✓ Eligible for jury duty' : '✗ Stake PAW to become eligible'}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Assigned Claims</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {assignedClaims.length}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            {assignedClaims.filter(c => !c.hasVoted && c.status === 1).length} pending your vote
          </p>
        </div>
      </div>

      {/* Claims Assigned to You */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Assigned Claims</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading claims...</p>
          </div>
        ) : assignedClaims.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">You are not currently assigned to any claims.</p>
            <p className="text-sm text-gray-500 mt-2">
              {parseInt(pawStake) === 0
                ? 'Stake PAW tokens to become eligible for jury selection.'
                : 'Wait for the contract owner to select juries for new claims.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignedClaims.map((claim) => (
              <div
                key={claim.claimId}
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-300 transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Claim #{claim.claimId}</h3>
                    <p className="text-sm text-gray-600">Pet ID: {claim.petId}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      claim.status === 2
                        ? 'bg-green-100 text-green-800'
                        : claim.status === 3
                        ? 'bg-red-100 text-red-800'
                        : claim.status === 1
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {ClaimStatus[claim.status as keyof typeof ClaimStatus]}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Requested Amount</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {(parseInt(claim.requestedPayoutAmount) / 10 ** 18).toFixed(2)} GUARD
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Votes</p>
                    <p className="text-lg font-semibold text-gray-900">
                      <span className="text-green-600">{claim.approveVotes} Approve</span>
                      {' / '}
                      <span className="text-red-600">{claim.rejectVotes} Reject</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pet Owner</p>
                    <p className="text-xs font-mono text-gray-700">
                      {claim.owner.slice(0, 10)}...{claim.owner.slice(-8)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Treating Veterinarian</p>
                    <p className="text-xs font-mono text-gray-700">
                      {claim.treatingVet.slice(0, 10)}...{claim.treatingVet.slice(-8)}
                    </p>
                  </div>
                </div>

                {claim.status === 1 && (
                  <div className="bg-blue-50 rounded p-3 mb-4">
                    <p className="text-sm font-semibold text-blue-800">
                      ⏱ {getVotingTimeRemaining(claim.submissionTimestamp)}
                    </p>
                  </div>
                )}

                {/* Diagnosis Details */}
                <button
                  onClick={() => setExpandedClaimId(expandedClaimId === claim.claimId ? null : claim.claimId)}
                  className="text-purple-600 hover:text-purple-800 font-semibold mb-2 flex items-center"
                >
                  {expandedClaimId === claim.claimId ? '▼' : '▶'} View Medical Details
                </button>

                {expandedClaimId === claim.claimId && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Veterinary Diagnosis:</p>
                    {claim.diagnosisData ? (
                      <div className="text-sm text-gray-700">
                        <pre className="whitespace-pre-wrap bg-white p-3 rounded border border-gray-200">
                          {JSON.stringify(claim.diagnosisData, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">
                        <p>IPFS Hash: {claim.vetDiagnosisIPFSHash}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          (Unable to fetch IPFS data - ensure IPFS daemon is running)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Your Vote Status */}
                {claim.hasVoted ? (
                  <div className={`rounded-lg p-4 ${
                    claim.voteApproved ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className="font-semibold ${claim.voteApproved ? 'text-green-800' : 'text-red-800'}">
                      ✓ You voted to {claim.voteApproved ? 'APPROVE' : 'REJECT'} this claim
                    </p>
                  </div>
                ) : claim.status === 1 ? (
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleVote(claim.claimId, true)}
                      disabled={loading}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 font-semibold"
                    >
                      ✓ APPROVE
                    </button>
                    <button
                      onClick={() => handleVote(claim.claimId, false)}
                      disabled={loading}
                      className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition disabled:bg-gray-400 font-semibold"
                    >
                      ✗ REJECT
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-4">
                    <p className="text-gray-600">
                      Voting is not available for this claim (Status: {ClaimStatus[claim.status as keyof typeof ClaimStatus]})
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Claims Overview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">All Claims Overview</h2>

        {allClaims.length === 0 ? (
          <p className="text-gray-600">No claims have been submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Claim ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pet ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount (GUARD)</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Votes</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Jury</th>
                </tr>
              </thead>
              <tbody>
                {allClaims.map((claim) => (
                  <tr key={claim.claimId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm">#{claim.claimId}</td>
                    <td className="py-3 px-4 text-sm">{claim.petId}</td>
                    <td className="py-3 px-4 text-sm">
                      {(parseInt(claim.requestedPayoutAmount) / 10 ** 18).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <span className="text-green-600">{claim.approveVotes}</span>
                      {' / '}
                      <span className="text-red-600">{claim.rejectVotes}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          claim.status === 2
                            ? 'bg-green-100 text-green-800'
                            : claim.status === 3
                            ? 'bg-red-100 text-red-800'
                            : claim.status === 1
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ClaimStatus[claim.status as keyof typeof ClaimStatus]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {claim.juryMembers.includes(currentAccount) ? (
                        <span className="text-purple-600 font-semibold">You</span>
                      ) : (
                        <span className="text-gray-500">{claim.juryMembers.length} jurors</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
