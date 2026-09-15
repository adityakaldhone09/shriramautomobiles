import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@workspace/db';
import { brandsTable, vehicleModelsTable } from '@workspace/db/schema';

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // Handle quoted fields or standard comma separation
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    return row;
  });
}

async function seedVehicles() {
  const possiblePaths = [
    path.resolve('data/csv/vehicle_models.csv'),
    path.resolve('../data/csv/vehicle_models.csv'),
    path.resolve(process.cwd(), 'data/csv/vehicle_models.csv'),
    path.resolve(process.cwd(), '../data/csv/vehicle_models.csv'),
  ];
  let csvPath = possiblePaths[0];
  for (const p of possiblePaths) {
    try {
      await fs.access(p);
      csvPath = p;
      break;
    } catch {
      // continue
    }
  }
  console.log(`[Seed] Reading vehicle models from ${csvPath}...`);
  const content = await fs.readFile(csvPath, 'utf8');
  const rows = parseCsv(content);

  let brandsCreated = 0;
  let modelsCreated = 0;

  for (const row of rows) {
    const { brand_name, brand_slug, model_name, model_slug, vehicle_type, engine_class } = row;
    if (!brand_name || !brand_slug || !model_name || !model_slug) continue;

    // 1. Ensure Brand exists (Idempotent)
    let [brand] = await db.select().from(brandsTable).where(eq(brandsTable.slug, brand_slug));
    if (!brand) {
      const inserted = await db.insert(brandsTable).values({
        name: brand_name,
        slug: brand_slug,
        isActive: true,
      }).returning();
      brand = inserted[0];
      brandsCreated++;
    }

    // 2. Ensure Vehicle Model exists (Idempotent)
    const [existingModel] = await db.select().from(vehicleModelsTable).where(eq(vehicleModelsTable.slug, model_slug));
    if (!existingModel) {
      await db.insert(vehicleModelsTable).values({
        brandId: brand.id,
        name: model_name,
        slug: model_slug,
        vehicleType: vehicle_type || 'Motorcycle',
        engineClass: engine_class || null,
        isActive: true,
      });
      modelsCreated++;
    }
  }

  console.log(`[Seed] Vehicle Seeding Complete: ${brandsCreated} new brands, ${modelsCreated} new models (${rows.length} total in catalog).`);
}

seedVehicles()
  .then(() => {
    console.log('[Seed] seed-vehicles finished successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Seed] Error in seed-vehicles:', err);
    process.exit(1);
  });
