/**
 * PawGuard Configuration
 *
 * Environment modes:
 * - development: Uses local Hardhat network
 * - production: Uses Base Chain (Ethereum Layer 2)
 */

export type AppMode = 'development' | 'production';

export interface AppConfig {
  mode: AppMode;
  baseChain: {
    network: 'base-sepolia' | 'base-mainnet';
    rpcUrl: string;
    chainId: number;
  };
  ipfs: {
    useMock: boolean;
    apiUrl: string;
    gatewayUrl: string;
  };
  blockchain: {
    chainId: number;
    rpcUrl: string;
    networkName: string;
  };
}

// Get mode from environment variable or default to development
const getMode = (): AppMode => {
  const mode = process.env.NEXT_PUBLIC_APP_MODE as AppMode;
  return mode === 'production' ? 'production' : 'development';
};

const mode = getMode();

// Configuration for different modes
const configs: Record<AppMode, AppConfig> = {
  development: {
    mode: 'development',
    baseChain: {
      network: 'base-sepolia',
      rpcUrl: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    ipfs: {
      useMock: false,
      apiUrl: 'http://127.0.0.1:5001',
      gatewayUrl: 'http://127.0.0.1:8080',
    },
    blockchain: {
      chainId: 31337,
      rpcUrl: 'http://127.0.0.1:8545',
      networkName: 'Hardhat Local',
    },
  },
  production: {
    mode: 'production',
    baseChain: {
      network: (process.env.NEXT_PUBLIC_BASE_CHAIN_NETWORK as 'base-sepolia' | 'base-mainnet') || 'base-sepolia',
      rpcUrl: process.env.NEXT_PUBLIC_BASE_CHAIN_RPC_URL || 'https://base-sepolia-rpc.publicnode.com',
      chainId: 84532, // Base Sepolia chain ID
    },
    ipfs: {
      useMock: false,
      apiUrl: process.env.NEXT_PUBLIC_IPFS_API_URL || 'https://ipfs.infura.io:5001',
      gatewayUrl: process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'https://ipfs.io',
    },
    blockchain: {
      chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532'), // Base Sepolia default
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://base-sepolia-rpc.publicnode.com',
      networkName: process.env.NEXT_PUBLIC_NETWORK_NAME || 'Base Sepolia Testnet',
    },
  },
};

// Export the active configuration
export const config: AppConfig = configs[mode];

// Helper function to check if we're in development mode
export const isDevelopment = () => config.mode === 'development';

// Helper function to check if we're in production mode
export const isProduction = () => config.mode === 'production';

// Log current mode (only in browser)
if (typeof window !== 'undefined') {
  console.log(`🚀 PawGuard running in ${config.mode.toUpperCase()} mode`);
  if (isDevelopment()) {
    console.log('📝 Using local Hardhat network');
  } else {
    console.log(`🔗 Using Base Chain: ${config.baseChain.network}`);
  }
}
