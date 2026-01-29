import { NextRequest, NextResponse } from 'next/server';
import { savePremiumPayment, getPremiumPaymentsByOwner } from '../../../lib/db';

// GET /api/premium-payments?owner=0x...
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get('owner');

    if (!owner) {
      return NextResponse.json(
        { error: 'Owner address is required' },
        { status: 400 }
      );
    }

    const payments = await getPremiumPaymentsByOwner(owner);
    return NextResponse.json({ payments });
  } catch (error: any) {
    console.error('Error fetching premium payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch premium payments', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/premium-payments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { petId, owner, amount, transactionHash, blockTimestamp } = body;

    if (!petId || !owner || !amount || !transactionHash) {
      return NextResponse.json(
        { error: 'Missing required fields: petId, owner, amount, transactionHash' },
        { status: 400 }
      );
    }

    const payment = await savePremiumPayment({
      petId,
      owner,
      amount,
      transactionHash,
      blockTimestamp,
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving premium payment:', error);

    // Handle duplicate transaction hash
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Payment already recorded', details: 'Duplicate transaction hash' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save premium payment', details: error.message },
      { status: 500 }
    );
  }
}
