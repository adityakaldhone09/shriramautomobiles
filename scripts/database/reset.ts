import { ensureDbInitialized, db } from '../../apps/api/src/db/client';

async function reset() {
  console.log('Resetting local in-memory database cache...');
  await ensureDbInitialized();
  console.log('Database reset completed.');
}

reset().catch((err) => {
  console.error('Reset error:', err);
  process.exit(1);
});
