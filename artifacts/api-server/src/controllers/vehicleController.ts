import type { Request, Response } from 'express';
import { asc, eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { brandsTable, vehicleModelsTable } from '@workspace/db/schema';
import { createResponse } from '../utils/helpers';

export async function listVehicleBrands(_req: Request, res: Response) {
  const brands = await db.select({ id: brandsTable.id, name: brandsTable.name, slug: brandsTable.slug }).from(brandsTable).where(eq(brandsTable.isActive, true)).orderBy(asc(brandsTable.name));
  return res.json(createResponse(true, 'Vehicle brands fetched', brands));
}

export async function listVehicleModels(req: Request, res: Response) {
  const brandId = Number(req.query.brandId);
  const models = await db
    .select({
      id: vehicleModelsTable.id,
      brandId: vehicleModelsTable.brandId,
      brandName: brandsTable.name,
      brand: brandsTable.name,
      name: vehicleModelsTable.name,
      model: vehicleModelsTable.name,
      slug: vehicleModelsTable.slug,
      vehicleType: vehicleModelsTable.vehicleType,
      engineClass: vehicleModelsTable.engineClass,
      isActive: vehicleModelsTable.isActive,
    })
    .from(vehicleModelsTable)
    .leftJoin(brandsTable, eq(vehicleModelsTable.brandId, brandsTable.id))
    .where(Number.isInteger(brandId) && brandId > 0 ? eq(vehicleModelsTable.brandId, brandId) : undefined)
    .orderBy(asc(brandsTable.name), asc(vehicleModelsTable.name));
  return res.json(createResponse(true, 'Vehicle models fetched', models));
}
