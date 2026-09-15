import { eq, and } from 'drizzle-orm';
import { db } from '../../db/client';
import { productVehicleModelsTable, sparePartsTable, vehicleModelsTable } from '../../db/schema';
import type { SparePartFilter } from './parts.types';

export class PartsService {
  async getParts(filter: SparePartFilter) {
    const filters = [eq(sparePartsTable.isActive, true)];
    if (filter.brand) filters.push(eq(sparePartsTable.brand, filter.brand));
    if (filter.category) filters.push(eq(sparePartsTable.category, filter.category));
    const parts = await db.select().from(sparePartsTable).where(and(...filters));

    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      return parts.filter(
        (part) =>
          part.name.toLowerCase().includes(searchTerm) ||
          part.description?.toLowerCase().includes(searchTerm)
      );
    }
    return parts;
  }

  async getPartById(id: number) {
    const [part] = await db.select().from(sparePartsTable).where(eq(sparePartsTable.id, id));
    return part || null;
  }

  async getCategories() {
    const categories = await db
      .selectDistinct({ category: sparePartsTable.category })
      .from(sparePartsTable)
      .where(eq(sparePartsTable.isActive, true));
    return categories.map((c) => c.category);
  }

  async getCompatibleParts(vehicleModelId: number) {
    return db
      .select({
        id: sparePartsTable.id,
        sku: sparePartsTable.sku,
        name: sparePartsTable.name,
        category: sparePartsTable.category,
        subCategory: sparePartsTable.subCategory,
        description: sparePartsTable.description,
        brand: sparePartsTable.brand,
        partType: sparePartsTable.partType,
        price: sparePartsTable.price,
        availability: sparePartsTable.availability,
        stockQuantity: sparePartsTable.stockQuantity,
        fitmentConfidence: productVehicleModelsTable.fitmentConfidence,
        notes: productVehicleModelsTable.notes,
      })
      .from(productVehicleModelsTable)
      .innerJoin(sparePartsTable, eq(productVehicleModelsTable.partId, sparePartsTable.id))
      .innerJoin(vehicleModelsTable, eq(productVehicleModelsTable.vehicleModelId, vehicleModelsTable.id))
      .where(and(eq(productVehicleModelsTable.vehicleModelId, vehicleModelId), eq(sparePartsTable.isActive, true)));
  }

  async createPart(data: any) {
    const [newPart] = await db.insert(sparePartsTable).values(data).returning();
    return newPart;
  }

  async updatePart(id: number, data: any) {
    const [updated] = await db
      .update(sparePartsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sparePartsTable.id, id))
      .returning();
    return updated || null;
  }

  async deletePart(id: number) {
    const [deleted] = await db.delete(sparePartsTable).where(eq(sparePartsTable.id, id)).returning();
    return deleted || null;
  }
}

export const partsService = new PartsService();
