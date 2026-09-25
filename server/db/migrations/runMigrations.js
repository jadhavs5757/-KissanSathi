import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from '../../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('🚀 Running database migrations...');
  const migrationPath = path.resolve(__dirname, '001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Execute SQL script
    await exec(sql);
    console.log('✅ Migrations completed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }
}

// Allow direct execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
