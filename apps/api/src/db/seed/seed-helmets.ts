import fs from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, ensureDbInitialized } from '../client';
import { helmetBrandsTable, helmetTypesTable } from '../schema';
import { parseCsv, resolveDataPath } from './utils';

export async function seedHelmets() {
  await ensureDbInitialized();
  const brandsPath = resolveDataPath('helmets/helmet_brands.csv');

  if (brandsPath) {
    const content = await fs.readFile(brandsPath, 'utf-8');
    const rows = parseCsv(content);
    for (const row of rows) {
      const slug = row.brand_slug;
      if (!slug) continue;
      const existing = await db.select().from(helmetBrandsTable).where(eq(helmetBrandsTable.slug, slug)).limit(1);
      if (existing.length === 0) {
        await db.insert(helmetBrandsTable).values({
          brandId: row.brand_id,
          name: row.brand_name,
          slug,
          country: row.country,
          originYear: parseInt(row.origin_year || '2000', 10),
        });
      }
    }
  }

  const typesPath = resolveDataPath('helmets/helmet_types.csv');

  if (typesPath) {
    const content = await fs.readFile(typesPath, 'utf-8');
    const rows = parseCsv(content);
    for (const row of rows) {
      const slug = row.type_slug;
      if (!slug) continue;
      const existing = await db.select().from(helmetTypesTable).where(eq(helmetTypesTable.slug, slug)).limit(1);
      if (existing.length === 0) {
        await db.insert(helmetTypesTable).values({
          typeId: row.type_id,
          name: row.type_name,
          slug,
          description: row.description,
        });
      }
    }
  }
}
