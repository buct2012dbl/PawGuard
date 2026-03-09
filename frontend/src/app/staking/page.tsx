'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';

const inputClass =
  'w-full bg-black/50 border-b-2 border-white/20 px-4 h-12 text-white text-sm placeholder:text-white/30 focus:border-bitcoin focus:outline-none focus:shadow-[0_10px_20px_-10px_rgba(247,147,26,0.3)] transition-all duration-200';

const labelClass = 'block text-xs font-mono tracking-widest text-muted uppercase mb-2';

export default function Staking() {
  const { accounts, contracts, loading: web3Loading } = useWeb3();
  const [pawBalance, setPawBalance] = useState('0');
  const [pawStake, setPawStake] = useState('0');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const currentAccount = accounts[0];

  useEffect(() => {
    if (contracts && currentAccount) fetchStakingData();
  }, [contracts, currentAccount]);

  const fetchStakingData = async () => {
    try {
      const balance = await contracts.pawToken.balanceOf(currentAccount);
      setPawBalance(String(balance));
      const stake = await contracts.pawPool.pawStakes(currentAccount);
      setPawStake(String(stake));
    } catch (error) {
      console.error('Error fetching staking data:', error);
    }
  };

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) { alert('Please enter a valid amount to stake'); return; }
    setLoading(true);
    try {
      const amount = ethers.parseEther(stakeAmount);
      const { getSigner } = await import('../../utils/web3Ethers');
      const signer = await getSigner();
      if (!signer) throw new Error('No signer available. Please connect your wallet.');

      const pawTokenWithSigner = contracts.pawToken.connect(signer);
      const approveTx = await pawTokenWithSigner.approve(contracts.pawPool.address, amount);
      await approveTx.wait();

      const pawPoolWithSigner = contracts.pawPool.connect(signer);
      const stakeTx = await pawPoolWithSigner.stakePaw(amount);
      await stakeTx.wait();

      alert(`✅ Successfully staked ${stakeAmount} PAW tokens!`);
      setStakeAmount('');
      fetchStakingData();
    } catch (error: any) {
      alert(`Failed to stake: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) { alert('Please enter a valid amount to unstake'); return; }

    const amount = ethers.parseEther(unstakeAmount);
    if (amount > BigInt(pawStake)) { alert('Cannot unstake more than your current stake'); return; }

    setLoading(true);
    try {
      const { getSigner } = await import('../../utils/web3Ethers');
      const signer = await getSigner();
      if (!signer) throw new Error('No signer available. Please connect your wallet.');

      const pawPoolWithSigner = contracts.pawPool.connect(signer);
      const unstakeTx = await pawPoolWithSigner.unstakePaw(amount);
      await unstakeTx.wait();

      alert(`✅ Successfully unstaked ${unstakeAmount} PAW tokens!`);
      setUnstakeAmount('');
      fetchStakingData();
    } catch (error: any) {
      alert(`Failed to unstake: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pawBalanceNum = parseInt(pawBalance) / 10 ** 18;
  const pawStakeNum = parseInt(pawStake) / 10 ** 18;
  const isEligible = parseInt(pawStake) > 0;

  if (web3Loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-bitcoin/20"></div>
            <div className="absolute inset-0 rounded-full border-t-2 border-bitcoin animate-spin"></div>
          </div>
          <p className="font-mono text-xs tracking-widest text-muted uppercase">Loading Staking...</p>
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
          <p className="text-muted text-sm">Connect your wallet to stake PAW tokens.</p>
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
          PAW Token <span className="bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent">Staking</span>
        </h1>
      </div>

      {/* Jury Eligibility Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-bitcoin-dark/20 to-bitcoin/10 border border-bitcoin/30 rounded-2xl p-8 mb-10 shadow-glow-orange">
        {/* Ambient glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-bitcoin opacity-10 blur-[60px] rounded-full pointer-events-none"></div>

        <div className="flex items-start gap-4">
          <div className="bg-bitcoin/20 border border-bitcoin/40 rounded-xl p-3 flex-shrink-0">
            <svg className="w-6 h-6 text-bitcoin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-bold text-xl text-white mb-1">Become a Jury Member</h2>
            <p className="text-muted text-sm mb-5">
              Stake your $PAW tokens to become eligible for jury duty. Review insurance claims and earn rewards for participating in governance.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  icon: (
                    <svg className="w-4 h-4 text-bitcoin flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                  ),
                  title: 'Earn Rewards', desc: 'Earn 5 PAW per approved claim vote'
                },
                {
                  icon: (
                    <svg className="w-4 h-4 text-bitcoin flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  ),
                  title: 'Protect Owners', desc: 'Ensure fair claim decisions'
                },
                {
                  icon: (
                    <svg className="w-4 h-4 text-bitcoin flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                    </svg>
                  ),
                  title: 'Decentralized', desc: 'Participate in DeFi governance'
                },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  {icon}
                  <div>
                    <p className="font-mono text-xs text-bitcoin tracking-wider uppercase">{title}</p>
                    <p className="text-muted text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Balance Stats */}
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        <div className="bg-surface border border-white/10 rounded-2xl p-6 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300">
          <p className="font-mono text-xs tracking-widest text-muted uppercase mb-3">PAW Balance</p>
          <p className="font-heading font-bold text-3xl text-white">{pawBalanceNum.toFixed(2)}</p>
          <p className="font-mono text-xs text-muted mt-2 tracking-wider">Available to stake</p>
        </div>

        <div className={`bg-surface border rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 ${
          isEligible
            ? 'border-bitcoin/40 hover:border-bitcoin hover:shadow-glow-orange'
            : 'border-white/10 hover:border-bitcoin/50 hover:shadow-card-hover'
        }`}>
          <p className="font-mono text-xs tracking-widest text-muted uppercase mb-3">Staked PAW</p>
          <p className={`font-heading font-bold text-3xl ${isEligible ? 'bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent' : 'text-white'}`}>
            {pawStakeNum.toFixed(2)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isEligible ? 'bg-gold animate-pulse' : 'bg-muted'}`}></div>
            <p className={`font-mono text-xs tracking-wider uppercase ${isEligible ? 'text-gold' : 'text-muted'}`}>
              {isEligible ? 'Jury Eligible' : 'Stake to Qualify'}
            </p>
          </div>
        </div>

        <div className="bg-surface border border-white/10 rounded-2xl p-6 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300">
          <p className="font-mono text-xs tracking-widest text-muted uppercase mb-3">Total Value</p>
          <p className="font-heading font-bold text-3xl text-white">
            {((parseInt(pawBalance) + parseInt(pawStake)) / 10 ** 18).toFixed(2)}
          </p>
          <p className="font-mono text-xs text-muted mt-2 tracking-wider">PAW + Staked</p>
        </div>
      </div>

      {/* Stake / Unstake Forms */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {/* Stake */}
        <div className="bg-surface border border-white/10 rounded-2xl p-8 hover:border-bitcoin/30 transition-all duration-300">
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-bitcoin/20 border border-bitcoin/40 rounded-xl p-3 flex-shrink-0">
              <svg className="w-5 h-5 text-bitcoin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-white">Stake PAW</h2>
              <p className="text-muted text-sm mt-1">Lock tokens and earn jury rewards</p>
            </div>
          </div>

          <form onSubmit={handleStake} className="space-y-5">
            <div>
              <label htmlFor="stakeAmount" className={labelClass}>Amount to Stake</label>
              <div className="relative">
                <input
                  type="number" id="stakeAmount" value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  step="0.01" min="0" placeholder="0.00" className={inputClass} required
                />
                <button
                  type="button"
                  onClick={() => setStakeAmount(pawBalanceNum.toString())}
                  className="absolute right-0 top-1/2 -translate-y-1/2 px-3 h-7 bg-bitcoin/20 hover:bg-bitcoin/30 border border-bitcoin/40 rounded-lg font-mono text-xs text-bitcoin uppercase tracking-wider transition-all duration-200"
                >
                  MAX
                </button>
              </div>
              <p className="font-mono text-xs text-muted mt-2">
                Available: <span className="text-white">{pawBalanceNum.toFixed(2)}</span> PAW
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || parseInt(pawBalance) === 0}
              className="w-full bg-gradient-to-r from-bitcoin-dark to-bitcoin text-white font-mono font-semibold tracking-wider uppercase h-12 rounded-full shadow-glow-orange hover:shadow-glow-orange-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></div>
                  Staking...
                </span>
              ) : 'Stake PAW Tokens'}
            </button>
          </form>

          <div className="mt-5 p-4 bg-bitcoin/5 border border-bitcoin/20 rounded-xl">
            <p className="font-mono text-xs text-muted">
              <span className="text-bitcoin">Note:</span> Staking requires two transactions — approval then staking. Confirm both in your wallet.
            </p>
          </div>
        </div>

        {/* Unstake */}
        <div className="bg-surface border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-300">
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex-shrink-0">
              <svg className="w-5 h-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 12V22H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
              </svg>
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-white">Unstake PAW</h2>
              <p className="text-muted text-sm mt-1">Withdraw staked tokens from the pool</p>
            </div>
          </div>

          <form onSubmit={handleUnstake} className="space-y-5">
            <div>
              <label htmlFor="unstakeAmount" className={labelClass}>Amount to Unstake</label>
              <div className="relative">
                <input
                  type="number" id="unstakeAmount" value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  step="0.01" min="0" placeholder="0.00" className={inputClass} required
                />
                <button
                  type="button"
                  onClick={() => setUnstakeAmount(pawStakeNum.toString())}
                  className="absolute right-0 top-1/2 -translate-y-1/2 px-3 h-7 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg font-mono text-xs text-muted uppercase tracking-wider transition-all duration-200"
                >
                  MAX
                </button>
              </div>
              <p className="font-mono text-xs text-muted mt-2">
                Staked: <span className="text-white">{pawStakeNum.toFixed(2)}</span> PAW
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || parseInt(pawStake) === 0}
              className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/20 hover:border-white/40 font-mono font-semibold tracking-wider uppercase h-12 rounded-full transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></div>
                  Unstaking...
                </span>
              ) : 'Unstake PAW Tokens'}
            </button>
          </form>

          <div className="mt-5 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <p className="font-mono text-xs text-muted">
              <span className="text-red-400">Warning:</span> Unstaking to zero will disqualify you from future jury selections.
            </p>
          </div>
        </div>
      </div>

      {/* How Jury Duty Works */}
      <div className="bg-surface border border-white/10 rounded-2xl p-8">
        <h2 className="font-heading font-bold text-2xl text-white mb-8">How Jury Duty Works</h2>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Selection Process */}
          <div>
            <p className="font-mono text-xs tracking-widest text-bitcoin uppercase mb-5">Selection Process</p>
            <div className="space-y-4">
              {[
                { n: '01', text: 'Stake any amount of PAW tokens to join the eligible juror pool' },
                { n: '02', text: 'When a claim is submitted, 21 jurors are randomly selected from stakers' },
                { n: '03', text: 'Selected jurors have 3 days to review medical records and vote' },
                { n: '04', text: 'If 2/3 majority approve, the claim is paid out automatically' },
              ].map(({ n, text }) => (
                <div key={n} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-bitcoin/20 border border-bitcoin/40 rounded-lg flex items-center justify-center">
                    <span className="font-mono text-xs text-bitcoin font-bold">{n}</span>
                  </div>
                  <p className="text-muted text-sm leading-relaxed pt-1">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Rewards */}
          <div>
            <p className="font-mono text-xs tracking-widest text-bitcoin uppercase mb-5">Rewards Structure</p>
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <p className="font-mono text-xs tracking-wider text-emerald-400 uppercase">Approved Claims</p>
                </div>
                <p className="font-heading font-bold text-2xl text-white">+5 PAW</p>
                <p className="text-muted text-xs mt-1">per approved claim you vote to approve</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-muted rounded-full"></div>
                  <p className="font-mono text-xs tracking-wider text-muted uppercase">Rejected Claims</p>
                </div>
                <p className="font-heading font-bold text-2xl text-muted">No Reward</p>
                <p className="text-muted text-xs mt-1">no tokens earned for rejected claims</p>
              </div>

              <p className="font-mono text-xs text-muted p-4 bg-black/30 rounded-xl border border-white/5">
                <span className="text-bitcoin">Important:</span> You only earn rewards if you vote to approve AND the claim is approved by the jury majority.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
