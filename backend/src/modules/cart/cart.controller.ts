import type { Request, Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { cartsTable, cartItemsTable, sparePartsTable } from '../../db/schema';
import { createResponse } from '../../utils/helpers';
import { getAuthUser } from '../../middleware/auth';

async function getCartId(userId: number) {
  const [existing] = await db.select().from(cartsTable).where(eq(cartsTable.userId, userId));
  if (existing) return existing.id;
  const [created] = await db.insert(cartsTable).values({ userId }).returning({ id: cartsTable.id });
  return created.id;
}

export class CartController {
  async getCart(req: Request, res: Response) {
    const cartId = await getCartId(getAuthUser(req).id);
    const items = await db
      .select({ id: cartItemsTable.id, productId: cartItemsTable.productId, quantity: cartItemsTable.quantity, product: sparePartsTable })
      .from(cartItemsTable)
      .innerJoin(sparePartsTable, eq(cartItemsTable.productId, sparePartsTable.id))
      .where(eq(cartItemsTable.cartId, cartId));
    return res.json(createResponse(true, 'Cart fetched', items));
  }

  async addCartItem(req: Request, res: Response) {
    const productId = Number(req.body.productId);
    const quantity = Number(req.body.quantity || 1);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json(createResponse(false, 'Product and positive quantity are required', undefined, 'VALIDATION_ERROR'));
    }
    const [product] = await db.select().from(sparePartsTable).where(eq(sparePartsTable.id, productId));
    if (!product || !product.isActive || product.stockQuantity < quantity) {
      return res.status(409).json(createResponse(false, 'Product is unavailable or out of stock', undefined, 'OUT_OF_STOCK'));
    }
    const cartId = await getCartId(getAuthUser(req).id);
    const [item] = await db.insert(cartItemsTable).values({ cartId, productId, quantity }).returning();
    return res.status(201).json(createResponse(true, 'Cart updated', item));
  }

  async updateCartItem(req: Request, res: Response) {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json(createResponse(false, 'Positive quantity is required', undefined, 'VALIDATION_ERROR'));
    }
    const cartId = await getCartId(getAuthUser(req).id);
    const [item] = await db
      .update(cartItemsTable)
      .set({ quantity })
      .where(and(eq(cartItemsTable.id, Number(req.params.id)), eq(cartItemsTable.cartId, cartId)))
      .returning();
    if (!item) return res.status(404).json(createResponse(false, 'Cart item not found', undefined, 'NOT_FOUND'));
    return res.json(createResponse(true, 'Cart item updated', item));
  }

  async deleteCartItem(req: Request, res: Response) {
    const cartId = await getCartId(getAuthUser(req).id);
    const [item] = await db
      .delete(cartItemsTable)
      .where(and(eq(cartItemsTable.id, Number(req.params.id)), eq(cartItemsTable.cartId, cartId)))
      .returning();
    if (!item) return res.status(404).json(createResponse(false, 'Cart item not found', undefined, 'NOT_FOUND'));
    return res.json(createResponse(true, 'Cart item removed', item));
  }
}

export const cartController = new CartController();
