import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile';
import { config } from '../config';

const environment = config.env || 'development';
const connectionConfig = knexConfig[environment];

if (!connectionConfig) {
  throw new Error(`Knex configuration not found for environment: ${environment}`);
}

export const db: Knex = knex(connectionConfig);

/**
 * Checks database connectivity.
 */
export async function checkDatabaseConnection(): Promise<void> {
  await db.raw('SELECT 1+1 AS result');
}
