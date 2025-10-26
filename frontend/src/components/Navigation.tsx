'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWeb3 } from '../contexts/Web3Context';

export default function Navigation() {
  const pathname = usePathname();
  const { accounts, loading } = useWeb3();

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold">
              🐾 PawGuard
            </Link>
            <div className="flex space-x-4">
              <Link
                href="/"
                className={`px-3 py-2 rounded ${pathname === '/' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
              >
                Home
              </Link>
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded ${pathname === '/dashboard' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
              >
                Dashboard
              </Link>
              <Link
                href="/pool"
                className={`px-3 py-2 rounded ${pathname === '/pool' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
              >
                Pool
              </Link>
              <Link
                href="/claims"
                className={`px-3 py-2 rounded ${pathname === '/claims' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
              >
                Claims
              </Link>
              <Link
                href="/staking"
                className={`px-3 py-2 rounded ${pathname === '/staking' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
              >
                Staking
              </Link>
              <Link
                href="/jury"
                className={`px-3 py-2 rounded ${pathname === '/jury' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
              >
                Jury
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {loading ? (
              <span className="text-sm">Loading...</span>
            ) : accounts.length > 0 ? (
              <span className="text-sm bg-blue-700 px-4 py-2 rounded">
                {accounts[0].slice(0, 6)}...{accounts[0].slice(-4)}
              </span>
            ) : (
              <span className="text-sm bg-red-600 px-4 py-2 rounded">
                Not Connected
              </span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
