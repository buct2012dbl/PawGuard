'use client';

import Link from 'next/link';
import { useWeb3 } from '../contexts/Web3Context';

export default function Home() {
  const { loading, error, accounts } = useWeb3();

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Welcome to PawGuard
          </h1>
          <p className="text-xl text-gray-600">
            Decentralized Pet Insurance on the Blockchain
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Connecting to blockchain...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-semibold">Connection Error</p>
            <p className="text-red-500 mt-2">{error}</p>
            <p className="text-sm text-gray-600 mt-4">
              Make sure MetaMask is installed and connected to the correct network.
            </p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-foreground mb-4">🏥 Pet NFT Registry</h2>
                <p className="text-gray-600 mb-6">
                  Register your pets as unique NFTs with their medical records and breeding information stored on-chain.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                >
                  Go to Dashboard
                </Link>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-foreground mb-4">💰 Insurance Pool</h2>
                <p className="text-gray-600 mb-6">
                  View pool statistics and manage your insurance premiums with our three-tiered fund management system.
                </p>
                <Link
                  href="/pool"
                  className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
                >
                  View Pool
                </Link>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-foreground mb-4">📋 Submit Claims</h2>
                <p className="text-gray-600 mb-6">
                  Submit insurance claims for your pets and track the voting process by the community jury.
                </p>
                <Link
                  href="/claims"
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
                >
                  View Claims
                </Link>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-foreground mb-4">💎 Tokens</h2>
                <p className="text-gray-600 mb-4">
                  <strong>$PAW:</strong> Governance token for staking and earning rewards
                </p>
                <p className="text-gray-600">
                  <strong>$GUARD:</strong> Stablecoin for pool contributions and payouts
                </p>
              </div>
            </div>

            {/* Jury Governance Section */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
                Decentralized Jury Governance
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 border-2 border-purple-500">
                  <div className="flex items-center mb-4">
                    <div className="bg-white text-purple-600 rounded-full w-12 h-12 flex items-center justify-center text-2xl mr-4">
                      🪙
                    </div>
                    <h2 className="text-2xl font-bold text-white">Stake & Earn</h2>
                  </div>
                  <p className="text-purple-50 mb-4">
                    Stake your $PAW tokens to become eligible for jury duty. Earn 5 PAW tokens for each approved claim you vote on.
                  </p>
                  <ul className="text-sm text-purple-100 mb-6 space-y-2">
                    <li className="flex items-start">
                      <span className="text-white mr-2 font-bold">✓</span>
                      <span>No minimum stake required</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-white mr-2 font-bold">✓</span>
                      <span>Earn rewards for approved votes</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-white mr-2 font-bold">✓</span>
                      <span>Unstake anytime</span>
                    </li>
                  </ul>
                  <Link
                    href="/staking"
                    className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg hover:bg-purple-50 transition font-semibold"
                  >
                    Stake PAW Tokens
                  </Link>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 border-2 border-blue-500">
                  <div className="flex items-center mb-4">
                    <div className="bg-white text-blue-600 rounded-full w-12 h-12 flex items-center justify-center text-2xl mr-4">
                      ⚖️
                    </div>
                    <h2 className="text-2xl font-bold text-white">Jury Voting</h2>
                  </div>
                  <p className="text-blue-50 mb-4">
                    Review insurance claims and vote on their legitimacy. 21 jurors are randomly selected for each claim.
                  </p>
                  <ul className="text-sm text-blue-100 mb-6 space-y-2">
                    <li className="flex items-start">
                      <span className="text-white mr-2 font-bold">✓</span>
                      <span>3-day voting period per claim</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-white mr-2 font-bold">✓</span>
                      <span>2/3 majority required for approval</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-white mr-2 font-bold">✓</span>
                      <span>Review medical records on IPFS</span>
                    </li>
                  </ul>
                  <Link
                    href="/jury"
                    className="inline-block bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition font-semibold"
                  >
                    View Jury Dashboard
                  </Link>
                </div>
              </div>
            </div>

            {/* How It Works Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-3xl font-bold text-foreground mb-6 text-center">
                How PawGuard Works
              </h2>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 text-blue-600 rounded-full w-16 h-16 flex items-center justify-center text-3xl mx-auto mb-4">
                    1
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">Register Pet</h3>
                  <p className="text-sm text-gray-600">
                    Register your pet as an NFT with medical records on-chain
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 text-green-600 rounded-full w-16 h-16 flex items-center justify-center text-3xl mx-auto mb-4">
                    2
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">Pay Premium</h3>
                  <p className="text-sm text-gray-600">
                    Pay insurance premium in $GUARD tokens to the pool
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 text-purple-600 rounded-full w-16 h-16 flex items-center justify-center text-3xl mx-auto mb-4">
                    3
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">Submit Claim</h3>
                  <p className="text-sm text-gray-600">
                    When needed, submit a claim with vet diagnosis
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-yellow-100 text-yellow-600 rounded-full w-16 h-16 flex items-center justify-center text-3xl mx-auto mb-4">
                    4
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">Jury Votes</h3>
                  <p className="text-sm text-gray-600">
                    21 jurors vote, and if approved, you get paid automatically
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {accounts.length > 0 && (
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-600">Connected Account</p>
            <p className="text-lg font-mono font-semibold text-gray-900 mt-2">
              {accounts[0]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
