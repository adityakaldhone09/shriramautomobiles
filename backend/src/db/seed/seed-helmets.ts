import fs from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { db, ensureDbInitialized } from '../client';
import {
  helmetBrandsTable,
  helmetInventoryTable,
  helmetProductsTable,
  helmetSizesTable,
  helmetTypesTable,
  helmetVariantsTable,
} from '../schema';
import { parseCsv, resolveDataPath } from './utils';

async function upsertBrand(row: Record<string, string>) {
  const slug = row.brand_slug;
  if (!slug) return null;
  const [existing] = await db.select().from(helmetBrandsTable).where(eq(helmetBrandsTable.slug, slug)).limit(1);
  if (existing) {
    return existing;
  }

  const [created] = await db.insert(helmetBrandsTable).values({
    brandId: row.brand_id,
    name: row.brand_name,
    slug,
    country: row.country,
    originYear: parseInt(row.origin_year || '2000', 10),
  }).returning();
  return created;
}

async function upsertType(row: Record<string, string>) {
  const slug = row.type_slug;
  if (!slug) return null;
  const [existing] = await db.select().from(helmetTypesTable).where(eq(helmetTypesTable.slug, slug)).limit(1);
  if (existing) {
    return existing;
  }

  const [created] = await db.insert(helmetTypesTable).values({
    typeId: row.type_id,
    name: row.type_name,
    slug,
    description: row.description,
  }).returning();
  return created;
}

async function upsertProduct(row: Record<string, string>, brandId: number, typeId: number) {
  const slug = row.slug;
  if (!slug) return null;
  const [existing] = await db.select().from(helmetProductsTable).where(eq(helmetProductsTable.slug, slug)).limit(1);
  if (existing) {
    return existing;
  }

  const [created] = await db.insert(helmetProductsTable).values({
    productId: row.product_id,
    brandId,
    typeId,
    name: row.name,
    slug,
    basePrice: row.base_price || '0.00',
    description: row.description,
    isActive: true,
  }).returning();
  return created;
}

async function upsertVariant(row: Record<string, string>, productId: number) {
  const variantId = row.variant_id;
  if (!variantId) return null;
  const [existing] = await db.select().from(helmetVariantsTable).where(eq(helmetVariantsTable.variantId, variantId)).limit(1);
  if (existing) {
    return existing;
  }

  const [created] = await db.insert(helmetVariantsTable).values({
    variantId,
    productId,
    color: row.color,
    finish: row.finish,
    visorType: row.visor_type,
    mrp: row.mrp || '0.00',
  }).returning();
  return created;
}

async function upsertSize(row: Record<string, string>) {
  const code = row.code;
  if (!code) return null;
  const [existing] = await db.select().from(helmetSizesTable).where(eq(helmetSizesTable.code, code)).limit(1);
  if (existing) {
    return existing;
  }

  const [created] = await db.insert(helmetSizesTable).values({
    code,
    label: row.label,
    headCircumferenceCm: row.head_circumference_cm,
  }).returning();
  return created;
}

export async function seedHelmets() {
  await ensureDbInitialized();

  const brandsPath = resolveDataPath('helmets/helmet_brands.csv');
  const productBrandMap = new Map<string, number>();
  if (brandsPath) {
    const content = await fs.readFile(brandsPath, 'utf-8');
    const rows = parseCsv(content);
    for (const row of rows) {
      const brand = await upsertBrand(row);
      if (brand) {
        productBrandMap.set(brand.slug, brand.id);
      }
    }
  }

  const typesPath = resolveDataPath('helmets/helmet_types.csv');
  const productTypeMap = new Map<string, number>();
  if (typesPath) {
    const content = await fs.readFile(typesPath, 'utf-8');
    const rows = parseCsv(content);
    for (const row of rows) {
      const type = await upsertType(row);
      if (type) {
        productTypeMap.set(type.slug, type.id);
      }
    }
  }

  const productsPath = resolveDataPath('helmets/helmet_products.csv');
  if (productsPath) {
    const content = await fs.readFile(productsPath, 'utf-8');
    const rows = parseCsv(content);
    for (const row of rows) {
      const brandId = productBrandMap.get(row.brand_slug);
      const typeId = productTypeMap.get(row.type_slug);
      if (!brandId || !typeId) continue;
      const product = await upsertProduct(row, brandId, typeId);
      if (!product) continue;
      const variantsPath = resolveDataPath('helmets/helmet_variants.csv');
      if (variantsPath) {
        const variantContent = await fs.readFile(variantsPath, 'utf-8');
        const variantRows = parseCsv(variantContent);
        for (const variantRow of variantRows) {
          if (variantRow.product_id !== row.product_id) continue;
          const variant = await upsertVariant(variantRow, product.id);
          if (!variant) continue;

          const sizeMappingsPath = resolveDataPath('helmets/helmet_size_mappings.csv');
          if (sizeMappingsPath) {
            const mappingContent = await fs.readFile(sizeMappingsPath, 'utf-8');
            const mappingRows = parseCsv(mappingContent);
            const inventoryPath = resolveDataPath('helmets/helmet_inventory.csv');
            const inventoryContent = inventoryPath ? await fs.readFile(inventoryPath, 'utf-8') : '';
            const inventoryRows = inventoryContent ? parseCsv(inventoryContent) : [];

            for (const mappingRow of mappingRows) {
              if (mappingRow.variant_id !== variantRow.variant_id) continue;
              const size = await upsertSize((await fs.readFile(resolveDataPath('helmets/helmet_sizes.csv')!, 'utf-8')) ? parseCsv(await fs.readFile(resolveDataPath('helmets/helmet_sizes.csv')!, 'utf-8')).find((item) => item.size_id === mappingRow.size_id) || {} : {});
              const inventoryRow = inventoryRows.find((item) => item.sku === mappingRow.sku);
              if (!size || !inventoryRow) continue;
              const [existingInventory] = await db.select().from(helmetInventoryTable).where(eq(helmetInventoryTable.sku, mappingRow.sku)).limit(1);
              if (!existingInventory) {
                await db.insert(helmetInventoryTable).values({
                  sku: mappingRow.sku,
                  variantId: variant.id,
                  sizeId: size.id,
                  location: inventoryRow.location || 'Sangola Retail Shelf',
                  quantity: parseInt(inventoryRow.quantity || '0', 10),
                  reorderLevel: parseInt(inventoryRow.reorder_level || '2', 10),
                });
              }
            }
          }
        }
      }
    }
  }

  const sizesPath = resolveDataPath('helmets/helmet_sizes.csv');
  if (sizesPath) {
    const content = await fs.readFile(sizesPath, 'utf-8');
    const rows = parseCsv(content);
    for (const row of rows) {
      await upsertSize(row);
    }
  }
}
