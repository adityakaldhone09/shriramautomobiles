import { asc, eq, and } from 'drizzle-orm';
import { db } from '../../db/client';
import { brandsTable, vehicleModelsTable, vehiclesTable, usersTable } from '../../db/schema';
import type { CreateVehicleDTO } from './vehicles.types';

export class VehiclesService {
  async getBrands() {
    return db
      .select({ id: brandsTable.id, name: brandsTable.name, slug: brandsTable.slug })
      .from(brandsTable)
      .where(eq(brandsTable.isActive, true))
      .orderBy(asc(brandsTable.name));
  }

  async getModels(brandId?: number) {
    return db
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
      .where(Number.isInteger(brandId) && (brandId as number) > 0 ? eq(vehicleModelsTable.brandId, brandId as number) : undefined)
      .orderBy(asc(brandsTable.name), asc(vehicleModelsTable.name));
  }

  async getCustomerVehicles(userId: number) {
    const [account] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    return db
      .select()
      .from(vehiclesTable)
      .where(
        account?.customerId
          ? and(eq(vehiclesTable.customerId, account.customerId))
          : and(eq(vehiclesTable.userId, userId))
      );
  }

  async createCustomerVehicle(data: CreateVehicleDTO) {
    const [vehicle] = await db
      .insert(vehiclesTable)
      .values({
        userId: data.userId,
        customerId: data.customerId || undefined,
        vehicleModelId: data.vehicleModelId ? Number(data.vehicleModelId) : null,
        brand: data.brand,
        model: data.model,
        vehicleType: data.vehicleType || 'Motorcycle',
        registrationNumber: data.registrationNumber.toUpperCase(),
        nickname: data.nickname || null,
        manufactureYear: data.manufactureYear ? Number(data.manufactureYear) : null,
        variant: data.variant || null,
        color: data.color || null,
        notes: data.notes || null,
        vehicleAge: data.vehicleAge ? Number(data.vehicleAge) : null,
      })
      .returning();
    return vehicle;
  }
}

export const vehiclesService = new VehiclesService();
