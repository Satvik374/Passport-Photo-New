import fs from 'fs';
import path from 'path';
import { pool } from './db';

async function main() {
  const schemaPath = path.join(process.cwd(), 'sql', 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('schema.sql not found at', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf-8');
  console.log('Applying SQL schema...');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Schema applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to apply schema:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();


