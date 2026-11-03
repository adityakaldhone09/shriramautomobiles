import { eq, desc, and } from 'drizzle-orm';
import { db } from '../../db/client';
import { purchaseOrdersTable, purchaseOrderItemsTable, suppliersTable, type PurchaseOrder } from '../../db/schema/suppliers';
import { servicePartsTable } from '../../db/schema/parts';
import { inventoryMovementsTable } from '../../db/schema/inventory';

export interface CreatePOItemInput {
  partId?: number;
  partName: string;
  sku?: string;
  quantityOrdered: number;
  unitCost: number;
}

export class PurchaseOrdersService {
  async listPurchaseOrders(filters: { status?: string; supplierId?: number } = {}) {
    let query = db
      .select({
        po: purchaseOrdersTable,
        supplierName: suppliersTable.name,
        supplierCode: suppliersTable.code,
      })
      .from(purchaseOrdersTable)
      .leftJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id));

    const conditions = [];
    if (filters.status) {
      conditions.push(eq(purchaseOrdersTable.status, filters.status));
    }
    if (filters.supplierId) {
      conditions.push(eq(purchaseOrdersTable.supplierId, filters.supplierId));
    }

    if (conditions.length > 0) {
      const rows = await db
        .select({
          po: purchaseOrdersTable,
          supplierName: suppliersTable.name,
          supplierCode: suppliersTable.code,
        })
        .from(purchaseOrdersTable)
        .leftJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
        .where(and(...conditions))
        .orderBy(desc(purchaseOrdersTable.createdAt));
      return rows.map((r) => ({ ...r.po, supplierName: r.supplierName, supplierCode: r.supplierCode }));
    }

    const rows = await db
      .select({
        po: purchaseOrdersTable,
        supplierName: suppliersTable.name,
        supplierCode: suppliersTable.code,
      })
      .from(purchaseOrdersTable)
      .leftJoin(suppliersTable, eq(purchaseOrdersTable.supplierId, suppliersTable.id))
      .orderBy(desc(purchaseOrdersTable.createdAt));
    return rows.map((r) => ({ ...r.po, supplierName: r.supplierName, supplierCode: r.supplierCode }));
  }

  async getPurchaseOrderById(id: number) {
    const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
    if (!po) return null;

    let supplier = null;
    if (po.supplierId) {
      const [s] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, po.supplierId));
      supplier = s;
    }

    const items = await db
      .select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.purchaseOrderId, id));

    return { ...po, supplier, items };
  }

  async createPurchaseOrder(data: {
    supplierId: number;
    destination?: string;
    expectedDate?: Date;
    notes?: string;
    items: CreatePOItemInput[];
  }) {
    if (!data.items || data.items.length === 0) {
      throw new Error('At least one item is required in a purchase order');
    }

    const orderNumber = `PO-${Date.now().toString().slice(-8)}`;

    let subtotal = 0;
    for (const item of data.items) {
      const qty = Math.max(1, Number(item.quantityOrdered || 1));
      const cost = Math.max(0, Number(item.unitCost || 0));
      subtotal += qty * cost;
    }

    const taxAmount = subtotal * 0.18; // 18% standard automotive parts GST
    const totalAmount = subtotal + taxAmount;

    const [po] = await db
      .insert(purchaseOrdersTable)
      .values({
        orderNumber,
        supplierId: data.supplierId,
        destination: data.destination || 'Retail Store',
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        status: 'ORDERED',
        paymentStatus: 'UNPAID',
        paidAmount: '0.00',
        expectedDate: data.expectedDate || null,
        notes: data.notes || null,
      })
      .returning();

    const createdItems = [];
    for (const item of data.items) {
      const qty = Math.max(1, Number(item.quantityOrdered || 1));
      const cost = Math.max(0, Number(item.unitCost || 0));
      const totalCost = (qty * cost).toFixed(2);

      const [createdItem] = await db
        .insert(purchaseOrderItemsTable)
        .values({
          purchaseOrderId: po.id,
          partId: item.partId || null,
          partName: item.partName,
          sku: item.sku || null,
          quantityOrdered: qty,
          quantityReceived: 0,
          unitCost: cost.toFixed(2),
          totalCost,
        })
        .returning();
      createdItems.push(createdItem);
    }

    return { ...po, items: createdItems };
  }

  async receivePurchaseOrder(poId: number, performedByUserId?: number) {
    const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, poId));
    if (!po) throw new Error('Purchase order not found');

    if (po.status === 'RECEIVED') {
      throw new Error('Purchase order is already received');
    }

    const items = await db
      .select()
      .from(purchaseOrderItemsTable)
      .where(eq(purchaseOrderItemsTable.purchaseOrderId, poId));

    // Update PO to RECEIVED
    const [updatedPo] = await db
      .update(purchaseOrdersTable)
      .set({
        status: 'RECEIVED',
        receivedDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrdersTable.id, poId))
      .returning();

    // Process each item: update received quantity and restock inventory with audit movements
    for (const item of items) {
      await db
        .update(purchaseOrderItemsTable)
        .set({
          quantityReceived: item.quantityOrdered,
        })
        .where(eq(purchaseOrderItemsTable.id, item.id));

      if (item.partId) {
        const [part] = await db.select().from(servicePartsTable).where(eq(servicePartsTable.id, item.partId));
        if (part) {
          const previousStock = Number(part.stockQuantity ?? 0);
          const newStock = previousStock + item.quantityOrdered;

          await db
            .update(servicePartsTable)
            .set({
              stockQuantity: newStock,
              updatedAt: new Date(),
            })
            .where(eq(servicePartsTable.id, item.partId));

          await db.insert(inventoryMovementsTable).values({
            partId: item.partId,
            movementType: 'PO_RECEIPT',
            quantity: item.quantityOrdered,
            previousStock,
            newStock,
            referenceType: 'PURCHASE_ORDER',
            referenceId: po.orderNumber,
            location: po.destination,
            notes: `Received PO #${po.orderNumber}`,
            performedByUserId: performedByUserId || null,
          });
        }
      }
    }

    return this.getPurchaseOrderById(poId);
  }

  async updateStatus(id: number, status: string) {
    const [updated] = await db
      .update(purchaseOrdersTable)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrdersTable.id, id))
      .returning();

    return updated;
  }
}

export const purchaseOrdersService = new PurchaseOrdersService();

