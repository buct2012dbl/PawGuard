'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';

export default function Pool() {
  const { accounts, contracts, loading: web3Loading } = useWeb3();
  const [contribution, setContribution] = useState('');
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
    if (!contribution || parseFloat(contribution) <= 0) {
      alert('Please enter a valid contribution amount');
      return;
    }

    setLoading(true);
    try {
      const amount = contracts.web3.utils.toWei(contribution, 'ether');

      // First approve the pool contract
      await contracts.guardToken.methods
        .approve(contracts.pawPool.options.address, amount)
        .send({ from: currentAccount });

      // Then contribute to pool
      await contracts.pawPool.methods
        .contributeToPool(amount)
        .send({ from: currentAccount });

      alert('Contribution successful!');
      setContribution('');
      fetchPoolBalance();
    } catch (error) {
      console.error('Error contributing to pool:', error);
      alert('Failed to contribute. See console for details.');
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
        <h2 className="text-2xl font-bold text-foreground mb-4">Contribute to Pool</h2>
        <form onSubmit={handleContribute} className="space-y-4">
          <div>
            <label htmlFor="contribution" className="block text-sm font-medium text-gray-700 mb-1">
              Amount ($GUARD)
            </label>
            <input
              type="number"
              id="contribution"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              step="0.01"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter amount in $GUARD"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
          >
            {loading ? 'Contributing...' : 'Contribute to Pool'}
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
