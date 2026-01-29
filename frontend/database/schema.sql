-- PawGuard Database Schema for PostgreSQL
-- This schema is designed to handle millions of pet records efficiently

-- Create pets table
CREATE TABLE IF NOT EXISTS pets (
  id BIGSERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL UNIQUE,
  owner VARCHAR(42) NOT NULL,
  basic_info_ipfs_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  breed VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL,
  did TEXT,
  transaction_hash VARCHAR(66),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets(owner);
CREATE INDEX IF NOT EXISTS idx_pets_pet_id ON pets(pet_id);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON pets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pets_transaction_hash ON pets(transaction_hash);

-- Create a composite index for owner + created_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_pets_owner_created_at ON pets(owner, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE pets IS 'Stores pet registration data from blockchain for fast retrieval';
COMMENT ON COLUMN pets.id IS 'Auto-incrementing primary key';
COMMENT ON COLUMN pets.pet_id IS 'Pet ID from blockchain (NFT token ID)';
COMMENT ON COLUMN pets.owner IS 'Ethereum address of pet owner (lowercase)';
COMMENT ON COLUMN pets.basic_info_ipfs_hash IS 'IPFS hash containing pet metadata';
COMMENT ON COLUMN pets.name IS 'Pet name';
COMMENT ON COLUMN pets.breed IS 'Pet breed';
COMMENT ON COLUMN pets.age IS 'Pet age in years';
COMMENT ON COLUMN pets.did IS 'Decentralized identifier (DID) for the pet';
COMMENT ON COLUMN pets.transaction_hash IS 'Blockchain transaction hash of registration';

-- Optional: Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Add full-text search capability for pet names and breeds
CREATE INDEX IF NOT EXISTS idx_pets_name_search ON pets USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_pets_breed_search ON pets USING gin(to_tsvector('english', breed));

-- Performance statistics
-- Run this to analyze the table for query optimization
ANALYZE pets;

-- Create premium_payments table
CREATE TABLE IF NOT EXISTS premium_payments (
  id BIGSERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL,
  owner VARCHAR(42) NOT NULL,
  amount VARCHAR(100) NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL UNIQUE,
  block_timestamp BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_premium_payments_owner ON premium_payments(owner);
CREATE INDEX IF NOT EXISTS idx_premium_payments_pet_id ON premium_payments(pet_id);
CREATE INDEX IF NOT EXISTS idx_premium_payments_created_at ON premium_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_premium_payments_transaction_hash ON premium_payments(transaction_hash);

-- Create a composite index for owner + created_at (common query pattern)
CREATE INDEX IF NOT EXISTS idx_premium_payments_owner_created_at ON premium_payments(owner, created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE premium_payments IS 'Stores premium payment records from blockchain';
COMMENT ON COLUMN premium_payments.id IS 'Auto-incrementing primary key';
COMMENT ON COLUMN premium_payments.pet_id IS 'Pet ID from blockchain (NFT token ID)';
COMMENT ON COLUMN premium_payments.owner IS 'Ethereum address of pet owner (lowercase)';
COMMENT ON COLUMN premium_payments.amount IS 'Premium amount in GUARD tokens (as string to preserve precision)';
COMMENT ON COLUMN premium_payments.transaction_hash IS 'Blockchain transaction hash of premium payment';
COMMENT ON COLUMN premium_payments.block_timestamp IS 'Block timestamp when payment was made';

-- Performance statistics
ANALYZE premium_payments;
