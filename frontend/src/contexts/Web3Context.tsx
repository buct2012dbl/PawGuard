'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { getProvider, getSigner, getContracts } from '../utils/web3Ethers';

interface Web3ContextType {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  accounts: string[];
  contracts: any | null;
  loading: boolean;
  error: string | null;
}

const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  accounts: [],
  contracts: null,
  loading: true,
  error: null,
});

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [contracts, setContracts] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Get provider (with fallback RPC support)
        const providerInstance = getProvider();
        setProvider(providerInstance);

        // Get signer if MetaMask is available
        const signerInstance = await getSigner();
        setSigner(signerInstance);

        // Get accounts from signer if available
        if (signerInstance) {
          const address = await signerInstance.getAddress();
          setAccounts([address]);
          console.log(`✅ Connected account: ${address}`);
        }

        // Get contracts with provider
        const contractsInstance = await getContracts(providerInstance);
        setContracts(contractsInstance);

        setLoading(false);
      } catch (err: any) {
        console.error('❌ Error initializing Web3:', err);
        setError(err.message || 'Failed to initialize Web3');
        setLoading(false);
      }
    };

    init();

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAccounts(accounts);
        window.location.reload();
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <Web3Context.Provider value={{ provider, signer, accounts, contracts, loading, error }}>
      {children}
    </Web3Context.Provider>
  );
};
