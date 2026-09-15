import { seedServices } from '../../apps/api/src/db/seed/seed-services';

async function main() {
  console.log('Running services seeding script...');
  await seedServices();
  console.log('Services seeding completed.');
}

main().catch((err) => {
  console.error('Services seed error:', err);
  process.exit(1);
});
