'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWeb3 } from '../contexts/Web3Context';

export default function Navigation() {
  const pathname = usePathname();
  const { accounts, loading } = useWeb3();

  const navLinks = [
    { href: '/', label: 'HOME' },
    { href: '/dashboard', label: 'DASHBOARD' },
    { href: '/pool', label: 'POOL' },
    { href: '/claims', label: 'CLAIMS' },
    { href: '/staking', label: 'STAKING' },
    { href: '/jury', label: 'JURY' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-bitcoin/20 blur-xl rounded-full group-hover:bg-bitcoin/40 transition-all duration-300"></div>
              <svg className="relative w-7 h-7 text-bitcoin" viewBox="0 0 24 24" fill="currentColor">
                <ellipse cx="9" cy="4.5" rx="2" ry="2.5"/>
                <ellipse cx="15" cy="4.5" rx="2" ry="2.5"/>
                <ellipse cx="5.5" cy="9" rx="1.75" ry="2.25"/>
                <ellipse cx="18.5" cy="9" rx="1.75" ry="2.25"/>
                <path d="M12 11c-3 0-5.5 1.8-5.5 4.5 0 2 1.6 3.5 3.8 3.5h3.4c2.2 0 3.8-1.5 3.8-3.5C17.5 12.8 15 11 12 11z"/>
              </svg>
            </div>
            <span className="font-heading font-bold text-2xl tracking-tight">
              Paw<span className="text-gradient">Guard</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  font-mono text-xs tracking-widest px-4 py-2 rounded-lg
                  transition-all duration-300
                  ${pathname === link.href
                    ? 'bg-gradient-to-r from-bitcoin-dark to-bitcoin text-white shadow-glow-orange'
                    : 'text-muted hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Wallet Status */}
          <div className="flex items-center">
            {loading ? (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-surface border border-white/10">
                <div className="w-2 h-2 bg-bitcoin rounded-full animate-ping"></div>
                <span className="font-mono text-xs text-muted">CONNECTING...</span>
              </div>
            ) : accounts.length > 0 ? (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-bitcoin-dark/20 to-bitcoin/20 border border-bitcoin/50 shadow-glow-orange">
                <div className="w-2 h-2 bg-gold rounded-full animate-pulse"></div>
                <span className="font-mono text-xs text-white">
                  {accounts[0].slice(0, 6)}...{accounts[0].slice(-4)}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-red-900/20 border border-red-500/50">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="font-mono text-xs text-red-400">NOT CONNECTED</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
