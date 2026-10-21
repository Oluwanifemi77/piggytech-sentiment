import { NextResponse } from 'next/server';
import { fetchTweets } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await fetchTweets();
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
