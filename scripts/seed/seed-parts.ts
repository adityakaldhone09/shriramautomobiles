import { seedParts } from '../../backend/src/db/seed/seed-parts';

async function main() {
  console.log('Running parts seeding script...');
  await seedParts();
  console.log('Parts seeding completed.');
}

main().catch((err) => {
  console.error('Parts seed error:', err);
  process.exit(1);
});
