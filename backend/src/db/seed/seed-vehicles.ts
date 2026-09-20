import fs from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, ensureDbInitialized } from '../client';
import { brandsTable, vehicleModelsTable } from '../schema';
import { parseCsv, resolveDataPath } from './utils';

export async function seedVehicles() {
  await ensureDbInitialized();
  const filePath = resolveDataPath('vehicles/vehicle_models.csv');

  if (!filePath) {
    console.warn('vehicle_models.csv not found, skipping vehicle seeding');
    return;
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const rows = parseCsv(content);

  const brandsMap = new Map<string, number>();
  for (const row of rows) {
    const brandName = row.brand_name || 'Generic';
    const brandSlug = row.brand_slug || brandName.toLowerCase().replace(/\s+/g, '-');
    if (!brandsMap.has(brandSlug)) {
      const existing = await db.select().from(brandsTable).where(eq(brandsTable.slug, brandSlug)).limit(1);
      if (existing.length > 0) {
        brandsMap.set(brandSlug, existing[0].id);
      } else {
        const [inserted] = await db.insert(brandsTable).values({
          name: brandName,
          slug: brandSlug,
        }).returning({ id: brandsTable.id });
        brandsMap.set(brandSlug, inserted.id);
      }
    }
  }

  for (const row of rows) {
    const brandSlug = row.brand_slug;
    const brandId = brandsMap.get(brandSlug);
    if (!brandId) continue;
    const modelSlug = row.model_slug;
    const existing = await db.select().from(vehicleModelsTable).where(eq(vehicleModelsTable.slug, modelSlug)).limit(1);
    if (existing.length === 0) {
      await db.insert(vehicleModelsTable).values({
        brandId,
        name: row.model_name,
        slug: modelSlug,
        vehicleType: row.vehicle_type || 'Motorcycle',
        engineClass: row.engine_class,
        isActive: row.active === 'true',
      });
    }
  }
}
