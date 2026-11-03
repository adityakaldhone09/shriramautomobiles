import { eq, desc, lte, and, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { servicePartsTable } from '../../db/schema/parts';
import { inventoryMovementsTable } from '../../db/schema/inventory';

export class InventoryService {
  async listInventory(filters: { search?: string; category?: string; lowStockOnly?: boolean } = {}) {
    let query = db.select().from(servicePartsTable);
    const conditions = [];

    if (filters.category) {
      conditions.push(eq(servicePartsTable.category, filters.category));
    }
    if (filters.lowStockOnly) {
      conditions.push(lte(servicePartsTable.stockQuantity, servicePartsTable.lowStockThreshold));
    }
    if (filters.search) {
      const s = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        sql`LOWER(${servicePartsTable.name}) LIKE ${s} OR LOWER(${servicePartsTable.sku}) LIKE ${s} OR LOWER(${servicePartsTable.brand}) LIKE ${s}`
      );
    }

    if (conditions.length > 0) {
      return db.select().from(servicePartsTable).where(and(...conditions)).orderBy(servicePartsTable.name);
    }
    return db.select().from(servicePartsTable).orderBy(servicePartsTable.name);
  }

  async adjustStock(params: {
    partId: number;
    quantityChange: number;
    movementType: string;
    notes?: string;
    location?: string;
    performedByUserId?: number;
    allowNegative?: boolean;
  }) {
    const { partId, quantityChange, movementType, notes, location = 'Retail Store', performedByUserId, allowNegative = false } = params;

    const [part] = await db.select().from(servicePartsTable).where(eq(servicePartsTable.id, partId));
    if (!part) {
      throw new Error('Part not found');
    }

    const previousStock = Number(part.stockQuantity ?? 0);
    const newStock = previousStock + Number(quantityChange);

    // Master Rule: Never allow negative inventory without an explicit authorized adjustment
    if (newStock < 0 && !allowNegative) {
      throw new Error(`Insufficient inventory: Current stock is ${previousStock}, requested deduction is ${Math.abs(quantityChange)}.`);
    }

    // Update part stock
    const [updatedPart] = await db
      .update(servicePartsTable)
      .set({
        stockQuantity: newStock,
        updatedAt: new Date(),
      })
      .where(eq(servicePartsTable.id, partId))
      .returning();

    // Create immutable stock movement record
    const [movement] = await db
      .insert(inventoryMovementsTable)
      .values({
        partId,
        movementType,
        quantity: quantityChange,
        previousStock,
        newStock,
        referenceType: 'MANUAL_ADJUSTMENT',
        referenceId: `ADJ-${Date.now()}`,
        location,
        notes: notes || `Stock adjustment (${movementType})`,
        performedByUserId: performedByUserId || null,
      })
      .returning();

    return { part: updatedPart, movement };
  }

  async listMovements(filters: { partId?: number; movementType?: string; limit?: number } = {}) {
    let query = db.select().from(inventoryMovementsTable);
    const conditions = [];

    if (filters.partId) {
      conditions.push(eq(inventoryMovementsTable.partId, filters.partId));
    }
    if (filters.movementType) {
      conditions.push(eq(inventoryMovementsTable.movementType, filters.movementType));
    }

    const limit = Math.min(filters.limit || 50, 100);

    if (conditions.length > 0) {
      return db
        .select()
        .from(inventoryMovementsTable)
        .where(and(...conditions))
        .orderBy(desc(inventoryMovementsTable.createdAt))
        .limit(limit);
    }

    return db
      .select()
      .from(inventoryMovementsTable)
      .orderBy(desc(inventoryMovementsTable.createdAt))
      .limit(limit);
  }
}

export const inventoryService = new InventoryService();
