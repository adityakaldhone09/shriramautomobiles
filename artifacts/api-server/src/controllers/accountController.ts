import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { addressesTable, usersTable, vehiclesTable } from '@workspace/db/schema';
import { createResponse } from '../utils/helpers';
import { getAuthUser } from '../middlewares/auth';

export async function listVehicles(req: Request, res: Response) {
  const user = getAuthUser(req);
  const [account] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  const vehicles = await db
    .select()
    .from(vehiclesTable)
    .where(
      account?.customerId
        ? and(eq(vehiclesTable.customerId, account.customerId))
        : and(eq(vehiclesTable.userId, user.id))
    );
  return res.json(createResponse(true, 'Vehicles fetched', vehicles));
}

export async function createVehicle(req: Request, res: Response) {
  const user = getAuthUser(req);
  const {
    brand,
    model,
    vehicleType = 'Motorcycle',
    registrationNumber,
    vehicleAge,
    vehicleModelId,
    nickname,
    manufactureYear,
    variant,
    color,
    notes,
  } = req.body;

  if (!brand || !model || !registrationNumber) {
    return res.status(400).json(
      createResponse(false, 'Vehicle brand, model, and registration number are required', undefined, 'VALIDATION_ERROR')
    );
  }

  const [account] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  const customerId = account?.customerId || null;

  const [vehicle] = await db
    .insert(vehiclesTable)
    .values({
      userId: user.id,
      customerId: customerId || undefined,
      vehicleModelId: vehicleModelId ? Number(vehicleModelId) : null,
      brand,
      model,
      vehicleType,
      registrationNumber: registrationNumber.toUpperCase(),
      nickname: nickname || null,
      manufactureYear: manufactureYear ? Number(manufactureYear) : null,
      variant: variant || null,
      color: color || null,
      notes: notes || null,
      vehicleAge: vehicleAge ? Number(vehicleAge) : null,
    })
    .returning();

  return res.status(201).json(createResponse(true, 'Vehicle added', vehicle));
}

export async function updateVehicle(req: Request, res: Response) {
  const user = getAuthUser(req);
  const [account] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  const customerId = account?.customerId || null;
  const vehicleId = Number(req.params.id);

  const {
    brand,
    model,
    vehicleType,
    registrationNumber,
    vehicleAge,
    vehicleModelId,
    nickname,
    manufactureYear,
    variant,
    color,
    notes,
  } = req.body;

  const whereClause = customerId
    ? and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.customerId, customerId))
    : and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, user.id));

  const [vehicle] = await db
    .update(vehiclesTable)
    .set({
      brand,
      model,
      vehicleType,
      registrationNumber: registrationNumber ? registrationNumber.toUpperCase() : undefined,
      vehicleModelId: vehicleModelId !== undefined ? Number(vehicleModelId) : undefined,
      nickname,
      manufactureYear: manufactureYear ? Number(manufactureYear) : undefined,
      variant,
      color,
      notes,
      vehicleAge: vehicleAge ? Number(vehicleAge) : undefined,
      updatedAt: new Date(),
    })
    .where(whereClause)
    .returning();

  if (!vehicle) return res.status(404).json(createResponse(false, 'Vehicle not found or unauthorized', undefined, 'NOT_FOUND'));
  return res.json(createResponse(true, 'Vehicle updated', vehicle));
}

export async function deleteVehicle(req: Request, res: Response) {
  const user = getAuthUser(req);
  const [account] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  const customerId = account?.customerId || null;
  const vehicleId = Number(req.params.id);

  const whereClause = customerId
    ? and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.customerId, customerId))
    : and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, user.id));

  const deleted = await db.delete(vehiclesTable).where(whereClause).returning();

  if (!deleted.length) return res.status(404).json(createResponse(false, 'Vehicle not found or unauthorized', undefined, 'NOT_FOUND'));
  return res.json(createResponse(true, 'Vehicle removed', deleted[0]));
}

export async function listAddresses(req: Request, res: Response) {
  const addresses = await db.select().from(addressesTable).where(eq(addressesTable.userId, getAuthUser(req).id));
  return res.json(createResponse(true, 'Addresses fetched', addresses));
}

export async function createAddress(req: Request, res: Response) {
  const userId = getAuthUser(req).id;
  const { addressLine, city, state = 'Maharashtra', pinCode, isDefault = false } = req.body;
  if (!addressLine || !city || !pinCode) return res.status(400).json(createResponse(false, 'Address, city and PIN code are required', undefined, 'VALIDATION_ERROR'));
  const [address] = await db.insert(addressesTable).values({ userId, addressLine, city, state, pinCode, isDefault }).returning();
  return res.status(201).json(createResponse(true, 'Address saved', address));
}

export async function updateAddress(req: Request, res: Response) {
  const { addressLine, city, state, pinCode, isDefault } = req.body;
  const [address] = await db.update(addressesTable).set({ addressLine, city, state, pinCode, isDefault }).where(and(eq(addressesTable.id, Number(req.params.id)), eq(addressesTable.userId, getAuthUser(req).id))).returning();
  if (!address) return res.status(404).json(createResponse(false, 'Address not found', undefined, 'NOT_FOUND'));
  return res.json(createResponse(true, 'Address updated', address));
}

export async function deleteAddress(req: Request, res: Response) {
  const [address] = await db.delete(addressesTable).where(and(eq(addressesTable.id, Number(req.params.id)), eq(addressesTable.userId, getAuthUser(req).id))).returning();
  if (!address) return res.status(404).json(createResponse(false, 'Address not found', undefined, 'NOT_FOUND'));
  return res.json(createResponse(true, 'Address deleted', address));
}
