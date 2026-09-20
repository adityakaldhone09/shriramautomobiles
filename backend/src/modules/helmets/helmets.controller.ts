import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { helmetBrandsTable, helmetProductsTable, helmetTypesTable, helmetVariantsTable } from '../../db/schema';
import { createResponse } from '../../utils/helpers';

export class HelmetsController {
  async getBrands(_req: Request, res: Response) {
    const brands = await db.select().from(helmetBrandsTable).where(eq(helmetBrandsTable.isActive, true));
    return res.json(createResponse(true, 'Helmet brands fetched', brands));
  }

  async getTypes(_req: Request, res: Response) {
    const types = await db.select().from(helmetTypesTable);
    return res.json(createResponse(true, 'Helmet types fetched', types));
  }

  async getProducts(_req: Request, res: Response) {
    const products = await db.select().from(helmetProductsTable).where(eq(helmetProductsTable.isActive, true));
    return res.json(createResponse(true, 'Helmet products fetched', products));
  }

  async getProductById(req: Request, res: Response) {
    const id = parseInt(req.params.id, 10);
    const [product] = await db.select().from(helmetProductsTable).where(eq(helmetProductsTable.id, id));
    if (!product) return res.status(404).json(createResponse(false, 'Helmet not found', undefined, 'NOT_FOUND'));
    const variants = await db.select().from(helmetVariantsTable).where(eq(helmetVariantsTable.productId, id));
    return res.json(createResponse(true, 'Helmet details fetched', { ...product, variants }));
  }
}

export const helmetsController = new HelmetsController();
