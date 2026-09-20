import { seedVehicles } from './seed-vehicles';
import { seedParts } from './seed-parts';
import { seedServices } from './seed-services';
import { seedHelmets } from './seed-helmets';

export async function runAllSeeds() {
  console.log('Seeding vehicles...');
  await seedVehicles();
  console.log('Seeding spare parts...');
  await seedParts();
  console.log('Seeding service catalog...');
  await seedServices();
  console.log('Seeding helmets...');
  await seedHelmets();
  console.log('All seeds completed successfully.');
}

if (process.argv[1]?.includes('seed')) {
  runAllSeeds()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed execution error:', err);
      process.exit(1);
    });
}
