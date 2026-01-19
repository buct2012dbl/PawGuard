'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';

export default function Pool() {
  const { accounts, contracts, signer, loading: web3Loading } = useWeb3();
  const [petId, setPetId] = useState('1');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [poolBalance, setPoolBalance] = useState('0');
  const [loading, setLoading] = useState(false);

  const currentAccount = accounts[0];

  useEffect(() => {
    if (contracts && currentAccount) {
      fetchPoolBalance();
    }
  }, [contracts, currentAccount]);

  const fetchPoolBalance = async () => {
    try {
      // Fetch pool balance from contract
      // This is a placeholder - needs actual implementation
      setPoolBalance('0');
    } catch (error) {
      console.error('Error fetching pool balance:', error);
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!premiumAmount || parseFloat(premiumAmount) <= 0) {
      alert('Please enter a valid premium amount');
      return;
    }

    if (!petId || parseFloat(petId) <= 0) {
      alert('Please enter a valid pet ID');
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
      console.log('📝 Approving pool contract to spend GUARD tokens...');
      const guardWithSigner = contracts.guardToken.connect(signer);
      const approveTx = await guardWithSigner.approve(process.env.NEXT_PUBLIC_PAW_POOL_ADDRESS, amount);
      console.log('⏳ Waiting for approval transaction:', approveTx.hash);
      await approveTx.wait();
      console.log('✅ Approval confirmed');

      // Then pay premium
      console.log('📝 Paying premium...');
      const poolWithSigner = contracts.pawPool.connect(signer);
      const premiumTx = await poolWithSigner.payPremium(parseInt(petId), amount);
      console.log('⏳ Waiting for premium transaction:', premiumTx.hash);
      await premiumTx.wait();
      console.log('✅ Premium payment confirmed');

      alert('Premium payment successful!');
      setPremiumAmount('');
      fetchPoolBalance();
    } catch (error: any) {
      console.error('❌ Error paying premium:', error);
      
      // Provide user-friendly error messages
      if (error.code === -32002 || error.message?.includes('RPC endpoint returned too many errors')) {
        alert('⏰ The RPC endpoint is currently rate-limited. Please try again in a moment.');
      } else if (error.code === 'ACTION_REJECTED') {
        alert('Transaction cancelled by user');
      } else if (error.message?.includes('insufficient balance')) {
        alert('❌ Insufficient GUARD token balance');
      } else if (error.message?.includes('Only pet owner')) {
        alert('❌ You are not the owner of this pet');
      } else if (error.message?.includes('PetNFT does not exist')) {
        alert('❌ Pet ID does not exist');
      } else {
        alert(`❌ Failed to pay premium: ${error.message || 'Unknown error'}`);
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
        <p className="text-red-600">Please connect your wallet to view the pool.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-foreground mb-6">Insurance Pool</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-green-50 rounded-lg shadow-lg p-6">
          <p className="text-sm text-gray-600">Total Pool Balance</p>
          <p className="text-4xl font-bold text-green-600 mt-2">
            {(parseInt(poolBalance) / 10 ** 18).toFixed(2)} $GUARD
          </p>
        </div>

        <div className="bg-blue-50 rounded-lg shadow-lg p-6">
          <p className="text-sm text-gray-600">How it Works</p>
          <ul className="mt-2 space-y-2 text-sm text-gray-700">
            <li>• Contribute $GUARD tokens to the pool</li>
            <li>• Earn $PAW governance tokens</li>
            <li>• Vote on insurance claims</li>
            <li>• Help secure pet healthcare</li>
          </ul>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Pay Pet Insurance Premium</h2>
        <form onSubmit={handleContribute} className="space-y-4">
          <div>
            <label htmlFor="petId" className="block text-sm font-medium text-gray-700 mb-1">
              Pet ID
            </label>
            <input
              type="number"
              id="petId"
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter pet ID"
              required
            />
          </div>
          <div>
            <label htmlFor="premiumAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Premium Amount ($GUARD)
            </label>
            <input
              type="number"
              id="premiumAmount"
              value={premiumAmount}
              onChange={(e) => setPremiumAmount(e.target.value)}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter premium amount in $GUARD"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Pay Premium'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Pool Statistics</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Contributors</p>
            <p className="text-2xl font-bold text-foreground mt-1">-</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Active Claims</p>
            <p className="text-2xl font-bold text-foreground mt-1">-</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Paid Out</p>
            <p className="text-2xl font-bold text-foreground mt-1">- $GUARD</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Pool APY</p>
            <p className="text-2xl font-bold text-foreground mt-1">-%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
