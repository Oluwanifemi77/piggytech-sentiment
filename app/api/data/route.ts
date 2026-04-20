import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();

    const rows = await sql`
      SELECT
        tweet_id,
        tweet_text,
        author_username,
        author_name,
        products_detected,
        overall_sentiment,
        intent,
        aspect_product,
        aspect,
        aspect_sentiment,
        created_at
      FROM tweets
      ORDER BY scraped_at DESC
    `;

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
