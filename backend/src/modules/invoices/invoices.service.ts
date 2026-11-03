import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { invoicesTable, invoiceItemsTable, type Invoice, type InvoiceItem } from '../../db/schema/invoices';
import { serviceBookingsTable, serviceJobCardsTable, jobCardPartsTable } from '../../db/schema/bookings';
import { customersTable } from '../../db/schema/customers';
import { servicePartsTable } from '../../db/schema/parts';
import { inventoryMovementsTable } from '../../db/schema/inventory';

export class InvoicesService {
  async listInvoices(filters: { paymentStatus?: string; invoiceType?: string; search?: string } = {}) {
    const conditions = [];

    if (filters.paymentStatus) {
      conditions.push(eq(invoicesTable.paymentStatus, filters.paymentStatus));
    }
    if (filters.invoiceType) {
      conditions.push(eq(invoicesTable.invoiceType, filters.invoiceType));
    }
    if (filters.search) {
      const s = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        sql`LOWER(${invoicesTable.invoiceNumber}) LIKE ${s} OR LOWER(${invoicesTable.customerName}) LIKE ${s} OR LOWER(${invoicesTable.customerPhone}) LIKE ${s}`
      );
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(invoicesTable)
        .where(and(...conditions))
        .orderBy(desc(invoicesTable.createdAt));
    }

    return db
      .select()
      .from(invoicesTable)
      .orderBy(desc(invoicesTable.createdAt));
  }

  async getInvoiceById(id: number) {
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
    if (!invoice) return null;

    const items = await db
      .select()
      .from(invoiceItemsTable)
      .where(eq(invoiceItemsTable.invoiceId, id));

    return { ...invoice, items };
  }

  async generateFromBooking(params: {
    bookingId: number;
    discountAmount?: number;
    paymentMethod?: string;
    paymentReference?: string;
    paidAmount?: number;
    notes?: string;
  }) {
    const { bookingId, discountAmount = 0, paymentMethod = 'CASH', paymentReference, paidAmount, notes } = params;

    const [booking] = await db.select().from(serviceBookingsTable).where(eq(serviceBookingsTable.id, bookingId));
    if (!booking) throw new Error('Booking not found');

    const [jobCard] = await db.select().from(serviceJobCardsTable).where(eq(serviceJobCardsTable.bookingId, bookingId));
    const partsUsed = jobCard
      ? await db.select().from(jobCardPartsTable).where(eq(jobCardPartsTable.jobCardId, jobCard.id))
      : [];

    let customerName = 'Walk-in Customer';
    let customerPhone = 'N/A';
    let customerGstin = null;

    if (booking.customerId) {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, booking.customerId));
      if (customer) {
        customerName = customer.name;
        customerPhone = customer.phone;
        customerGstin = (customer as any)?.gstin || null;
      }
    }

    // Labour & parts breakdown
    const labourTotal = Number(jobCard?.labourCharges || 0);
    const partsTotal = partsUsed.reduce((sum, p) => sum + Number(p.totalPrice || 0), 0);
    const subtotal = labourTotal + partsTotal;
    const discount = Math.min(Number(discountAmount || 0), subtotal);
    const taxableAmount = Math.max(0, subtotal - discount);

    // Standard Maharashtra intra-state GST (9% CGST + 9% SGST = 18%)
    const cgstAmount = Number((taxableAmount * 0.09).toFixed(2));
    const sgstAmount = Number((taxableAmount * 0.09).toFixed(2));
    const totalAmount = Number((taxableAmount + cgstAmount + sgstAmount).toFixed(2));

    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const effectivePaid = paidAmount !== undefined ? Number(paidAmount) : totalAmount;
    const paymentStatus = effectivePaid >= totalAmount ? 'PAID' : effectivePaid > 0 ? 'PARTIAL' : 'PENDING';

    const [invoice] = await db
      .insert(invoicesTable)
      .values({
        invoiceNumber,
        invoiceType: 'SERVICE',
        bookingId: booking.id,
        jobCardId: jobCard?.id || null,
        customerId: booking.customerId || null,
        customerName,
        customerPhone,
        customerGstin,
        subtotal: subtotal.toFixed(2),
        labourTotal: labourTotal.toFixed(2),
        partsTotal: partsTotal.toFixed(2),
        discountAmount: discount.toFixed(2),
        taxableAmount: taxableAmount.toFixed(2),
        cgstAmount: cgstAmount.toFixed(2),
        sgstAmount: sgstAmount.toFixed(2),
        igstAmount: '0.00',
        totalAmount: totalAmount.toFixed(2),
        paymentStatus,
        paymentMethod,
        paymentReference: paymentReference || null,
        paidAmount: effectivePaid.toFixed(2),
        notes: notes || `Service invoice for Booking #${booking.id}`,
      })
      .returning();

    // Create line items
    const items = [];

    // Labour item
    if (labourTotal > 0) {
      const labourTax = Number((labourTotal * 0.18).toFixed(2));
      const [labourItem] = await db
        .insert(invoiceItemsTable)
        .values({
          invoiceId: invoice.id,
          itemType: 'LABOUR',
          description: 'Workshop Labour & Workmanship Charges',
          hsnSacCode: '9987',
          quantity: 1,
          unitPrice: labourTotal.toFixed(2),
          discount: '0.00',
          taxRatePercent: '18.00',
          taxAmount: labourTax.toFixed(2),
          totalPrice: labourTotal.toFixed(2),
        })
        .returning();
      items.push(labourItem);
    }

    // Parts items
    for (const part of partsUsed) {
      const partTax = Number((Number(part.totalPrice) * 0.18).toFixed(2));
      const [partItem] = await db
        .insert(invoiceItemsTable)
        .values({
          invoiceId: invoice.id,
          itemType: 'PART',
          partId: part.partId || null,
          description: part.partName,
          hsnSacCode: '8714',
          quantity: part.quantity,
          unitPrice: part.unitPrice,
          discount: '0.00',
          taxRatePercent: '18.00',
          taxAmount: partTax.toFixed(2),
          totalPrice: part.totalPrice,
        })
        .returning();
      items.push(partItem);
    }

    return { ...invoice, items };
  }

  async createDirectSaleInvoice(params: {
    customerName: string;
    customerPhone: string;
    customerGstin?: string;
    items: Array<{ partId: number; quantity: number; unitPrice: number; description?: string }>;
    discountAmount?: number;
    paymentMethod?: string;
    paymentReference?: string;
    performedByUserId?: number;
    notes?: string;
  }) {
    const { customerName, customerPhone, customerGstin, items, discountAmount = 0, paymentMethod = 'CASH', paymentReference, performedByUserId, notes } = params;

    if (!items || items.length === 0) {
      throw new Error('At least one item is required');
    }

    // Verify stock availability
    for (const item of items) {
      const [part] = await db.select().from(servicePartsTable).where(eq(servicePartsTable.id, item.partId));
      if (!part) throw new Error(`Part ID ${item.partId} not found`);
      if (Number(part.stockQuantity ?? 0) < item.quantity) {
        throw new Error(`Insufficient stock for ${part.name}. In stock: ${part.stockQuantity}, requested: ${item.quantity}`);
      }
    }

    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unitPrice;
    }

    const discount = Math.min(Number(discountAmount || 0), subtotal);
    const taxableAmount = Math.max(0, subtotal - discount);
    const cgstAmount = Number((taxableAmount * 0.09).toFixed(2));
    const sgstAmount = Number((taxableAmount * 0.09).toFixed(2));
    const totalAmount = Number((taxableAmount + cgstAmount + sgstAmount).toFixed(2));

    const invoiceNumber = `INV-RET-${Date.now().toString().slice(-8)}`;

    const [invoice] = await db
      .insert(invoicesTable)
      .values({
        invoiceNumber,
        invoiceType: 'PART_SALE',
        customerName,
        customerPhone,
        customerGstin: customerGstin || null,
        subtotal: subtotal.toFixed(2),
        labourTotal: '0.00',
        partsTotal: subtotal.toFixed(2),
        discountAmount: discount.toFixed(2),
        taxableAmount: taxableAmount.toFixed(2),
        cgstAmount: cgstAmount.toFixed(2),
        sgstAmount: sgstAmount.toFixed(2),
        igstAmount: '0.00',
        totalAmount: totalAmount.toFixed(2),
        paymentStatus: 'PAID',
        paymentMethod,
        paymentReference: paymentReference || null,
        paidAmount: totalAmount.toFixed(2),
        notes: notes || 'Counter sale invoice',
      })
      .returning();

    const createdItems = [];
    for (const item of items) {
      const [part] = await db.select().from(servicePartsTable).where(eq(servicePartsTable.id, item.partId));
      const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
      const lineTax = Number((lineTotal * 0.18).toFixed(2));

      // Deduct stock and log movement
      const prevStock = Number(part.stockQuantity ?? 0);
      const newStock = prevStock - item.quantity;
      await db
        .update(servicePartsTable)
        .set({ stockQuantity: newStock, updatedAt: new Date() })
        .where(eq(servicePartsTable.id, item.partId));

      await db.insert(inventoryMovementsTable).values({
        partId: item.partId,
        movementType: 'OUT',
        quantity: -item.quantity,
        previousStock: prevStock,
        newStock,
        referenceType: 'INVOICE',
        referenceId: invoiceNumber,
        location: 'Retail Store',
        notes: `Counter sale to ${customerName}`,
        performedByUserId: performedByUserId || null,
      });

      const [invItem] = await db
        .insert(invoiceItemsTable)
        .values({
          invoiceId: invoice.id,
          itemType: 'PART',
          partId: item.partId,
          description: item.description || part.name,
          hsnSacCode: '8714',
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          discount: '0.00',
          taxRatePercent: '18.00',
          taxAmount: lineTax.toFixed(2),
          totalPrice: lineTotal.toFixed(2),
        })
        .returning();

      createdItems.push(invItem);
    }

    return { ...invoice, items: createdItems };
  }

  async recordPayment(invoiceId: number, params: { paidAmount: number; paymentMethod: string; paymentReference?: string }) {
    const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId));
    if (!invoice) throw new Error('Invoice not found');

    const prevPaid = Number(invoice.paidAmount || 0);
    const newPaid = prevPaid + Number(params.paidAmount);
    const total = Number(invoice.totalAmount);
    const paymentStatus = newPaid >= total ? 'PAID' : 'PARTIAL';

    const [updated] = await db
      .update(invoicesTable)
      .set({
        paidAmount: newPaid.toFixed(2),
        paymentStatus,
        paymentMethod: params.paymentMethod,
        paymentReference: params.paymentReference || invoice.paymentReference,
        updatedAt: new Date(),
      })
      .where(eq(invoicesTable.id, invoiceId))
      .returning();

    return updated;
  }
}

export const invoicesService = new InvoicesService();
