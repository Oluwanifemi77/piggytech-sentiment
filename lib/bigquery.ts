/**
 * lib/bigquery.ts
 *
 * BigQuery client — authenticated via a Google Service Account key stored
 * as the GOOGLE_SERVICE_ACCOUNT_KEY environment variable (stringified JSON).
 *
 * Dataset/table constants used across the app live here.
 */
import { BigQuery } from '@google-cloud/bigquery';

export const BQ_DATASET = 'piggytech_sentiment';
export const BQ_TABLE   = 'tweets';

export function getBigQuery(): BigQuery {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set.');

  const credentials = JSON.parse(raw);

  return new BigQuery({
    projectId: credentials.project_id,
    credentials,
  });
}
