import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * Resolve the CSV path:
 * - In production on Railway: DATA_FILE_PATH env var → /data/labelled_tweets_gemini.csv
 * - Locally / fallback: public/labelled_tweets_gemini.csv (committed to git)
 */
function getDataFilePath(): string {
  if (process.env.DATA_FILE_PATH) return process.env.DATA_FILE_PATH;
  return path.join(process.cwd(), 'public', 'labelled_tweets_gemini.csv');
}

export async function GET() {
  try {
    const filePath = getDataFilePath();
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });
    return NextResponse.json({ data: records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
