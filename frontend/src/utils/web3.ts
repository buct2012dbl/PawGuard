import Web3 from 'web3';
import PetNFTArtifact from '../artifacts/contracts/PetNFT.sol/PetNFT.json';
import PawGuardTokenArtifact from '../artifacts/contracts/PawGuardToken.sol/PawGuardToken.json';
import GuardStableCoinArtifact from '../artifacts/contracts/GuardStableCoin.sol/GuardStableCoin.json';
import PawPoolArtifact from '../artifacts/contracts/PawPool.sol/PawPool.json';
import contractAddresses from '../artifacts/contracts/contract-addresses.json';
import { config } from '../config/app.config';

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

// Get Web3 instance
export const getWeb3 = (): Promise<Web3> =>
  new Promise(async (resolve, reject) => {
    // Check for modern dapp browsers
    if (typeof window !== 'undefined' && window.ethereum) {
      const web3 = new Web3(window.ethereum);
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        resolve(web3);
      } catch (error) {
        reject(error);
      }
    }
    // Legacy dapp browsers
    else if (typeof window !== 'undefined' && (window as any).web3) {
      const web3 = (window as any).web3;
      console.log("Injected web3 detected.");
      resolve(web3);
    }
    // Fallback to configured RPC
    else {
      const provider = new Web3.providers.HttpProvider(config.blockchain.rpcUrl);
      const web3 = new Web3(provider);
      console.log(`No web3 instance injected, using ${config.blockchain.networkName}.`);
      resolve(web3);
    }
  });

// Get contract instances
export const getContracts = async (web3: Web3) => {
  const petNFTInstance = new web3.eth.Contract(
    PetNFTArtifact.abi as any,
    contractAddresses.PetNFT
  );

  const pawTokenInstance = new web3.eth.Contract(
    PawGuardTokenArtifact.abi as any,
    contractAddresses.PawGuardToken
  );

  const guardTokenInstance = new web3.eth.Contract(
    GuardStableCoinArtifact.abi as any,
    contractAddresses.GuardStableCoin
  );

  const pawPoolInstance = new web3.eth.Contract(
    PawPoolArtifact.abi as any,
    contractAddresses.PawPool
  );

  return {
    petNFT: petNFTInstance,
    pawToken: pawTokenInstance,
    guardToken: guardTokenInstance,
    pawPool: pawPoolInstance,
    web3: web3,
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
