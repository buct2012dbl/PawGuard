import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// Test database connection and table existence
export async function GET() {
  try {
    // Test 1: Check if Supabase client is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Supabase credentials not configured',
        details: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
      }, { status: 500 });
    }

    // Test 2: Try to query the pets table
    const { data, error, count } = await supabase
      .from('pets')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: error.message,
        hint: error.hint,
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      tableExists: true,
      totalPets: count || 0
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message
    }, { status: 500 });
  }
}
