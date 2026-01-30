import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// You can also use Vercel Postgres, PlanetScale, or any PostgreSQL provider
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database schema types
export interface PetRecord {
  id: number;
  pet_id: number;
  owner: string;
  basic_info_ipfs_hash: string;
  name: string;
  breed: string;
  age: number;
  did?: string;
  transaction_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface PremiumPaymentRecord {
  id: number;
  pet_id: number;
  owner: string;
  amount: string;
  transaction_hash: string;
  block_timestamp?: number;
  created_at: string;
}

// Fetch pets by owner
export async function getPetsByOwner(ownerAddress: string): Promise<PetRecord[]> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('owner', ownerAddress.toLowerCase())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pets:', error);
    throw error;
  }

  return data || [];
}

// Save or update a pet
export async function savePet(petData: {
  petId: number;
  owner: string;
  basicInfoIPFSHash: string;
  name: string;
  breed: string;
  age: number;
  did?: string;
  transactionHash?: string;
}): Promise<PetRecord> {
  const record = {
    pet_id: petData.petId,
    owner: petData.owner.toLowerCase(),
    basic_info_ipfs_hash: petData.basicInfoIPFSHash,
    name: petData.name,
    breed: petData.breed,
    age: petData.age,
    did: petData.did,
    transaction_hash: petData.transactionHash,
    updated_at: new Date().toISOString(),
  };

  // Try to update first, if not exists then insert
  const { data: existing } = await supabase
    .from('pets')
    .select('id')
    .eq('pet_id', petData.petId)
    .single();

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('pets')
      .update(record)
      .eq('pet_id', petData.petId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from('pets')
      .insert({ ...record, created_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

// Get pet by ID
export async function getPetById(petId: number): Promise<PetRecord | null> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('pet_id', petId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

// Get total pet count
export async function getTotalPetCount(): Promise<number> {
  const { count, error } = await supabase
    .from('pets')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count || 0;
}

// Get pets with pagination
export async function getPetsWithPagination(
  page: number = 1,
  pageSize: number = 20
): Promise<{ pets: PetRecord[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('pets')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    pets: data || [],
    total: count || 0,
  };
}

// Save premium payment
export async function savePremiumPayment(paymentData: {
  petId: number;
  owner: string;
  amount: string;
  transactionHash: string;
  blockTimestamp?: number;
}): Promise<PremiumPaymentRecord> {
  const record = {
    pet_id: paymentData.petId,
    owner: paymentData.owner.toLowerCase(),
    amount: paymentData.amount,
    transaction_hash: paymentData.transactionHash,
    block_timestamp: paymentData.blockTimestamp,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('premium_payments')
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get premium payments by owner
export async function getPremiumPaymentsByOwner(ownerAddress: string): Promise<PremiumPaymentRecord[]> {
  const { data, error } = await supabase
    .from('premium_payments')
    .select('*')
    .eq('owner', ownerAddress.toLowerCase())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching premium payments:', error);
    throw error;
  }

  return data || [];
}

// Get premium payments by owner with pagination
export async function getPremiumPaymentsByOwnerWithPagination(
  ownerAddress: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ payments: PremiumPaymentRecord[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('premium_payments')
    .select('*', { count: 'exact' })
    .eq('owner', ownerAddress.toLowerCase())
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching premium payments:', error);
    throw error;
  }

  return {
    payments: data || [],
    total: count || 0,
  };
}
