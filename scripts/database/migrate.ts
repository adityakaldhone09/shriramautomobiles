import { ensureDbInitialized } from '../../backend/src/db/client';

async function migrate() {
  console.log('Verifying database schema initialization and migrations...');
  await ensureDbInitialized();
  console.log('Database migration verification completed.');
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
