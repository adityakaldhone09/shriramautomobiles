import fs from 'node:fs/promises';
import path from 'node:path';
import { eq, and } from 'drizzle-orm';
import { db } from '@workspace/db';
import {
  partCategoriesTable,
  servicePartsTable,
  vehicleModelsTable,
  vehiclePartCompatibilityTable,
  servicesTable,
  serviceSymptomsTable,
  symptomServiceMappingTable,
  symptomPartMappingTable,
  mechanicsTable,
  availableSlotsTable,
} from '@workspace/db/schema';

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
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

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function resolveCsvPath(fileName: string): Promise<string> {
  const possiblePaths = [
    path.resolve('data/csv', fileName),
    path.resolve('../data/csv', fileName),
    path.resolve(process.cwd(), 'data/csv', fileName),
    path.resolve(process.cwd(), '../data/csv', fileName),
  ];
  for (const p of possiblePaths) {
    try {
      await fs.access(p);
      return p;
    } catch {
      // continue
    }
  }
  return possiblePaths[0];
}

async function seedServiceCatalog() {
  console.log('[Seed] Starting service catalog seed process...');

  // 1. Seed Parts & Categories
  const partsCsvPath = await resolveCsvPath('service_parts_catalog.csv');
  console.log(`[Seed] Reading parts from ${partsCsvPath}...`);
  const partsRows = parseCsv(await fs.readFile(partsCsvPath, 'utf8'));

  let categoriesCreated = 0;
  let partsCreated = 0;

  for (const row of partsRows) {
    const { sku, name, category, sub_category, description, part_type, price, purchase_price, stock_quantity, low_stock_threshold, supplier } = row;
    if (!sku || !name || !category) continue;

    const catSlug = slugify(category);
    let [cat] = await db.select().from(partCategoriesTable).where(eq(partCategoriesTable.slug, catSlug));
    if (!cat) {
      const insertedCat = await db.insert(partCategoriesTable).values({
        name: category,
        slug: catSlug,
        description: `${category} spare parts and components`,
        isActive: true,
      }).returning();
      cat = insertedCat[0];
      categoriesCreated++;
    }

    const [existingPart] = await db.select().from(servicePartsTable).where(eq(servicePartsTable.sku, sku));
    if (!existingPart) {
      await db.insert(servicePartsTable).values({
        sku,
        name,
        slug: slugify(name),
        categoryId: cat.id,
        category,
        subCategory: sub_category || null,
        description: description || null,
        partType: part_type || 'Replacement',
        price: price || '0.00',
        purchasePrice: purchase_price || '0.00',
        stockQuantity: stock_quantity ? parseInt(stock_quantity, 10) : 10,
        reservedStock: 0,
        lowStockThreshold: low_stock_threshold ? parseInt(low_stock_threshold, 10) : 5,
        supplier: supplier || 'Shriram Genuine Parts',
        availability: 'In Stock',
        isActive: true,
      });
      partsCreated++;
    }
  }
  console.log(`[Seed] Parts seeded: ${categoriesCreated} categories, ${partsCreated} new parts (${partsRows.length} total).`);

  // 2. Seed Compatibility
  const compatCsvPath = await resolveCsvPath('vehicle_part_compatibility.csv');
  console.log(`[Seed] Reading compatibility from ${compatCsvPath}...`);
  const compatRows = parseCsv(await fs.readFile(compatCsvPath, 'utf8'));

  let compatCreated = 0;
  for (const row of compatRows) {
    const { model_slug, part_sku, fitment_confidence, notes } = row;
    if (!model_slug || !part_sku) continue;

    const [model] = await db.select().from(vehicleModelsTable).where(eq(vehicleModelsTable.slug, model_slug));
    const [part] = await db.select().from(servicePartsTable).where(eq(servicePartsTable.sku, part_sku));

    if (model && part) {
      const [existing] = await db.select().from(vehiclePartCompatibilityTable).where(
        and(
          eq(vehiclePartCompatibilityTable.vehicleModelId, model.id),
          eq(vehiclePartCompatibilityTable.partId, part.id)
        )
      );

      if (!existing) {
        await db.insert(vehiclePartCompatibilityTable).values({
          vehicleModelId: model.id,
          partId: part.id,
          fitmentConfidence: fitment_confidence || 'MODEL_SPECIFIC',
          notes: notes || null,
          isActive: true,
        });
        compatCreated++;
      }
    }
  }
  console.log(`[Seed] Compatibility seeded: ${compatCreated} new fitment links.`);

  // 3. Seed Service Packages
  const servicesCsvPath = await resolveCsvPath('service_packages.csv');
  console.log(`[Seed] Reading services from ${servicesCsvPath}...`);
  const serviceRows = parseCsv(await fs.readFile(servicesCsvPath, 'utf8'));

  let servicesCreated = 0;
  for (const row of serviceRows) {
    const { name, slug, description, vehicle_type, typical_duration_minutes, starting_price } = row;
    if (!name || !slug) continue;

    const [existingService] = await db.select().from(servicesTable).where(eq(servicesTable.slug, slug));
    if (!existingService) {
      await db.insert(servicesTable).values({
        name: { en: name, hi: name, mr: name },
        slug,
        description: { en: description, hi: description, mr: description },
        vehicleType: vehicle_type || 'All',
        typicalDurationMinutes: typical_duration_minutes ? parseInt(typical_duration_minutes, 10) : 60,
        estimatedDuration: `${typical_duration_minutes || 60} mins`,
        startingPrice: starting_price || '299.00',
        isActive: true,
      });
      servicesCreated++;
    }
  }
  console.log(`[Seed] Services seeded: ${servicesCreated} new services.`);

  // 4. Seed Symptoms and Mappings
  const symptomsCsvPath = await resolveCsvPath('service_symptom_map.csv');
  console.log(`[Seed] Reading symptoms from ${symptomsCsvPath}...`);
  const symptomRows = parseCsv(await fs.readFile(symptomsCsvPath, 'utf8'));

  let symptomsCreated = 0;
  for (const row of symptomRows) {
    const { symptom_id, symptom, description, severity, service_slugs, part_skus, reasoning } = row;
    if (!symptom_id || !symptom) continue;

    let [existingSymptom] = await db.select().from(serviceSymptomsTable).where(eq(serviceSymptomsTable.symptomId, symptom_id));
    if (!existingSymptom) {
      const inserted = await db.insert(serviceSymptomsTable).values({
        symptomId: symptom_id,
        symptom,
        slug: slugify(symptom),
        description: description || null,
        severity: severity || 'MEDIUM',
        isActive: true,
      }).returning();
      existingSymptom = inserted[0];
      symptomsCreated++;
    }

    // Map to services
    if (service_slugs && existingSymptom) {
      const slugs = service_slugs.split(';').map((s) => s.trim()).filter(Boolean);
      for (let i = 0; i < slugs.length; i++) {
        const slug = slugs[i];
        const [svc] = await db.select().from(servicesTable).where(eq(servicesTable.slug, slug));
        if (svc) {
          const [exists] = await db.select().from(symptomServiceMappingTable).where(
            and(
              eq(symptomServiceMappingTable.symptomId, existingSymptom.id),
              eq(symptomServiceMappingTable.serviceId, svc.id)
            )
          );
          if (!exists) {
            await db.insert(symptomServiceMappingTable).values({
              symptomId: existingSymptom.id,
              serviceId: svc.id,
              priority: i + 1,
            });
          }
        }
      }
    }

    // Map to parts
    if (part_skus && existingSymptom) {
      const skus = part_skus.split(';').map((s) => s.trim()).filter(Boolean);
      for (let i = 0; i < skus.length; i++) {
        const pSku = skus[i];
        const [prt] = await db.select().from(servicePartsTable).where(eq(servicePartsTable.sku, pSku));
        if (prt) {
          const [exists] = await db.select().from(symptomPartMappingTable).where(
            and(
              eq(symptomPartMappingTable.symptomId, existingSymptom.id),
              eq(symptomPartMappingTable.partId, prt.id)
            )
          );
          if (!exists) {
            await db.insert(symptomPartMappingTable).values({
              symptomId: existingSymptom.id,
              partId: prt.id,
              priority: i + 1,
              reasoning: reasoning || null,
            });
          }
        }
      }
    }
  }
  console.log(`[Seed] Symptoms seeded: ${symptomsCreated} new symptoms with service and part mappings.`);

  // 5. Seed Mechanics
  const defaultMechanics = [
    { name: 'Ramesh Patil', phone: '9822101122', experience: 14, specialization: 'Engine Overhaul & CVT Specialist', languages: 'Marathi, Hindi', isAvailable: true },
    { name: 'Sachin Shinde', phone: '9822103344', experience: 9, specialization: 'Periodic Maintenance & Brake Expert', languages: 'Marathi, Hindi', isAvailable: true },
    { name: 'Anand Kulkarni', phone: '9822105566', experience: 11, specialization: 'Auto Electrical & Diagnostic Lead', languages: 'Marathi, Hindi, English', isAvailable: true },
    { name: 'Vinayak Jadhav', phone: '9822107788', experience: 7, specialization: 'Suspension, Wheel Alignment & Tyres', languages: 'Marathi, Hindi', isAvailable: true },
  ];
  for (const m of defaultMechanics) {
    const [existing] = await db.select().from(mechanicsTable).where(eq(mechanicsTable.name, m.name));
    if (!existing) {
      await db.insert(mechanicsTable).values(m);
    }
  }
  console.log('[Seed] Mechanics seeded.');

  // 6. Seed Time Slots
  const slotTimes = [
    '09:00 AM – 10:30 AM',
    '10:30 AM – 12:00 PM',
    '01:00 PM – 02:30 PM',
    '02:30 PM – 04:00 PM',
    '04:00 PM – 05:30 PM',
    '05:30 PM – 07:00 PM',
  ];
  const today = new Date();
  for (let d = 0; d < 14; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    date.setHours(0, 0, 0, 0);
    for (const timeSlot of slotTimes) {
      const [existing] = await db.select().from(availableSlotsTable).where(
        and(
          eq(availableSlotsTable.date, date),
          eq(availableSlotsTable.timeSlot, timeSlot)
        )
      );
      if (!existing) {
        await db.insert(availableSlotsTable).values({
          date,
          timeSlot,
          maxBookings: 3,
          currentBookings: 0,
          isAvailable: true,
        });
      }
    }
  }
  console.log('[Seed] 14-day schedule and time slots seeded.');
  console.log('[Seed] All catalog seeding complete and idempotent.');
}

seedServiceCatalog()
  .then(() => {
    console.log('[Seed] seed-service-catalog finished successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Seed] Error in seed-service-catalog:', err);
    process.exit(1);
  });
