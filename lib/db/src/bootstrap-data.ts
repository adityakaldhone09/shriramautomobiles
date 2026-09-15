import fs from 'node:fs';
import path from 'node:path';

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
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

function resolveCsvSync(fileName: string): string | null {
  const metaDir = typeof import.meta !== 'undefined' && import.meta.dirname ? import.meta.dirname : '';
  const possible = [
    path.resolve(process.cwd(), 'data/csv', fileName),
    path.resolve(process.cwd(), '../data/csv', fileName),
    path.resolve(process.cwd(), '../../data/csv', fileName),
    path.resolve('/Users/adityak/Projects/ShriramAutomobiles/data/csv', fileName),
    metaDir ? path.resolve(metaDir, '../../../../data/csv', fileName) : '',
    metaDir ? path.resolve(metaDir, '../../../data/csv', fileName) : '',
  ].filter(Boolean);
  for (const p of possible) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function bootstrapDatabaseData(pool: any) {
  try {
    // 1. Vehicles & Brands
    const vPath = resolveCsvSync('vehicle_models.csv');
    if (vPath) {
      const rows = parseCsv(fs.readFileSync(vPath, 'utf8'));
      for (const r of rows) {
        if (!r.brand_slug || !r.model_slug) continue;
        const brandRes = await pool.query(
          `INSERT INTO brands (name, slug, is_active) VALUES ($1, $2, TRUE) ON CONFLICT (slug) DO NOTHING RETURNING id;`,
          [r.brand_name, r.brand_slug]
        );
        let brandId = brandRes?.rows?.[0]?.id;
        if (!brandId) {
          const sel = await pool.query(`SELECT id FROM brands WHERE slug = $1;`, [r.brand_slug]);
          brandId = sel?.rows?.[0]?.id;
        }
        if (brandId) {
          await pool.query(
            `INSERT INTO vehicle_models (brand_id, name, slug, vehicle_type, engine_class, is_active)
             VALUES ($1, $2, $3, $4, $5, TRUE) ON CONFLICT (slug) DO NOTHING;`,
            [brandId, r.model_name, r.model_slug, r.vehicle_type || 'Motorcycle', r.engine_class || null]
          );
        }
      }
    }

    // 2. Parts & Categories
    const pPath = resolveCsvSync('service_parts_catalog.csv');
    if (pPath) {
      const rows = parseCsv(fs.readFileSync(pPath, 'utf8'));
      for (const r of rows) {
        if (!r.sku || !r.name || !r.category) continue;
        const catSlug = slugify(r.category);
        const catRes = await pool.query(
          `INSERT INTO part_categories (name, slug, description, is_active) VALUES ($1, $2, $3, TRUE) ON CONFLICT (slug) DO NOTHING RETURNING id;`,
          [r.category, catSlug, `${r.category} components`]
        );
        let catId = catRes?.rows?.[0]?.id;
        if (!catId) {
          const sel = await pool.query(`SELECT id FROM part_categories WHERE slug = $1;`, [catSlug]);
          catId = sel?.rows?.[0]?.id;
        }
        await pool.query(
          `INSERT INTO service_parts (sku, name, slug, category_id, category, sub_category, description, part_type, price, purchase_price, stock_quantity, low_stock_threshold, supplier, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE) ON CONFLICT (sku) DO NOTHING;`,
          [
            r.sku,
            r.name,
            slugify(r.name),
            catId,
            r.category,
            r.sub_category || null,
            r.description || null,
            r.part_type || 'Replacement',
            r.price || '0.00',
            r.purchase_price || '0.00',
            parseInt(r.stock_quantity || '10', 10),
            parseInt(r.low_stock_threshold || '5', 10),
            r.supplier || 'Shriram Genuine Parts',
          ]
        );
      }
    }

    // 3. Compatibility
    const cPath = resolveCsvSync('vehicle_part_compatibility.csv');
    if (cPath) {
      const rows = parseCsv(fs.readFileSync(cPath, 'utf8'));
      for (const r of rows) {
        if (!r.model_slug || !r.part_sku) continue;
        const mRes = await pool.query(`SELECT id FROM vehicle_models WHERE slug = $1;`, [r.model_slug]);
        const pRes = await pool.query(`SELECT id FROM service_parts WHERE sku = $1;`, [r.part_sku]);
        const modelId = mRes?.rows?.[0]?.id;
        const partId = pRes?.rows?.[0]?.id;
        if (modelId && partId) {
          const ex = await pool.query(
            `SELECT id FROM vehicle_part_compatibility WHERE vehicle_model_id = $1 AND part_id = $2;`,
            [modelId, partId]
          );
          if (!ex?.rows?.length) {
            await pool.query(
              `INSERT INTO vehicle_part_compatibility (vehicle_model_id, part_id, fitment_confidence, notes, is_active)
               VALUES ($1, $2, $3, $4, TRUE);`,
              [modelId, partId, r.fitment_confidence || 'MODEL_SPECIFIC', r.notes || null]
            );
          }
        }
      }
    }

    // 4. Services
    const sPath = resolveCsvSync('service_packages.csv');
    if (sPath) {
      const rows = parseCsv(fs.readFileSync(sPath, 'utf8'));
      for (const r of rows) {
        if (!r.name || !r.slug) continue;
        await pool.query(
          `INSERT INTO services (name, slug, description, vehicle_type, typical_duration_minutes, estimated_duration, starting_price, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) ON CONFLICT (slug) DO NOTHING;`,
          [
            JSON.stringify({ en: r.name, hi: r.name, mr: r.name }),
            r.slug,
            JSON.stringify({ en: r.description, hi: r.description, mr: r.description }),
            r.vehicle_type || 'All',
            parseInt(r.typical_duration_minutes || '60', 10),
            `${r.typical_duration_minutes || 60} mins`,
            r.starting_price || '299.00',
          ]
        );
      }
    }

    // 5. Symptoms and Mappings
    const symPath = resolveCsvSync('service_symptom_map.csv');
    if (symPath) {
      const rows = parseCsv(fs.readFileSync(symPath, 'utf8'));
      for (const r of rows) {
        if (!r.symptom_id || !r.symptom) continue;
        const sRes = await pool.query(
          `INSERT INTO service_symptoms (symptom_id, symptom, slug, description, severity, is_active)
           VALUES ($1, $2, $3, $4, $5, TRUE) ON CONFLICT (symptom_id) DO NOTHING RETURNING id;`,
          [r.symptom_id, r.symptom, slugify(r.symptom), r.description || null, r.severity || 'MEDIUM']
        );
        let symptomDbId = sRes?.rows?.[0]?.id;
        if (!symptomDbId) {
          const sel = await pool.query(`SELECT id FROM service_symptoms WHERE symptom_id = $1;`, [r.symptom_id]);
          symptomDbId = sel?.rows?.[0]?.id;
        }
        if (symptomDbId && r.service_slugs) {
          const slugs = r.service_slugs.split(';').map((s) => s.trim()).filter(Boolean);
          for (let i = 0; i < slugs.length; i++) {
            const slug = slugs[i];
            const svc = await pool.query(`SELECT id FROM services WHERE slug = $1;`, [slug]);
            const svcId = svc?.rows?.[0]?.id;
            if (svcId) {
              await pool.query(
                `INSERT INTO symptom_service_mapping (symptom_id, service_id, priority) VALUES ($1, $2, $3);`,
                [symptomDbId, svcId, i + 1]
              );
            }
          }
        }
        if (symptomDbId && r.part_skus) {
          const skus = r.part_skus.split(';').map((s) => s.trim()).filter(Boolean);
          for (let i = 0; i < skus.length; i++) {
            const sku = skus[i];
            const prt = await pool.query(`SELECT id FROM service_parts WHERE sku = $1;`, [sku]);
            const prtId = prt?.rows?.[0]?.id;
            if (prtId) {
              await pool.query(
                `INSERT INTO symptom_part_mapping (symptom_id, part_id, priority, reasoning) VALUES ($1, $2, $3, $4);`,
                [symptomDbId, prtId, i + 1, r.reasoning || null]
              );
            }
          }
        }
      }
    }

    // 6. Mechanics
    const defaultMechanics = [
      ['Ramesh Patil', '9822101122', 14, 'Engine Overhaul & CVT Specialist', 'Marathi, Hindi'],
      ['Sachin Shinde', '9822103344', 9, 'Periodic Maintenance & Brake Expert', 'Marathi, Hindi'],
      ['Anand Kulkarni', '9822105566', 11, 'Auto Electrical & Diagnostic Lead', 'Marathi, Hindi, English'],
      ['Vinayak Jadhav', '9822107788', 7, 'Suspension, Wheel Alignment & Tyres', 'Marathi, Hindi'],
    ];
    for (const [name, phone, exp, spec, langs] of defaultMechanics) {
      await pool.query(
        `INSERT INTO mechanics (name, phone, experience, specialization, languages, is_available)
         VALUES ($1, $2, $3, $4, $5, TRUE);`,
        [name, phone, exp, spec, langs]
      );
    }

    // 7. Time slots for next 14 days
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
        await pool.query(
          `INSERT INTO available_slots (date, time_slot, max_bookings, current_bookings, is_available)
           VALUES ($1, $2, 3, 0, TRUE);`,
          [date.toISOString(), timeSlot]
        );
      }
    }
  } catch (err: any) {
    console.error('Error during database bootstrap:', err.message);
  }
}
