import { ethers } from 'ethers';
import PetNFTArtifact from '../artifacts/contracts/PetNFT.sol/PetNFT.json';
import PawGuardTokenArtifact from '../artifacts/contracts/PawGuardToken.sol/PawGuardToken.json';
import GuardStableCoinArtifact from '../artifacts/contracts/GuardStableCoin.sol/GuardStableCoin.json';
import PawPoolArtifact from '../artifacts/contracts/PawPool.sol/PawPool.json';
import PetIdentityArtifact from '../artifacts/contracts/PetIdentity.sol/PetIdentity.json';
import { config } from '../config/app.config';

// Multiple high-quality RPC endpoints for fallback
const RPC_ENDPOINTS = [
  {
    url: 'https://base-sepolia-rpc.publicnode.com',
    name: 'PublicNode',
    priority: 1
  },
  {
    url: 'https://sepolia.base.org',
    name: 'Base Official',
    priority: 2
  },
  {
    url: 'https://base-sepolia.rpc.thirdweb.com',
    name: 'ThirdWeb',
    priority: 3
  },
  {
    url: 'https://base-sepolia.g.alchemy.com/v2/demo',
    name: 'Alchemy (demo)',
    priority: 4
  },
];

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 500, // milliseconds
  maxDelay: 5000,
};

// Track RPC endpoint health
const endpointHealth = new Map<string, { failures: number; lastFailTime: number }>();

const recordEndpointFailure = (url: string) => {
  const current = endpointHealth.get(url) || { failures: 0, lastFailTime: 0 };
  current.failures++;
  current.lastFailTime = Date.now();
  endpointHealth.set(url, current);
  console.warn(`⚠️ Endpoint ${url} failed (${current.failures} times)`);
};

const isEndpointHealthy = (url: string) => {
  const health = endpointHealth.get(url);
  if (!health || health.failures === 0) return true;
  
  // Assume endpoint is dead for 30 seconds after first failure
  const timeSinceFailure = Date.now() - health.lastFailTime;
  return timeSinceFailure > 30000;
};

// Retry helper with exponential backoff
const retryWithBackoff = async (
  fn: () => Promise<any>,
  attempt = 1
): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    if (attempt >= RETRY_CONFIG.maxAttempts) {
      throw error;
    }
    
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
      RETRY_CONFIG.maxDelay
    );
    
    console.warn(`⚠️ Request failed, retrying in ${delay}ms (attempt ${attempt}/${RETRY_CONFIG.maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(fn, attempt + 1);
  }
};

// Create ethers provider with intelligent fallback support
export const createFallbackProvider = (): ethers.JsonRpcProvider => {
  // Get healthy endpoints in priority order
  const healthyEndpoints = RPC_ENDPOINTS.filter(ep => isEndpointHealthy(ep.url));
  const primaryEndpoint = healthyEndpoints[0] || RPC_ENDPOINTS[0];
  
  console.log(`✅ Creating provider with ${primaryEndpoint.name} (${primaryEndpoint.url})`);
  const provider = new ethers.JsonRpcProvider(primaryEndpoint.url, 84532);
  
  // Wrap the provider's send method with retry and fallback logic
  const originalSend = provider.send.bind(provider);
  let currentEndpointIndex = 0;
  
  provider.send = async (method: string, params: any[]): Promise<any> => {
    return retryWithBackoff(async () => {
      try {
        const result = await originalSend(method, params);
        return result;
      } catch (error: any) {
        console.error(`❌ RPC call failed on ${primaryEndpoint.name}:`, error.message);
        recordEndpointFailure(primaryEndpoint.url);
        
        // Try fallback endpoints
        for (const endpoint of RPC_ENDPOINTS) {
          if (endpoint.url === primaryEndpoint.url) continue; // Skip current
          if (!isEndpointHealthy(endpoint.url)) continue; // Skip unhealthy
          
          try {
            console.log(`🔄 Trying fallback RPC: ${endpoint.name}`);
            const fallbackProvider = new ethers.JsonRpcProvider(endpoint.url, 84532);
            const result = await fallbackProvider.send(method, params);
            console.log(`✅ Success with ${endpoint.name}`);
            return result;
          } catch (fallbackError: any) {
            console.warn(`⚠️ Fallback ${endpoint.name} failed:`, fallbackError.message);
            recordEndpointFailure(endpoint.url);
            continue;
          }
        }
        
        throw error;
      }
    });
  };
  
  return provider;
};

// Lazy IPFS client initialization
let ipfsClient: any = null;
const getIpfsClient = async () => {
  if (typeof window === 'undefined') {
    throw new Error('IPFS is only available on the client side');
  }

  if (config.ipfs.useMock) {
    // Mock IPFS for testing
    return {
      add: async (data: string) => {
        console.log('📝 Mock IPFS: Storing data', data.substring(0, 50) + '...');
        return { cid: { toString: () => `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` } };
      },
      cat: async function* (hash: string) {
        console.log('📝 Mock IPFS: Retrieving data for', hash);
        yield new TextEncoder().encode(JSON.stringify({ name: 'Mock Pet', breed: 'Mock Breed', age: 0 }));
      }
    };
  }

  if (!ipfsClient) {
    const { create } = await import('ipfs-http-client');
    const url = new URL(config.ipfs.apiUrl);
    ipfsClient = create({
      host: url.hostname,
      port: url.port ? parseInt(url.port) : (url.protocol === 'https:' ? 443 : 80),
      protocol: url.protocol.replace(':', '')
    });
    console.log(`🌐 Connected to IPFS at ${config.ipfs.apiUrl}`);
  }
  return ipfsClient;
};

// Get ethers provider with fallback support
let cachedProvider: ethers.JsonRpcProvider | null = null;

export const getProvider = (): ethers.JsonRpcProvider => {
  if (!cachedProvider) {
    cachedProvider = createFallbackProvider();
  }
  return cachedProvider;
};

// Get ethers signer (for MetaMask or other injected providers)
export const getSigner = async (): Promise<ethers.Signer | null> => {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null;
  }

  try {
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await browserProvider.getSigner();
    console.log('✅ Connected via MetaMask');
    return signer;
  } catch (error) {
    console.error('❌ Failed to get signer:', error);
    return null;
  }
};

// Get Web3 instance (for backward compatibility)
export const getWeb3 = (): Promise<any> =>
  new Promise(async (resolve, reject) => {
    try {
      const provider = getProvider();
      resolve(provider);
    } catch (error) {
      reject(error);
    }
  });

// Get contract instances
export const getContracts = async (provider?: ethers.Provider) => {
  if (!provider) {
    provider = getProvider();
  }

  // Use environment variables for contract addresses
  const petNFTAddress: string = process.env.NEXT_PUBLIC_PET_NFT_ADDRESS || '';
  const pawTokenAddress: string = process.env.NEXT_PUBLIC_PAW_TOKEN_ADDRESS || '';
  const guardTokenAddress: string = process.env.NEXT_PUBLIC_GUARD_TOKEN_ADDRESS || '';
  const pawPoolAddress: string = process.env.NEXT_PUBLIC_PAW_POOL_ADDRESS || '';
  const petIdentityAddress: string = process.env.NEXT_PUBLIC_PET_IDENTITY_ADDRESS || '';

  if (!petNFTAddress || !pawTokenAddress || !guardTokenAddress || !pawPoolAddress || !petIdentityAddress) {
    throw new Error('Contract addresses not configured in environment variables');
  }

  console.log('📝 Contract Addresses:');
  console.log('  PetNFT:', petNFTAddress);
  console.log('  PAW Token:', pawTokenAddress);
  console.log('  GUARD Token:', guardTokenAddress);
  console.log('  PAW Pool:', pawPoolAddress);
  console.log('  PetIdentity:', petIdentityAddress);

  const petNFTInstance = new ethers.Contract(
    petNFTAddress,
    PetNFTArtifact.abi,
    provider
  );

  const pawTokenInstance = new ethers.Contract(
    pawTokenAddress,
    PawGuardTokenArtifact.abi,
    provider
  );

  const guardTokenInstance = new ethers.Contract(
    guardTokenAddress,
    GuardStableCoinArtifact.abi,
    provider
  );

  const pawPoolInstance = new ethers.Contract(
    pawPoolAddress,
    PawPoolArtifact.abi,
    provider
  );

  const petIdentityInstance = new ethers.Contract(
    petIdentityAddress,
    PetIdentityArtifact.abi,
    provider
  );

  return {
    petNFT: petNFTInstance,
    pawToken: pawTokenInstance,
    guardToken: guardTokenInstance,
    pawPool: pawPoolInstance,
    petIdentity: petIdentityInstance,
    provider: provider,
  };
};

// Upload JSON to IPFS
export const uploadJsonToIpfs = async (json: any): Promise<string> => {
  const ipfs = await getIpfsClient();
  const { cid } = await ipfs.add(JSON.stringify(json));
  return cid.toString();
};

// Retrieve JSON from IPFS
export const retrieveJsonFromIpfs = async (ipfsHash: string): Promise<any> => {
  const ipfs = await getIpfsClient();
  const asyncIterator = ipfs.cat(ipfsHash);
  let content = '';
  for await (const chunk of asyncIterator) {
    content += new TextDecoder().decode(chunk);
  }
  return JSON.parse(content);
};

// TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
