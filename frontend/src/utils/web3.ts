import { config } from '../config/app.config';

// Re-export ethers utilities for backward compatibility
export { getProvider, getSigner, getContracts } from './web3Ethers';

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
