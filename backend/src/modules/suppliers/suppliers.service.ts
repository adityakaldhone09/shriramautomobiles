import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../../db/client';
import { suppliersTable, type Supplier } from '../../db/schema/suppliers';
import { purchaseOrdersTable } from '../../db/schema/suppliers';

export class SuppliersService {
  async listSuppliers(search?: string) {
    if (search) {
      const s = `%${search.toLowerCase()}%`;
      return db
        .select()
        .from(suppliersTable)
        .where(
          sql`LOWER(${suppliersTable.name}) LIKE ${s} OR LOWER(${suppliersTable.code}) LIKE ${s} OR LOWER(${suppliersTable.phone}) LIKE ${s}`
        )
        .orderBy(suppliersTable.name);
    }
    return db.select().from(suppliersTable).orderBy(suppliersTable.name);
  }

  async getSupplierById(id: number) {
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
    if (!supplier) return null;

    const purchaseOrders = await db
      .select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.supplierId, id))
      .orderBy(desc(purchaseOrdersTable.createdAt));

    return { ...supplier, purchaseOrders };
  }

  async createSupplier(data: {
    name: string;
    code?: string;
    contactPerson?: string;
    phone: string;
    email?: string;
    gstin?: string;
    address?: string;
    city?: string;
    state?: string;
    paymentTerms?: string;
  }) {
    const code = data.code || `SUP-${Date.now().toString().slice(-6)}`;
    const [created] = await db
      .insert(suppliersTable)
      .values({
        name: data.name,
        code,
        contactPerson: data.contactPerson || null,
        phone: data.phone,
        email: data.email || null,
        gstin: data.gstin || null,
        address: data.address || null,
        city: data.city || 'Sangola',
        state: data.state || 'Maharashtra',
        paymentTerms: data.paymentTerms || 'NET_30',
        outstandingBalance: '0.00',
        isActive: true,
      })
      .returning();

    return created;
  }

  async updateSupplier(id: number, data: Partial<Supplier>) {
    const [existing] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
    if (!existing) return null;

    const [updated] = await db
      .update(suppliersTable)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(suppliersTable.id, id))
      .returning();

    return updated;
  }
}

export const suppliersService = new SuppliersService();

