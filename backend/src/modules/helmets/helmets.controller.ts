import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  helmetBrandsTable,
  helmetInventoryTable,
  helmetProductsTable,
  helmetSizesTable,
  helmetTypesTable,
  helmetVariantsTable,
} from '../../db/schema';
import { createResponse } from '../../utils/helpers';

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function buildHelmetProductPayload(product: typeof helmetProductsTable.$inferSelect) {
  const [brand] = product.brandId ? await db.select().from(helmetBrandsTable).where(eq(helmetBrandsTable.id, product.brandId)).limit(1) : [null];
  const [type] = product.typeId ? await db.select().from(helmetTypesTable).where(eq(helmetTypesTable.id, product.typeId)).limit(1) : [null];
  const variants = await db.select().from(helmetVariantsTable).where(eq(helmetVariantsTable.productId, product.id));

  const detailedVariants = await Promise.all(
    variants.map(async (variant) => {
      const inventoryRows = await db
        .select({
          id: helmetInventoryTable.id,
          sku: helmetInventoryTable.sku,
          quantity: helmetInventoryTable.quantity,
          location: helmetInventoryTable.location,
          reorderLevel: helmetInventoryTable.reorderLevel,
          size: {
            id: helmetSizesTable.id,
            code: helmetSizesTable.code,
            label: helmetSizesTable.label,
            headCircumferenceCm: helmetSizesTable.headCircumferenceCm,
          },
        })
        .from(helmetInventoryTable)
        .leftJoin(helmetSizesTable, eq(helmetInventoryTable.sizeId, helmetSizesTable.id))
        .where(eq(helmetInventoryTable.variantId, variant.id));

      return {
        ...variant,
        mrp: toNumber(variant.mrp),
        inventory: inventoryRows.map((item) => ({
          ...item,
          quantity: Number(item.quantity ?? 0),
          size: item.size ? {
            ...item.size,
            id: Number(item.size.id ?? 0),
          } : null,
        })),
      };
    })
  );

  return {
    ...product,
    basePrice: toNumber(product.basePrice),
    brand,
    type,
    variants: detailedVariants,
    totalUnits: detailedVariants.reduce((sum, variant) => sum + variant.inventory.reduce((inner, item) => inner + Number(item.quantity || 0), 0), 0),
  };
}

export class HelmetsController {
  async getBrands(_req: Request, res: Response) {
    const brands = await db.select().from(helmetBrandsTable).where(eq(helmetBrandsTable.isActive, true));
    return res.json(createResponse(true, 'Helmet brands fetched', brands));
  }

  async getTypes(_req: Request, res: Response) {
    const types = await db.select().from(helmetTypesTable);
    return res.json(createResponse(true, 'Helmet types fetched', types));
  }

  async getProducts(req: Request, res: Response) {
    const brandId = req.query.brandId ? Number(req.query.brandId) : undefined;
    const typeId = req.query.typeId ? Number(req.query.typeId) : undefined;
    const search = String(req.query.search || '').trim().toLowerCase();

    const products = await db.select().from(helmetProductsTable).where(eq(helmetProductsTable.isActive, true));
    const payload = await Promise.all(products.map((product) => buildHelmetProductPayload(product)));
    const filtered = payload.filter((product) => {
      const matchesBrand = brandId ? product.brandId === brandId : true;
      const matchesType = typeId ? product.typeId === typeId : true;
      const matchesSearch = search ? `${product.name} ${product.description || ''} ${product.brand?.name || ''} ${product.type?.name || ''}`.toLowerCase().includes(search) : true;
      return matchesBrand && matchesType && matchesSearch;
    });

    return res.json(createResponse(true, 'Helmet products fetched', filtered));
  }

  async getProductById(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const [product] = await db.select().from(helmetProductsTable).where(eq(helmetProductsTable.id, id));
    if (!product) {
      return res.status(404).json(createResponse(false, 'Helmet not found', undefined, 'NOT_FOUND'));
    }

    const payload = await buildHelmetProductPayload(product);
    return res.json(createResponse(true, 'Helmet details fetched', payload));
  }
}

export const helmetsController = new HelmetsController();
