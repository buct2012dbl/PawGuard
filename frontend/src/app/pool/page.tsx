'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../../contexts/Web3Context';
import { getTransactionUrl } from '../../config/app.config';

const inputClass =
  'w-full bg-black/50 border-b-2 border-white/20 px-4 h-12 text-white text-sm placeholder:text-white/30 focus:border-bitcoin focus:outline-none focus:shadow-[0_10px_20px_-10px_rgba(247,147,26,0.3)] transition-all duration-200';

const labelClass = 'block text-xs font-mono tracking-widest text-muted uppercase mb-2';

const primaryBtn =
  'w-full bg-gradient-to-r from-bitcoin-dark to-bitcoin text-white font-mono font-semibold tracking-wider uppercase h-12 rounded-full shadow-glow-orange hover:shadow-glow-orange-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100';

export default function Pool() {
  const { accounts, contracts, signer, loading: web3Loading } = useWeb3();

  const [petId, setPetId] = useState('1');
  const [premiumAmount, setPremiumAmount] = useState('');
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
      const immediatePool = await contracts.pawPool.immediatePayoutPool();
      const stablePool = await contracts.pawPool.stableYieldPool();
      const riskPool = await contracts.pawPool.riskReservePool();
      setPoolBalance(ethers.formatEther(immediatePool + stablePool + riskPool));
    } catch (error) {
      console.error('Error fetching pool balance:', error);
    }
  };

  const fetchPremiumPayments = async () => {
    try {
      const response = await fetch(`/api/premium-payments?owner=${currentAccount}&page=${currentPage}&pageSize=${pageSize}`);
      if (!response.ok) throw new Error('Failed to fetch premium payments');
      const data = await response.json();
      setPremiumPayments(data.payments || []);
      setTotalPayments(data.total || 0);
    } catch (error) {
      console.error('Error fetching premium payments:', error);
    }
  };

  const handlePayPremium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId || parseFloat(petId) <= 0) { alert('Please enter a valid pet ID'); return; }
    if (!premiumAmount || parseFloat(premiumAmount) <= 0) { alert('Please enter a valid premium amount'); return; }
    if (!signer) { alert('Please connect your wallet first'); return; }

    setLoading(true);
    try {
      const amount = ethers.parseEther(premiumAmount);
      const poolAddress = contracts.pawPool.target;
      const guardWithSigner = contracts.guardToken.connect(signer);
      const approveTx = await guardWithSigner.approve(poolAddress, amount);
      await approveTx.wait();

      const poolWithSigner = contracts.pawPool.connect(signer);
      const premiumTx = await poolWithSigner.payPremium(parseInt(petId), amount);
      const receipt = await premiumTx.wait();

      try {
        await fetch('/api/premium-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            petId: parseInt(petId), owner: currentAccount, amount: premiumAmount,
            transactionHash: premiumTx.hash, blockTimestamp: receipt.blockNumber,
          }),
        });
      } catch { /* non-critical */ }

      alert('✅ Pet insurance premium paid successfully!');
      setPremiumAmount('');
      setCurrentPage(1);
      fetchPoolBalance();
      fetchPremiumPayments();
    } catch (error: any) {
      if (error.code === -32002 || error.message?.includes('RPC endpoint returned too many errors')) {
        alert('⏰ RPC endpoint is rate-limited. Please try again.');
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

  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationAmount || parseFloat(donationAmount) <= 0) { alert('Please enter a valid donation amount'); return; }
    if (!signer) { alert('Please connect your wallet first'); return; }

    setLoading(true);
    try {
      const amount = ethers.parseEther(donationAmount);
      const poolAddress = contracts.pawPool.target;
      const guardWithSigner = contracts.guardToken.connect(signer);
      const approveTx = await guardWithSigner.approve(poolAddress, amount);
      await approveTx.wait();

      const poolWithSigner = contracts.pawPool.connect(signer);
      const donateTx = await poolWithSigner.contributeToPool(amount);
      await donateTx.wait();

      alert('🙏 Thank you for your donation to the insurance pool!');
      setDonationAmount('');
      fetchPoolBalance();
    } catch (error: any) {
      if (error.code === 'ACTION_REJECTED') {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-bitcoin/20"></div>
            <div className="absolute inset-0 rounded-full border-t-2 border-bitcoin animate-spin"></div>
          </div>
          <p className="font-mono text-xs tracking-widest text-muted uppercase">Loading Pool...</p>
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
          <p className="text-muted text-sm">Connect your wallet to contribute to the pool.</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalPayments / pageSize) || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="font-mono text-xs tracking-widest text-bitcoin uppercase mb-2">Protocol</p>
        <h1 className="font-heading font-bold text-4xl md:text-5xl text-white">
          Insurance <span className="bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent">Pool</span>
        </h1>
      </div>

      {/* Pool Stats */}
      <div className="grid md:grid-cols-2 gap-5 mb-10">
        <div className="bg-surface border border-white/10 rounded-2xl p-6 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300">
          <p className="font-mono text-xs tracking-widest text-muted uppercase mb-3">Total Pool Balance</p>
          <p className="font-heading font-bold text-4xl bg-gradient-to-r from-bitcoin to-gold bg-clip-text text-transparent">
            {parseFloat(poolBalance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="font-mono text-xs text-muted mt-2 tracking-wider">GUARD TOKENS</p>
        </div>

        <div className="bg-surface border border-white/10 rounded-2xl p-6 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300">
          <p className="font-mono text-xs tracking-widest text-muted uppercase mb-3">Pool Distribution</p>
          <div className="space-y-3 mt-2">
            {[
              { label: 'Immediate Payouts', pct: 30, color: 'from-bitcoin-dark to-bitcoin' },
              { label: 'Stable Yield', pct: 60, color: 'from-gold/70 to-gold' },
              { label: 'Risk Reserve', pct: 10, color: 'from-white/20 to-white/40' },
            ].map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-xs text-muted">{label}</span>
                  <span className="font-mono text-xs text-white">{pct}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {/* Pay Premium */}
        <div className="bg-surface border border-white/10 rounded-2xl p-8 hover:border-bitcoin/30 transition-all duration-300">
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-bitcoin/20 border border-bitcoin/40 rounded-xl p-3 flex-shrink-0">
              <svg className="w-5 h-5 text-bitcoin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-white">Pay Pet Insurance Premium</h2>
              <p className="text-muted text-sm mt-1">Pay coverage premium for a specific pet</p>
            </div>
          </div>

          <form onSubmit={handlePayPremium} className="space-y-6">
            <div>
              <label htmlFor="petId" className={labelClass}>Pet ID</label>
              <input
                type="number" id="petId" min="1" value={petId}
                onChange={(e) => setPetId(e.target.value)}
                placeholder="Enter your pet ID" className={inputClass} required
              />
              <p className="font-mono text-xs text-muted mt-2">The ID of the pet you want to insure</p>
            </div>
            <div>
              <label htmlFor="premiumAmount" className={labelClass}>Premium Amount (GUARD)</label>
              <input
                type="text" id="premiumAmount" value={premiumAmount}
                onChange={(e) => setPremiumAmount(e.target.value)}
                placeholder="0.00" className={inputClass} required
              />
            </div>
            <button type="submit" disabled={loading} className={primaryBtn}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></div>
                  Processing...
                </span>
              ) : 'Pay Premium'}
            </button>
          </form>

          <div className="mt-5 p-4 bg-bitcoin/5 border border-bitcoin/20 rounded-xl">
            <p className="font-mono text-xs text-muted">
              Your premium is tracked with your pet ID and goes into the insurance pool.
            </p>
          </div>
        </div>

        {/* Donate */}
        <div className="bg-surface border border-white/10 rounded-2xl p-8 hover:border-bitcoin/30 transition-all duration-300">
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-gold/20 border border-gold/40 rounded-xl p-3 flex-shrink-0">
              <svg className="w-5 h-5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
              </svg>
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-white">Donate to Pool</h2>
              <p className="text-muted text-sm mt-1">Support the entire insurance pool community</p>
            </div>
          </div>

          <form onSubmit={handleDonate} className="space-y-6">
            <div>
              <label htmlFor="donationAmount" className={labelClass}>Donation Amount (GUARD)</label>
              <input
                type="text" id="donationAmount" value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                placeholder="0.00" className={inputClass} required
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-gold/80 to-gold text-black font-mono font-semibold tracking-wider uppercase h-12 rounded-full shadow-glow-gold hover:scale-[1.02] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-t-2 border-black rounded-full animate-spin"></div>
                  Processing...
                </span>
              ) : 'Donate to Pool'}
            </button>
          </form>

          <div className="mt-5 p-4 bg-gold/5 border border-gold/20 rounded-xl">
            <p className="font-mono text-xs text-muted">
              Your donation helps fund the entire insurance pool without being tied to a specific pet.
            </p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-8 border-b border-white/10">
          <h2 className="font-heading font-bold text-2xl text-white">Premium Payment History</h2>
          <p className="text-muted text-sm mt-1">{totalPayments} total payments</p>
        </div>

        {premiumPayments.length === 0 ? (
          <div className="py-16 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
            </svg>
            <p className="font-heading font-semibold text-white mb-1">No payments yet</p>
            <p className="text-muted text-sm">Your premium payment history will appear here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Pet ID', 'Amount (GUARD)', 'Date', 'Transaction'].map((h) => (
                      <th key={h} className="px-6 py-4 text-left font-mono text-xs tracking-widest text-muted uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {premiumPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-white/5 transition-colors duration-150 group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-bitcoin">#{payment.pet_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-white">
                          {parseFloat(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-muted">
                          {new Date(payment.created_at).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={getTransactionUrl(payment.transaction_hash)}
                          target="_blank" rel="noopener noreferrer"
                          className="font-mono text-xs text-bitcoin hover:text-gold hover:underline transition-colors duration-150"
                        >
                          {payment.transaction_hash.slice(0, 8)}...{payment.transaction_hash.slice(-6)}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="pageSize" className="font-mono text-xs text-muted uppercase tracking-wider">Show</label>
                <select
                  id="pageSize" value={pageSize}
                  onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                  className="bg-black/50 border border-white/10 text-white font-mono text-xs px-3 py-1.5 rounded-lg focus:border-bitcoin focus:outline-none"
                >
                  {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="font-mono text-xs text-muted">per page</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted">
                  {premiumPayments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalPayments)} of {totalPayments}
                </span>
                <div className="flex gap-1">
                  {[
                    { label: '«', action: () => setCurrentPage(1), disabled: currentPage === 1 },
                    { label: '‹', action: () => setCurrentPage(currentPage - 1), disabled: currentPage === 1 },
                    { label: '›', action: () => setCurrentPage(currentPage + 1), disabled: currentPage >= totalPages },
                    { label: '»', action: () => setCurrentPage(totalPages), disabled: currentPage >= totalPages },
                  ].map(({ label, action, disabled }) => (
                    <button
                      key={label} onClick={action} disabled={disabled}
                      className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:border-bitcoin/50 hover:text-bitcoin font-mono text-xs text-muted transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
