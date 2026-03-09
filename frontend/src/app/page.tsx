'use client';

import Link from 'next/link';
import { useWeb3 } from '../contexts/Web3Context';

export default function Home() {
  const { loading, error, accounts } = useWeb3();

  return (
    <div className="min-h-screen bg-void">
      {/* Hero Section with Grid Pattern */}
      <section className="relative overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-50"></div>

        {/* Radial Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-bitcoin opacity-10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold opacity-10 blur-[120px] rounded-full"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center space-y-8">
            {/* Hero Title */}
            <h1 className="font-heading font-bold text-4xl sm:text-5xl md:text-7xl leading-tight">
              Decentralized Pet Insurance
              <br />
              <span className="text-gradient">Powered by Blockchain</span>
            </h1>

            {/* Hero Description */}
            <p className="text-lg md:text-xl text-muted max-w-3xl mx-auto leading-relaxed">
              Protect your pets with transparent, community-governed insurance.
              Immutable health records, fair premiums, and instant payouts on Base Chain.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
              <Link
                href="/dashboard"
                className="group relative px-8 py-4 bg-gradient-to-r from-bitcoin-dark to-bitcoin text-white font-mono text-sm tracking-widest rounded-full shadow-glow-orange hover:shadow-glow-orange-lg hover:scale-105 transition-all duration-300"
              >
                <span className="relative z-10">GET STARTED</span>
              </Link>
              <Link
                href="/pool"
                className="px-8 py-4 bg-transparent border-2 border-white/20 text-white font-mono text-sm tracking-widest rounded-full hover:border-white hover:bg-white/10 transition-all duration-300"
              >
                VIEW POOL
              </Link>
            </div>

            {/* Connection Status */}
            {loading && (
              <div className="flex items-center justify-center space-x-3 pt-8">
                <div className="w-3 h-3 bg-bitcoin rounded-full animate-ping"></div>
                <p className="font-mono text-sm text-muted">Connecting to blockchain...</p>
              </div>
            )}

            {error && (
              <div className="max-w-md mx-auto mt-8 p-6 glass-card border-red-500/50 rounded-2xl">
                <p className="font-mono text-sm text-red-400 mb-2">CONNECTION ERROR</p>
                <p className="text-sm text-muted">{error}</p>
                <p className="text-xs text-muted mt-3">
                  Make sure MetaMask is installed and connected to Base Chain.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-24 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Pet NFT Registry Card */}
            <div className="group relative bg-surface rounded-2xl border border-white/10 p-8 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-bitcoin/50 rounded-tl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-bitcoin/50 rounded-br-2xl"></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-bitcoin/20 border border-bitcoin/50 rounded-lg">
                    <svg className="w-6 h-6 text-bitcoin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  </div>
                  <h2 className="font-heading font-semibold text-2xl">Pet NFT Registry</h2>
                </div>

                <p className="text-muted mb-6 leading-relaxed">
                  Register your pets as unique NFTs with their medical records and breeding information stored on-chain with IPFS integration.
                </p>

                <Link
                  href="/dashboard"
                  className="inline-flex items-center space-x-2 font-mono text-sm text-bitcoin hover:text-gold transition-colors"
                >
                  <span>GO TO DASHBOARD</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Insurance Pool Card */}
            <div className="group relative bg-surface rounded-2xl border border-white/10 p-8 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300">
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-gold/50 rounded-tl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-gold/50 rounded-br-2xl"></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-gold/20 border border-gold/50 rounded-lg">
                    <svg className="w-6 h-6 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                    </svg>
                  </div>
                  <h2 className="font-heading font-semibold text-2xl">Insurance Pool</h2>
                </div>

                <p className="text-muted mb-6 leading-relaxed">
                  View pool statistics and manage your insurance premiums with our three-tiered fund management system.
                </p>

                <Link
                  href="/pool"
                  className="inline-flex items-center space-x-2 font-mono text-sm text-gold hover:text-bitcoin transition-colors"
                >
                  <span>VIEW POOL</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Submit Claims Card */}
            <div className="group relative bg-surface rounded-2xl border border-white/10 p-8 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300">
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-bitcoin/50 rounded-tl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-bitcoin/50 rounded-br-2xl"></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-bitcoin/20 border border-bitcoin/50 rounded-lg">
                    <svg className="w-6 h-6 text-bitcoin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                    </svg>
                  </div>
                  <h2 className="font-heading font-semibold text-2xl">Submit Claims</h2>
                </div>

                <p className="text-muted mb-6 leading-relaxed">
                  Submit insurance claims for your pets and track the voting process by the community jury.
                </p>

                <Link
                  href="/claims"
                  className="inline-flex items-center space-x-2 font-mono text-sm text-bitcoin hover:text-gold transition-colors"
                >
                  <span>VIEW CLAIMS</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Tokens Card */}
            <div className="group relative bg-surface rounded-2xl border border-white/10 p-8 hover:-translate-y-1 hover:border-bitcoin/50 hover:shadow-card-hover transition-all duration-300">
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-gold/50 rounded-tl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-gold/50 rounded-br-2xl"></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-gold/20 border border-gold/50 rounded-lg">
                    <svg className="w-6 h-6 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </div>
                  <h2 className="font-heading font-semibold text-2xl">Dual Token System</h2>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start space-x-2">
                    <span className="font-mono text-bitcoin font-semibold">$PAW:</span>
                    <span className="text-muted text-sm">Governance token for staking and earning rewards</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-mono text-gold font-semibold">$GUARD:</span>
                    <span className="text-muted text-sm">Stablecoin for pool contributions and payouts</span>
                  </div>
                </div>

                <Link
                  href="/staking"
                  className="inline-flex items-center space-x-2 font-mono text-sm text-gold hover:text-bitcoin transition-colors"
                >
                  <span>START STAKING</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jury Governance Section */}
      <section className="relative py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-5xl mb-4">
              Decentralized <span className="text-gradient">Jury Governance</span>
            </h2>
            <p className="text-muted text-lg max-w-2xl mx-auto">
              Community-powered claim reviews with transparent voting and instant rewards
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Stake & Earn Card */}
            <div className="relative glass-card rounded-2xl p-8 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-bitcoin/10 to-transparent"></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-4 bg-bitcoin/20 border border-bitcoin/50 rounded-full">
                    <svg className="w-7 h-7 text-bitcoin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                      <line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/>
                      <line x1="8" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="16" y2="12"/>
                    </svg>
                  </div>
                  <h3 className="font-heading font-bold text-2xl">Stake & Earn</h3>
                </div>

                <p className="text-muted mb-6 leading-relaxed">
                  Stake your $PAW tokens to become eligible for jury duty. Earn 5 PAW tokens for each approved claim you vote on.
                </p>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start space-x-3">
                    <span className="text-bitcoin mt-1">✓</span>
                    <span className="text-sm text-muted">No minimum stake required</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-bitcoin mt-1">✓</span>
                    <span className="text-sm text-muted">Random selection ensures fairness</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-bitcoin mt-1">✓</span>
                    <span className="text-sm text-muted">Earn rewards for participation</span>
                  </li>
                </ul>

                <Link
                  href="/staking"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-bitcoin-dark to-bitcoin text-white font-mono text-xs tracking-widest rounded-full shadow-glow-orange hover:shadow-glow-orange-lg hover:scale-105 transition-all duration-300"
                >
                  STAKE NOW
                </Link>
              </div>
            </div>

            {/* Vote on Claims Card */}
            <div className="relative glass-card rounded-2xl p-8 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent"></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-4 bg-gold/20 border border-gold/50 rounded-full">
                    <svg className="w-7 h-7 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v18M3 6l9-3 9 3M5 10l-2 5h4L5 10zM19 10l-2 5h4l-2-5zM3 21h18"/>
                    </svg>
                  </div>
                  <h3 className="font-heading font-bold text-2xl">Vote on Claims</h3>
                </div>

                <p className="text-muted mb-6 leading-relaxed">
                  Review veterinary diagnoses and vote on claim validity. 21 jurors per claim, 2/3 majority required for approval.
                </p>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-start space-x-3">
                    <span className="text-gold mt-1">✓</span>
                    <span className="text-sm text-muted">Anonymous voting protects privacy</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-gold mt-1">✓</span>
                    <span className="text-sm text-muted">Review evidence and medical records</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-gold mt-1">✓</span>
                    <span className="text-sm text-muted">Instant rewards upon completion</span>
                  </li>
                </ul>

                <Link
                  href="/jury"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-gold/80 to-bitcoin text-white font-mono text-xs tracking-widest rounded-full shadow-glow-gold hover:shadow-glow-orange-lg hover:scale-105 transition-all duration-300"
                >
                  JOIN JURY
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Timeline */}
      <section className="relative py-24 bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-5xl mb-4">
              How It <span className="text-gradient">Works</span>
            </h2>
            <p className="text-muted text-lg">Simple, transparent, and automated</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                num: '01',
                icon: (
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <ellipse cx="9" cy="4.5" rx="2" ry="2.5"/>
                    <ellipse cx="15" cy="4.5" rx="2" ry="2.5"/>
                    <ellipse cx="5.5" cy="9" rx="1.75" ry="2.25"/>
                    <ellipse cx="18.5" cy="9" rx="1.75" ry="2.25"/>
                    <path d="M12 11c-3 0-5.5 1.8-5.5 4.5 0 2 1.6 3.5 3.8 3.5h3.4c2.2 0 3.8-1.5 3.8-3.5C17.5 12.8 15 11 12 11z"/>
                  </svg>
                ),
                title: 'Register Pet', desc: 'Create NFT identity with health records'
              },
              {
                num: '02',
                icon: (
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                ),
                title: 'Join Pool', desc: 'Pay premium based on risk assessment'
              },
              {
                num: '03',
                icon: (
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                  </svg>
                ),
                title: 'Submit Claim', desc: 'Upload vet diagnosis when needed'
              },
              {
                num: '04',
                icon: (
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ),
                title: 'Get Paid', desc: 'Jury votes, smart contract pays instantly'
              },
            ].map((step, idx) => (
              <div key={idx} className="relative text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-bitcoin-dark to-bitcoin rounded-full mb-4 shadow-glow-orange">
                  {step.icon}
                </div>
                <div className="font-mono text-xs text-bitcoin tracking-widest mb-2">{step.num}</div>
                <h3 className="font-heading font-semibold text-xl mb-2">{step.title}</h3>
                <p className="text-sm text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Connected Account Display */}
      {accounts.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="glass-card rounded-2xl p-8 text-center border-bitcoin/50">
              <p className="font-mono text-xs text-muted tracking-widest mb-3">CONNECTED ACCOUNT</p>
              <p className="font-mono text-lg text-white">
                {accounts[0]}
              </p>
              <div className="flex items-center justify-center space-x-2 mt-4">
                <div className="w-2 h-2 bg-gold rounded-full animate-pulse"></div>
                <span className="font-mono text-xs text-gold">ACTIVE</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}