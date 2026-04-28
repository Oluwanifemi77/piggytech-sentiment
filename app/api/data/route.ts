import { NextResponse } from 'next/server';
import { getBigQuery, BQ_DATASET, BQ_TABLE } from '@/lib/bigquery';

export async function GET() {
  try {
    const bq = getBigQuery();
    const [rows] = await bq.query({
      query: `SELECT * FROM \`${BQ_DATASET}.${BQ_TABLE}\`
              ORDER BY created_at DESC
              LIMIT 5000`,
    });
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
