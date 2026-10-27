import { fileURLToPath } from 'node:url';
import { migrate as runMigrations } from 'drizzle-orm/node-postgres/migrator';
import { db, isInMemory } from '../../backend/src/db/client';

async function migrate() {
  if (isInMemory) {
    throw new Error('DATABASE_URL must point to a PostgreSQL database to run migrations');
  }

  const migrationsFolder = fileURLToPath(
    new URL('../../backend/src/db/migrations', import.meta.url)
  );
  await runMigrations(db, { migrationsFolder });
  console.log('Database migrations completed.');
}

migrate().catch((err) => {
  console.error('Database migration failed:', err instanceof Error ? err.message : 'Unknown error');
  process.exitCode = 1;
}).finally(async () => {
  if (!isInMemory) {
    await db.$client.end();
  }
});
