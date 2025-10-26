'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Web3 from 'web3';
import { getWeb3, getContracts } from '../utils/web3';

interface Web3ContextType {
  web3: Web3 | null;
  accounts: string[];
  contracts: any | null;
  loading: boolean;
  error: string | null;
}

const Web3Context = createContext<Web3ContextType>({
  web3: null,
  accounts: [],
  contracts: null,
  loading: true,
  error: null,
});

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [contracts, setContracts] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Get Web3 instance
        const web3Instance = await getWeb3();
        setWeb3(web3Instance);

        // Get accounts
        const accountsList = await web3Instance.eth.getAccounts();
        setAccounts(accountsList);

        // Get contracts
        const contractsInstance = await getContracts(web3Instance);
        setContracts(contractsInstance);

        setLoading(false);
      } catch (err: any) {
        console.error('Error initializing Web3:', err);
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
    <Web3Context.Provider value={{ web3, accounts, contracts, loading, error }}>
      {children}
    </Web3Context.Provider>
  );
};
