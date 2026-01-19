import { ethers } from 'ethers';

// RPC block range limit (most public endpoints limit to 50,000)
const BLOCKS_PER_QUERY = 10000;

/**
 * Query contract events with automatic pagination to handle RPC block range limits
 * @param contract - ethers.js contract instance
 * @param filter - Event filter
 * @param fromBlock - Starting block (default: 0)
 * @param toBlock - Ending block (default: 'latest')
 * @returns Array of events
 */
export const queryFilterWithPagination = async (
  contract: ethers.Contract,
  filter: ethers.EventFilter | null,
  fromBlock: number | string = 0,
  toBlock: number | string = 'latest'
): Promise<ethers.EventLog[]> => {
  try {
    console.log('📊 Starting paginated event query...');
    
    // Get the provider
    const provider = contract.runner?.provider;
    if (!provider) {
      throw new Error('No provider available');
    }

    // Convert toBlock to number
    let endBlock: number;
    if (toBlock === 'latest') {
      endBlock = await provider.getBlockNumber();
      console.log(`📈 Current block number: ${endBlock}`);
    } else {
      endBlock = typeof toBlock === 'string' ? parseInt(toBlock, 16) : toBlock;
    }

    const startBlock = typeof fromBlock === 'string' ? parseInt(fromBlock, 16) : fromBlock;
    const totalBlocks = endBlock - startBlock + 1;
    console.log(`📋 Total blocks to query: ${totalBlocks} (from ${startBlock} to ${endBlock})`);

    // If range is small enough, query in one go
    if (totalBlocks <= BLOCKS_PER_QUERY) {
      console.log(`✅ Block range is small (${totalBlocks}), querying directly...`);
      return await contract.queryFilter(filter, startBlock, endBlock);
    }

    // Otherwise, paginate
    console.log(`📑 Block range is large, paginating in ${BLOCKS_PER_QUERY}-block chunks...`);
    const allEvents: ethers.EventLog[] = [];
    
    for (let currentBlock = startBlock; currentBlock <= endBlock; currentBlock += BLOCKS_PER_QUERY) {
      const nextBlock = Math.min(currentBlock + BLOCKS_PER_QUERY - 1, endBlock);
      console.log(`🔄 Querying blocks ${currentBlock} to ${nextBlock}...`);
      
      try {
        const events = await contract.queryFilter(filter, currentBlock, nextBlock);
        console.log(`✅ Got ${events.length} events from this range`);
        allEvents.push(...events);
      } catch (error: any) {
        console.error(`❌ Error querying blocks ${currentBlock}-${nextBlock}:`, error.message);
        // Continue with next range instead of failing
        continue;
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📦 Total events found: ${allEvents.length}`);
    return allEvents;
  } catch (error) {
    console.error('❌ Error in paginated event query:', error);
    throw error;
  }
};
