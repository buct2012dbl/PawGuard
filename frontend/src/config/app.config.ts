/**
 * PawGuard Configuration
 *
 * Environment modes:
 * - development: Uses local Hardhat network
 * - production: Uses Base Chain (Ethereum Layer 2)
 */

export type AppMode = 'development' | 'production';
export type IpfsMode = 'localhost' | 'infura' | 'mock';

export interface AppConfig {
  mode: AppMode;
  baseChain: {
    network: 'base-sepolia' | 'base-mainnet';
    rpcUrl: string;
    chainId: number;
  };
  ipfs: {
    mode: IpfsMode;
    useMock: boolean;
    apiUrl: string;
    gatewayUrl: string;
    projectId?: string; // For Infura
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

// Get IPFS mode from environment variable
const getIpfsMode = (): IpfsMode => {
  const ipfsMode = process.env.NEXT_PUBLIC_IPFS_MODE as IpfsMode;
  if (ipfsMode === 'infura' || ipfsMode === 'localhost' || ipfsMode === 'mock') {
    return ipfsMode;
  }
  // Default based on app mode
  const mode = getMode();
  return mode === 'production' ? 'infura' : 'localhost';
};

const mode = getMode();
const ipfsMode = getIpfsMode();

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
      mode: ipfsMode,
      useMock: ipfsMode === 'mock',
      apiUrl: getIpfsApiUrl(),
      gatewayUrl: getIpfsGatewayUrl(),
      projectId: process.env.NEXT_PUBLIC_IPFS_PROJECT_ID,
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
      mode: ipfsMode,
      useMock: ipfsMode === 'mock',
      apiUrl: getIpfsApiUrl(),
      gatewayUrl: getIpfsGatewayUrl(),
      projectId: process.env.NEXT_PUBLIC_IPFS_PROJECT_ID,
    },
    blockchain: {
      chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532'), // Base Sepolia default
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://base-sepolia-rpc.publicnode.com',
      networkName: process.env.NEXT_PUBLIC_NETWORK_NAME || 'Base Sepolia Testnet',
    },
  },
};

// Helper function to get IPFS API URL based on mode
function getIpfsApiUrl(): string {
  if (ipfsMode === 'localhost') {
    return process.env.NEXT_PUBLIC_IPFS_API_URL || 'http://127.0.0.1:5001';
  } else if (ipfsMode === 'infura') {
    return process.env.NEXT_PUBLIC_IPFS_API_URL || 'https://ipfs.infura.io:5001';
  } else {
    return 'mock://ipfs'; // Mock mode
  }
}

// Helper function to get IPFS Gateway URL based on mode
function getIpfsGatewayUrl(): string {
  if (ipfsMode === 'localhost') {
    return process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'http://127.0.0.1:8080';
  } else if (ipfsMode === 'infura') {
    return process.env.NEXT_PUBLIC_IPFS_GATEWAY_URL || 'https://ipfs.io';
  } else {
    return 'mock://gateway'; // Mock mode
  }
}

// Export the active configuration
export const config: AppConfig = configs[mode];

// Helper function to check if we're in development mode
export const isDevelopment = () => config.mode === 'development';

// Helper function to check if we're in production mode
export const isProduction = () => config.mode === 'production';

// Log current mode (only in browser)
if (typeof window !== 'undefined') {
  console.log(`🚀 PawGuard running in ${config.mode.toUpperCase()} mode`);
  console.log(`📦 IPFS mode: ${config.ipfs.mode} (${config.ipfs.apiUrl})`);
  if (isDevelopment()) {
    console.log('📝 Using local Hardhat network');
  } else {
    console.log(`🔗 Using Base Chain: ${config.baseChain.network}`);
  }
}
