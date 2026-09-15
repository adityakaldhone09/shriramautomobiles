import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

function validateHelmets() {
  const helmetFiles = [
    'data/helmets/helmet_brands.csv',
    'data/helmets/helmet_types.csv',
    'data/helmets/helmet_products.csv',
    'data/helmets/helmet_variants.csv',
    'data/helmets/helmet_sizes.csv',
    'data/helmets/helmet_size_mappings.csv',
    'data/helmets/helmet_certifications.csv',
    'data/helmets/helmet_sources.csv',
    'data/helmets/helmet_inventory.csv',
  ];

  let missing = 0;
  for (const f of helmetFiles) {
    const full = path.resolve(rootDir, f);
    if (!fs.existsSync(full)) {
      console.error(`Missing helmet file: ${f}`);
      missing++;
    } else {
      const count = fs.readFileSync(full, 'utf-8').trim().split('\n').length - 1;
      console.log(`[OK] ${f}: ${count} rows`);
    }
  }

  if (missing > 0) {
    process.exit(1);
  }
  console.log('Helmet dataset verification passed.');
}

validateHelmets();
