import { seedHelmets } from '../../backend/src/db/seed/seed-helmets';

async function main() {
  console.log('Running helmets seeding script...');
  await seedHelmets();
  console.log('Helmets seeding completed.');
}

main().catch((err) => {
  console.error('Helmets seed error:', err);
  process.exit(1);
});
