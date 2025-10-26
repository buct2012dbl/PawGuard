'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '../../contexts/Web3Context';

export default function Staking() {
  const { accounts, contracts, loading: web3Loading } = useWeb3();
  const [pawBalance, setPawBalance] = useState('0');
  const [pawStake, setPawStake] = useState('0');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalStakers, setTotalStakers] = useState(0);

  const currentAccount = accounts[0];

  useEffect(() => {
    if (contracts && currentAccount) {
      fetchStakingData();
    }
  }, [contracts, currentAccount]);

  const fetchStakingData = async () => {
    try {
      // Fetch PAW balance - Web3.js v4 syntax needs explicit .call()
      const balanceResult = contracts.pawToken.methods.balanceOf(currentAccount);
      const balance = await balanceResult.call();
      setPawBalance(String(balance));

      // Fetch current stake
      const stakeResult = contracts.pawPool.methods.pawStakes(currentAccount);
      const stake = await stakeResult.call();
      setPawStake(String(stake));

      // Estimate total stakers (this is a simplified approach)
      // In production, you'd want an event listener or contract method for this
      setTotalStakers(0); // Placeholder
    } catch (error) {
      console.error('Error fetching staking data:', error);
    }
  };

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      alert('Please enter a valid amount to stake');
      return;
    }

    setLoading(true);
    try {
      const amount = contracts.web3.utils.toWei(stakeAmount, 'ether');

      // First approve the PawPool contract to spend PAW tokens
      await contracts.pawToken.methods
        .approve(contracts.pawPool._address, amount)
        .send({ from: currentAccount });

      // Then stake the tokens
      await contracts.pawPool.methods
        .stakePaw(amount)
        .send({ from: currentAccount });

      alert(`Successfully staked ${stakeAmount} PAW tokens!`);
      setStakeAmount('');
      fetchStakingData();
    } catch (error: any) {
      console.error('Error staking PAW:', error);
      alert(`Failed to stake: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      alert('Please enter a valid amount to unstake');
      return;
    }

    const amount = contracts.web3.utils.toWei(unstakeAmount, 'ether');
    const currentStake = parseInt(pawStake);

    if (parseInt(amount) > currentStake) {
      alert('Cannot unstake more than your current stake');
      return;
    }

    setLoading(true);
    try {
      await contracts.pawPool.methods
        .unstakePaw(amount)
        .send({ from: currentAccount });

      alert(`Successfully unstaked ${unstakeAmount} PAW tokens!`);
      setUnstakeAmount('');
      fetchStakingData();
    } catch (error: any) {
      console.error('Error unstaking PAW:', error);
      alert(`Failed to unstake: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const maxStake = () => {
    const balance = parseInt(pawBalance) / 10 ** 18;
    setStakeAmount(balance.toString());
  };

  const maxUnstake = () => {
    const stake = parseInt(pawStake) / 10 ** 18;
    setUnstakeAmount(stake.toString());
  };

  if (web3Loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading staking dashboard...</p>
      </div>
    );
  }

  if (!currentAccount) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">Please connect your wallet to stake PAW tokens.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-foreground mb-6">PAW Token Staking</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-blue-900 mb-2">Become a Jury Member</h2>
        <p className="text-blue-800">
          Stake your $PAW tokens to become eligible for jury duty. As a juror, you'll review insurance claims
          and earn rewards for participating in the governance process.
        </p>
        <ul className="mt-4 space-y-2 text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Earn <strong>5 PAW tokens</strong> for each approved claim you vote on</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Help protect pet owners by ensuring fair claim decisions</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Participate in decentralized insurance governance</span>
          </li>
        </ul>
      </div>

      {/* Balance Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Your PAW Balance</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {(parseInt(pawBalance) / 10 ** 18).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Available to stake</p>
        </div>
        <div className="bg-purple-50 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Your Staked PAW</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {(parseInt(pawStake) / 10 ** 18).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {parseInt(pawStake) > 0 ? '✓ Eligible for jury duty' : 'Stake to become eligible'}
          </p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Staked Value</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {((parseInt(pawBalance) + parseInt(pawStake)) / 10 ** 18).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">PAW + Staked</p>
        </div>
      </div>

      {/* Staking Form */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Stake */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Stake PAW Tokens</h2>
          <form onSubmit={handleStake} className="space-y-4">
            <div>
              <label htmlFor="stakeAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount to Stake
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="stakeAmount"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={maxStake}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1 rounded"
                >
                  MAX
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Available: {(parseInt(pawBalance) / 10 ** 18).toFixed(2)} PAW
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || parseInt(pawBalance) === 0}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'Staking...' : 'Stake PAW'}
            </button>
          </form>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Staking requires two transactions: approval and staking.
              Make sure to confirm both transactions in your wallet.
            </p>
          </div>
        </div>

        {/* Unstake */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Unstake PAW Tokens</h2>
          <form onSubmit={handleUnstake} className="space-y-4">
            <div>
              <label htmlFor="unstakeAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount to Unstake
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="unstakeAmount"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={maxUnstake}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1 rounded"
                >
                  MAX
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Staked: {(parseInt(pawStake) / 10 ** 18).toFixed(2)} PAW
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || parseInt(pawStake) === 0}
              className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'Unstaking...' : 'Unstake PAW'}
            </button>
          </form>

          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-xs text-red-800">
              <strong>Warning:</strong> Unstaking will make you ineligible for future jury selections
              if your stake reaches zero.
            </p>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">How Jury Duty Works</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Selection Process</h3>
            <ol className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="font-bold mr-2">1.</span>
                <span>Stake any amount of PAW tokens to join the eligible juror pool</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">2.</span>
                <span>When a claim is submitted, 21 jurors are randomly selected from stakers</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">3.</span>
                <span>Selected jurors have 3 days to review medical records and vote</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold mr-2">4.</span>
                <span>If 2/3 majority approve, the claim is paid out automatically</span>
              </li>
            </ol>
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800 mb-2">Rewards</h3>
            <div className="space-y-3 text-gray-700">
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="font-semibold text-green-800">Approved Claims</p>
                <p className="text-sm">Earn 5 PAW tokens per approved claim you vote for</p>
              </div>
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="font-semibold text-gray-800">Rejected Claims</p>
                <p className="text-sm">No rewards for rejected claims</p>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                <strong>Important:</strong> You only earn rewards if you vote to approve a claim
                AND the claim gets approved by the jury majority.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
