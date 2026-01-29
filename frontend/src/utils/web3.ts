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
    console.log(`🌐 Connecting to IPFS at ${config.ipfs.apiUrl}...`);
    
    try {
      // Simple multiaddr format for localhost IPFS
      ipfsClient = create({
        url: config.ipfs.apiUrl
      });
      
      // Test the connection
      await ipfsClient.version();
      console.log(`✅ Connected to IPFS at ${config.ipfs.apiUrl}`);
    } catch (error) {
      console.error(`❌ Failed to connect to IPFS at ${config.ipfs.apiUrl}`, error);
      console.log('📝 Make sure IPFS daemon is running: ipfs daemon');
      throw new Error(`IPFS connection failed at ${config.ipfs.apiUrl}. Make sure your local IPFS node is running.`);
    }
  }
  return ipfsClient;
};

// Upload JSON to IPFS
export const uploadJsonToIpfs = async (json: any): Promise<string> => {
  try {
    const ipfs = await getIpfsClient();
    console.log('📤 Uploading to IPFS:', json);
    const { cid } = await ipfs.add(JSON.stringify(json));
    const hash = cid.toString();
    console.log('✅ Uploaded to IPFS:', hash);
    return hash;
  } catch (error: any) {
    console.error('❌ IPFS upload failed:', error);
    throw new Error(`IPFS upload failed: ${error.message}. Make sure your IPFS node is running at ${config.ipfs.apiUrl}`);
  }
};

// Retrieve JSON from IPFS
export const retrieveJsonFromIpfs = async (ipfsHash: string): Promise<any> => {
  try {
    const ipfs = await getIpfsClient();
    console.log('📥 Retrieving from IPFS:', ipfsHash);
    const asyncIterator = ipfs.cat(ipfsHash);
    let content = '';
    for await (const chunk of asyncIterator) {
      content += new TextDecoder().decode(chunk);
    }
    console.log('✅ Retrieved from IPFS');
    return JSON.parse(content);
  } catch (error: any) {
    console.error('❌ IPFS retrieval failed:', error);
    throw new Error(`IPFS retrieval failed for ${ipfsHash}: ${error.message}`);
  }
};

// TypeScript declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
