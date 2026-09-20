import fs from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, ensureDbInitialized } from '../client';
import { servicesTable, serviceSymptomsTable } from '../schema';
import { parseCsv, resolveDataPath } from './utils';

export async function seedServices() {
  await ensureDbInitialized();
  const pkgPath = resolveDataPath('services/service_packages.csv');

  if (pkgPath) {
    const content = await fs.readFile(pkgPath, 'utf-8');
    const rows = parseCsv(content);
    for (const row of rows) {
      const slug = row.slug || row.service_slug;
      if (!slug) continue;
      const existing = await db.select().from(servicesTable).where(eq(servicesTable.slug, slug)).limit(1);
      if (existing.length === 0) {
        await db.insert(servicesTable).values({
          slug,
          name: row.name || row.service_name || slug,
          description: row.description || '',
          startingPrice: row.price || row.starting_price || '299.00',
          estimatedDuration: row.duration || '60 mins',
        });
      }
    }
  }

  const sympPath = resolveDataPath('services/service_symptom_map.csv');

  if (sympPath) {
    const content = await fs.readFile(sympPath, 'utf-8');
    const rows = parseCsv(content);
    for (const row of rows) {
      const symptomId = row.symptom_id;
      if (!symptomId) continue;
      const existing = await db.select().from(serviceSymptomsTable).where(eq(serviceSymptomsTable.symptomId, symptomId)).limit(1);
      if (existing.length === 0) {
        await db.insert(serviceSymptomsTable).values({
          symptomId,
          symptom: row.symptom || symptomId,
          slug: row.slug || symptomId.toLowerCase().replace(/\s+/g, '-'),
          description: row.description || '',
          severity: row.severity || 'MEDIUM',
        });
      }
    }
  }
}
