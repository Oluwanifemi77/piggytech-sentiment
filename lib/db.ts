/**
 * lib/db.ts
 * Re-exports the BigQuery client for backwards compatibility.
 * Database layer is now Google BigQuery — see lib/bigquery.ts.
 */
export { getBigQuery as getDb } from './bigquery';
