import { NextRequest, NextResponse } from 'next/server';
import { getPetsByOwner, savePet } from '@/lib/db';

// GET: Fetch pets for a specific owner
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get('owner');

    if (!owner) {
      return NextResponse.json({ error: 'Owner address is required' }, { status: 400 });
    }

    const pets = await getPetsByOwner(owner);

    // Transform to match frontend interface
    const transformedPets = pets.map(pet => ({
      id: pet.pet_id,
      owner: pet.owner,
      basicInfoIPFSHash: pet.basic_info_ipfs_hash,
      basicInfo: {
        name: pet.name,
        breed: pet.breed,
        age: pet.age,
      },
      did: pet.did,
      transactionHash: pet.transaction_hash,
    }));

    return NextResponse.json({ pets: transformedPets });
  } catch (error: any) {
    console.error('Error fetching pets:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add a new pet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { petId, owner, basicInfoIPFSHash, basicInfo, did, transactionHash } = body;

    if (!petId || !owner || !basicInfoIPFSHash || !basicInfo) {
      return NextResponse.json(
        { error: 'petId, owner, basicInfoIPFSHash, and basicInfo are required' },
        { status: 400 }
      );
    }

    const savedPet = await savePet({
      petId,
      owner,
      basicInfoIPFSHash,
      name: basicInfo.name || 'Unknown',
      breed: basicInfo.breed || 'Unknown',
      age: basicInfo.age || 0,
      did,
      transactionHash,
    });

    return NextResponse.json({ success: true, pet: savedPet });
  } catch (error: any) {
    console.error('Error saving pet:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
