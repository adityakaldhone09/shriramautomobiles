import { seedVehicles } from '../../apps/api/src/db/seed/seed-vehicles';

async function main() {
  console.log('Running vehicle seeding script...');
  await seedVehicles();
  console.log('Vehicle seeding completed.');
}

main().catch((err) => {
  console.error('Vehicle seed error:', err);
  process.exit(1);
});
