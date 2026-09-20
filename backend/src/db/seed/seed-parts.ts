import fs from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, ensureDbInitialized } from '../client';
import { servicePartsTable } from '../schema';
import { parseCsv, resolveDataPath } from './utils';

export async function seedParts() {
  await ensureDbInitialized();
  const filePath = resolveDataPath('parts/service_parts_catalog.csv');

  if (!filePath) {
    console.warn('service_parts_catalog.csv not found, skipping parts seeding');
    return;
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const rows = parseCsv(content);

  for (const row of rows) {
    const sku = row.sku || row.part_number;
    if (!sku) continue;
    const existing = await db.select().from(servicePartsTable).where(eq(servicePartsTable.sku, sku)).limit(1);
    if (existing.length === 0) {
      await db.insert(servicePartsTable).values({
        sku,
        name: row.name || row.part_name || sku,
        category: row.category || 'General',
        brand: row.brand || 'OEM',
        price: row.price || '299.00',
        stockQuantity: parseInt(row.stock || row.stock_quantity || '10', 10),
      });
    }
  }
}
