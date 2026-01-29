/**
 * Migration script to fetch existing pets from blockchain and save to PostgreSQL database
 * Run this once to populate the database with existing pet registrations
 *
 * Usage: node scripts/migrate-pets-to-db.js
 */

const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Load contract artifacts
const PetNFTArtifact = require('../src/artifacts/contracts/PetNFT.sol/PetNFT.json');
const contractAddresses = require('../src/artifacts/contracts/contract-addresses.json');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migratePets() {
  try {
    console.log('🚀 Starting pet migration to PostgreSQL database...\n');

    // Connect to Base Sepolia
    const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    console.log('🔗 Connected to Base Sepolia');
    console.log('📋 PetNFT Address:', contractAddresses.petNFT);

    // Create contract instance
    const petNFT = new ethers.Contract(
      contractAddresses.petNFT,
      PetNFTArtifact.abi,
      provider
    );

    // Get all PetRegistered events
    console.log('\n📊 Querying PetRegistered events from blockchain...');
    const filter = petNFT.filters.PetRegistered();

    // Query in chunks to avoid RPC limits
    const currentBlock = await provider.getBlockNumber();
    console.log(`📈 Current block: ${currentBlock}`);

    const CHUNK_SIZE = 10000;
    let allEvents = [];

    for (let fromBlock = 0; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
      process.stdout.write(`  Querying blocks ${fromBlock} to ${toBlock}...`);

      try {
        const events = await petNFT.queryFilter(filter, fromBlock, toBlock);
        allEvents.push(...events);
        console.log(` found ${events.length} events`);
      } catch (error) {
        console.log(` ⚠️ error, skipping`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Total events found: ${allEvents.length}\n`);

    if (allEvents.length === 0) {
      console.log('ℹ️ No pets found on blockchain. Nothing to migrate.');
      return;
    }

    // Process each event
    let newPets = 0;
    let updatedPets = 0;
    let errors = 0;

    for (const event of allEvents) {
      try {
        const petId = Number(event.args[0]);
        const owner = event.args[1].toLowerCase();
        const ipfsHash = event.args[2];

        process.stdout.write(`🐕 Processing Pet ID ${petId}...`);

        // Check if pet already exists
        const { data: existing } = await supabase
          .from('pets')
          .select('id')
          .eq('pet_id', petId)
          .single();

        const petData = {
          pet_id: petId,
          owner: owner,
          basic_info_ipfs_hash: ipfsHash,
          name: 'Unknown',
          breed: 'Unknown',
          age: 0,
          transaction_hash: event.transactionHash,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('pets')
            .update(petData)
            .eq('pet_id', petId);

          if (error) throw error;
          updatedPets++;
          console.log(' updated');
        } else {
          // Insert new record
          const { error } = await supabase
            .from('pets')
            .insert({ ...petData, created_at: new Date().toISOString() });

          if (error) throw error;
          newPets++;
          console.log(' added');
        }
      } catch (error) {
        console.log(` ❌ error: ${error.message}`);
        errors++;
      }
    }

    console.log('\n🎉 Migration complete!');
    console.log(`📊 Summary:`);
    console.log(`   - New pets added: ${newPets}`);
    console.log(`   - Existing pets updated: ${updatedPets}`);
    console.log(`   - Errors: ${errors}`);
    console.log(`   - Total processed: ${allEvents.length}`);

    // Get total count from database
    const { count } = await supabase
      .from('pets')
      .select('*', { count: 'exact', head: true });

    console.log(`\n💾 Total pets in database: ${count}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePets();
