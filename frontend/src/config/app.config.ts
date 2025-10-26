/**
 * PawGuard Configuration
 *
 * Environment modes:
 * - development: Uses mock Hedera DID, local IPFS
 * - production: Uses real Hedera DID SDK, production IPFS gateway
 */

export type AppMode = 'development' | 'production';

export interface AppConfig {
  mode: AppMode;
  hedera: {
    useMockDID: boolean;
    network: 'testnet' | 'mainnet';
    operatorId?: string;
    operatorKey?: string;
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
    hedera: {
      useMockDID: true,
      network: 'testnet',
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
    hedera: {
      useMockDID: false,
      network: process.env.NEXT_PUBLIC_HEDERA_NETWORK as 'testnet' | 'mainnet' || 'testnet',
      operatorId: process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID,
      operatorKey: process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY,
    },
    ipfs: {
      useMock: false,
      apiUrl: process.env.NEXT_PUBLIC_IPFS_API_URL || 'https://ipfs.infura.io:5001',
      gatewayUrl: process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'https://ipfs.io',
    },
    blockchain: {
      chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111'), // Sepolia default
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY',
      networkName: process.env.NEXT_PUBLIC_NETWORK_NAME || 'Sepolia Testnet',
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
    console.log('📝 Using mock Hedera DID and local IPFS');
  }
}
