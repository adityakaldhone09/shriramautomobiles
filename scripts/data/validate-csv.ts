import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

function validateFile(relPath: string) {
  const fullPath = path.resolve(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`\x1b[31m[FAIL] Missing CSV: ${relPath}\x1b[0m`);
    return false;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.trim().split('\n');
  if (lines.length <= 1) {
    console.warn(`\x1b[33m[WARN] Empty dataset: ${relPath}\x1b[0m`);
    return false;
  }
  console.log(`\x1b[32m[PASS] ${relPath}: ${lines.length - 1} records\x1b[0m`);
  return true;
}

const csvFiles = [
  'data/vehicles/vehicle_models.csv',
  'data/vehicles/vehicle_brands.csv',
  'data/parts/service_parts_catalog.csv',
  'data/parts/vehicle_part_compatibility.csv',
  'data/services/service_packages.csv',
  'data/services/service_symptom_map.csv',
  'data/helmets/helmet_brands.csv',
  'data/helmets/helmet_types.csv',
  'data/helmets/helmet_products.csv',
];

console.log('Validating repository CSV datasets...');
let allValid = true;
for (const file of csvFiles) {
  if (!validateFile(file)) allValid = false;
}

if (!allValid) {
  process.exit(1);
}
console.log('All CSV datasets validated.');
