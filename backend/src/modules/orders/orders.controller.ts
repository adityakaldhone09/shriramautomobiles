import crypto from 'crypto';
import type { Request, Response } from 'express';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { ordersTable, orderItemsTable, sparePartsTable } from '../../db/schema';
import { getAuthUser } from '../../middleware/auth';
import { createResponse } from '../../utils/helpers';

export class OrdersController {
  async createOrder(req: Request, res: Response) {
    const { items, deliveryMethod = 'PICKUP', paymentMethod = 'CASH', addressId } = req.body as {
      items?: Array<{ productId: number; quantity: number }>;
      deliveryMethod?: string;
      paymentMethod?: string;
      addressId?: number;
    };

    if (!items?.length || items.some((item) => !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1)) {
      return res.status(400).json(createResponse(false, 'A valid cart is required', undefined, 'VALIDATION_ERROR'));
    }

    try {
      const order = await db.transaction(async (transaction) => {
        const products = await transaction.select().from(sparePartsTable).where(inArray(sparePartsTable.id, items.map((item) => item.productId)));
        if (products.length !== items.length) throw new Error('PRODUCT_UNAVAILABLE');

        for (const item of items) {
          const product = products.find((entry) => entry.id === item.productId);
          if (!product || !product.isActive || product.stockQuantity < item.quantity) throw new Error('OUT_OF_STOCK');
        }

        const subtotal = items.reduce((sum, item) => sum + (Number(products.find((p) => p.id === item.productId)?.price) || 0) * item.quantity, 0);
        const [created] = await transaction
          .insert(ordersTable)
          .values({
            orderNumber: `SHA-ORD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
            userId: getAuthUser(req).id,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            paymentMethod,
            subtotal: subtotal.toFixed(2),
            deliveryCharge: '0',
            totalAmount: subtotal.toFixed(2),
            deliveryMethod,
            addressId: addressId || null,
          })
          .returning();

        await transaction.insert(orderItemsTable).values(
          items.map((item) => ({
            orderId: created.id,
            productId: item.productId,
            quantity: item.quantity,
            price: (Number(products.find((p) => p.id === item.productId)?.price) || 0).toFixed(2),
          }))
        );

        for (const item of items) {
          await transaction
            .update(sparePartsTable)
            .set({
              stockQuantity: sql`${sparePartsTable.stockQuantity} - ${item.quantity}`,
              availability: sql`CASE WHEN ${sparePartsTable.stockQuantity} - ${item.quantity} > 0 THEN 'In Stock' ELSE 'Out of Stock' END`,
            })
            .where(and(eq(sparePartsTable.id, item.productId), sql`${sparePartsTable.stockQuantity} >= ${item.quantity}`));
        }

        return created;
      });

      return res.status(201).json(createResponse(true, 'Order placed and awaiting confirmation', order));
    } catch (error: any) {
      const code = error?.message || 'INTERNAL_ERROR';
      if (code === 'OUT_OF_STOCK') return res.status(409).json(createResponse(false, 'One or more products do not have enough stock', undefined, code));
      if (code === 'PRODUCT_UNAVAILABLE') return res.status(400).json(createResponse(false, 'One or more products are unavailable', undefined, code));
      return res.status(500).json(createResponse(false, 'Could not create order', undefined, 'INTERNAL_ERROR'));
    }
  }

  async listOrders(req: Request, res: Response) {
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, getAuthUser(req).id));
    return res.json(createResponse(true, 'Orders fetched', orders));
  }

  async getOrderById(req: Request, res: Response) {
    const user = getAuthUser(req);
    const identifier = req.params.id;
    const isNum = /^\d+$/.test(identifier);

    const condition = isNum
      ? eq(ordersTable.id, parseInt(identifier, 10))
      : eq(ordersTable.orderNumber, identifier);

    const [order] = await db.select().from(ordersTable).where(condition);
    if (!order) {
      return res.status(404).json(createResponse(false, 'Order not found', undefined, 'NOT_FOUND'));
    }

    if (user.role !== 'ADMIN' && user.role !== 'STAFF' && order.userId !== user.id) {
      return res.status(403).json(createResponse(false, 'Unauthorized to view this order', undefined, 'FORBIDDEN'));
    }

    const items = await db
      .select({
        id: orderItemsTable.id,
        productId: orderItemsTable.productId,
        quantity: orderItemsTable.quantity,
        price: orderItemsTable.price,
        product: {
          id: sparePartsTable.id,
          name: sparePartsTable.name,
          sku: sparePartsTable.sku,
          brand: sparePartsTable.brand,
          category: sparePartsTable.category,
        },
      })
      .from(orderItemsTable)
      .leftJoin(sparePartsTable, eq(orderItemsTable.productId, sparePartsTable.id))
      .where(eq(orderItemsTable.orderId, order.id));

    return res.json(createResponse(true, 'Order fetched', { ...order, items }));
  }
}

export const ordersController = new OrdersController();

