'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { getTransactionUrl } from '../../config/app.config';

export default function Pool() {
  const { accounts, contracts, signer, loading: web3Loading } = useWeb3();
  
  // Premium state
  const [petId, setPetId] = useState('1');
  const [premiumAmount, setPremiumAmount] = useState('');
  
  // Donation state
  const [donationAmount, setDonationAmount] = useState('');

  const [poolBalance, setPoolBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [premiumPayments, setPremiumPayments] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPayments, setTotalPayments] = useState(0);

  const currentAccount = accounts[0];

  useEffect(() => {
    if (contracts && currentAccount) {
      fetchPoolBalance();
      fetchPremiumPayments();
    }
  }, [contracts, currentAccount, currentPage, pageSize]);

  const fetchPoolBalance = async () => {
    try {
      // Fetch pool balance from contract
      const immediatePool = await contracts.pawPool.immediatePayoutPool();
      const stablePool = await contracts.pawPool.stableYieldPool();
      const riskPool = await contracts.pawPool.riskReservePool();

      // Sum all three pools to get total balance
      const totalBalance = immediatePool + stablePool + riskPool;

      // Convert from wei to ether for display
      const balanceInEther = ethers.formatEther(totalBalance);
      setPoolBalance(balanceInEther);

      console.log('Pool balances:');
      console.log('- Immediate Payout Pool:', ethers.formatEther(immediatePool), 'GUARD');
      console.log('- Stable Yield Pool:', ethers.formatEther(stablePool), 'GUARD');
      console.log('- Risk Reserve Pool:', ethers.formatEther(riskPool), 'GUARD');
      console.log('- Total Pool Balance:', balanceInEther, 'GUARD');
    } catch (error) {
      console.error('Error fetching pool balance:', error);
    }
  };

  const fetchPremiumPayments = async () => {
    try {
      console.log('📋 Fetching premium payments for:', currentAccount);
      const response = await fetch(`/api/premium-payments?owner=${currentAccount}&page=${currentPage}&pageSize=${pageSize}`);

      if (!response.ok) {
        throw new Error('Failed to fetch premium payments');
      }

      const data = await response.json();
      setPremiumPayments(data.payments || []);
      setTotalPayments(data.total || 0);
      console.log('✅ Loaded premium payments:', data.payments?.length || 0, 'of', data.total || 0);
    } catch (error) {
      console.error('Error fetching premium payments:', error);
    }
  };

  // Handle Premium Payment
  const handlePayPremium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId || parseFloat(petId) <= 0) {
      alert('Please enter a valid pet ID');
      return;
    }
    if (!premiumAmount || parseFloat(premiumAmount) <= 0) {
      alert('Please enter a valid premium amount');
      return;
    }

    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const amount = ethers.parseEther(premiumAmount);
      console.log('🔄 Paying premium for pet', petId, ':', premiumAmount, 'GUARD...');

      // First approve the pool contract
      const poolAddress = contracts.pawPool.target;
      console.log('📝 Approving pool contract to spend GUARD tokens...');
      console.log('Pool address:', poolAddress);
      console.log('Amount to approve:', amount.toString());

      const guardWithSigner = contracts.guardToken.connect(signer);
      const approveTx = await guardWithSigner.approve(poolAddress, amount);
      console.log('⏳ Waiting for approval transaction:', approveTx.hash);
      await approveTx.wait();
      console.log('✅ Approval confirmed');

      // Then pay premium
      console.log('📝 Paying premium for pet...');
      const poolWithSigner = contracts.pawPool.connect(signer);
      const premiumTx = await poolWithSigner.payPremium(parseInt(petId), amount);
      console.log('⏳ Waiting for premium transaction:', premiumTx.hash);
      const receipt = await premiumTx.wait();
      console.log('✅ Premium payment confirmed');

      // Save payment to database
      try {
        console.log('💾 Saving premium payment to database...');
        const response = await fetch('/api/premium-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            petId: parseInt(petId),
            owner: currentAccount,
            amount: premiumAmount,
            transactionHash: premiumTx.hash,
            blockTimestamp: receipt.blockNumber,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to save payment to database:', errorData);
        } else {
          console.log('✅ Payment saved to database');
        }
      } catch (dbError) {
        console.error('Error saving to database:', dbError);
        // Don't fail the whole transaction if database save fails
      }

      alert('✅ Pet insurance premium paid successfully!');
      setPremiumAmount('');
      setCurrentPage(1); // Reset to first page
      fetchPoolBalance();
      fetchPremiumPayments(); // Refresh payment history
    } catch (error: any) {
      console.error('❌ Error paying premium:', error);
      
      if (error.code === -32002 || error.message?.includes('RPC endpoint returned too many errors')) {
        alert('⏰ The RPC endpoint is currently rate-limited. Please try again in a moment.');
      } else if (error.code === 'ACTION_REJECTED') {
        alert('Transaction cancelled by user');
      } else if (error.message?.includes('insufficient balance')) {
        alert('❌ Insufficient GUARD token balance');
      } else if (error.message?.includes('PetNFT does not exist')) {
        alert('❌ Pet ID does not exist');
      } else if (error.message?.includes('Only pet owner')) {
        alert('❌ You are not the owner of this pet');
      } else {
        alert(`❌ Failed to pay premium: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Donation
  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      alert('Please enter a valid donation amount');
      return;
    }

    if (!signer) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const amount = ethers.parseEther(donationAmount);
      console.log('🔄 Donating', donationAmount, 'GUARD to insurance pool...');

      // First approve the pool contract
      const poolAddress = contracts.pawPool.target;
      console.log('📝 Approving pool contract to spend GUARD tokens...');
      console.log('Pool address:', poolAddress);
      console.log('Amount to approve:', amount.toString());

      const guardWithSigner = contracts.guardToken.connect(signer);
      const approveTx = await guardWithSigner.approve(poolAddress, amount);
      console.log('⏳ Waiting for approval transaction:', approveTx.hash);
      await approveTx.wait();
      console.log('✅ Approval confirmed');

      // Then donate to pool
      console.log('📝 Donating to insurance pool...');
      const poolWithSigner = contracts.pawPool.connect(signer);
      const donateTx = await poolWithSigner.contributeToPool(amount);
      console.log('⏳ Waiting for donation transaction:', donateTx.hash);
      await donateTx.wait();
      console.log('✅ Donation confirmed');

      alert('🙏 Thank you for your donation to the insurance pool!');
      setDonationAmount('');
      fetchPoolBalance();
    } catch (error: any) {
      console.error('❌ Error donating to pool:', error);
      
      if (error.code === -32002 || error.message?.includes('RPC endpoint returned too many errors')) {
        alert('⏰ The RPC endpoint is currently rate-limited. Please try again in a moment.');
      } else if (error.code === 'ACTION_REJECTED') {
        alert('Transaction cancelled by user');
      } else if (error.message?.includes('insufficient balance')) {
        alert('❌ Insufficient GUARD token balance');
      } else {
        alert(`❌ Failed to donate: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (web3Loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading pool...</p>
      </div>
    );
  }

  if (!currentAccount) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">Please connect your wallet to contribute to the pool.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-foreground mb-6">Insurance Pool</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-blue-50 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Pool Balance</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {parseFloat(poolBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUARD
          </p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Pool Distribution</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            <li>• 30% Immediate Payouts</li>
            <li>• 60% Stable Yield</li>
            <li>• 10% Risk Reserve</li>
          </ul>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pay Premium Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Pay Pet Insurance Premium</h2>
          <p className="text-sm text-gray-600 mb-4">
            Pay a premium for a specific pet's insurance coverage
          </p>

          <form onSubmit={handlePayPremium} className="space-y-4">
            <div>
              <label htmlFor="petId" className="block text-sm font-medium text-gray-700 mb-1">
                Pet ID
              </label>
              <input
                type="number"
                id="petId"
                min="1"
                value={petId}
                onChange={(e) => setPetId(e.target.value)}
                placeholder="Enter your pet ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">The ID of the pet you want to insure</p>
            </div>

            <div>
              <label htmlFor="premiumAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Premium Amount (GUARD)
              </label>
              <input
                type="text"
                id="premiumAmount"
                value={premiumAmount}
                onChange={(e) => setPremiumAmount(e.target.value)}
                placeholder="Enter amount in GUARD tokens"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'Pay Premium'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              Your premium is tracked with your pet ID and goes into the insurance pool.
            </p>
          </div>
        </div>

        {/* Donate Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-foreground mb-4">Donate to Pool</h2>
          <p className="text-sm text-gray-600 mb-4">
            Make a general donation to support the entire insurance pool
          </p>

          <form onSubmit={handleDonate} className="space-y-4">
            <div>
              <label htmlFor="donationAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Donation Amount (GUARD)
              </label>
              <input
                type="text"
                id="donationAmount"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                placeholder="Enter amount in GUARD tokens"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : 'Donate'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              Your donation helps fund the entire insurance pool without being tied to a specific pet.
            </p>
          </div>
        </div>
      </div>

      {/* Premium Payment History Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">My Premium Payment History</h2>

        {premiumPayments.length === 0 ? (
          <div className="bg-gray-50 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No premium payments yet.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pet ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount (GUARD)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                  {premiumPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        #{payment.pet_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {parseFloat(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(payment.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                        <a
                          href={getTransactionUrl(payment.transaction_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {payment.transaction_hash.slice(0, 10)}...{payment.transaction_hash.slice(-8)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <label htmlFor="pageSize" className="text-sm text-gray-700 dark:text-gray-300">
                  Show:
                </label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  per page
                </span>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {premiumPayments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, totalPayments)} of {totalPayments} payments
                </span>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {Math.ceil(totalPayments / pageSize) || 1}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(totalPayments / pageSize)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.ceil(totalPayments / pageSize))}
                    disabled={currentPage >= Math.ceil(totalPayments / pageSize)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
