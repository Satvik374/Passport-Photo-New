import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { secretsManager } from './secretsManager';

// Get DATABASE_URL from environment or secrets manager
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Try to get from secrets manager
  databaseUrl = secretsManager.getSecret('DATABASE_URL');
}

if (!databaseUrl) {
  console.error('\n' + secretsManager.generateSetupInstructions());
  throw new Error(
    "DATABASE_URL must be set. Please check the setup instructions above."
  );
}

// Save to secrets for future use
if (databaseUrl && !secretsManager.hasSecret('DATABASE_URL')) {
  secretsManager.setSecret('DATABASE_URL', databaseUrl);
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });