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
      .select({
        id: cartItemsTable.id,
        productId: cartItemsTable.productId,
        quantity: cartItemsTable.quantity,
        product: {
          id: sparePartsTable.id,
          name: sparePartsTable.name,
          sku: sparePartsTable.sku,
          brand: sparePartsTable.brand,
          category: sparePartsTable.category,
          price: sparePartsTable.price,
          availability: sparePartsTable.availability,
          stockQuantity: sparePartsTable.stockQuantity,
          image: sparePartsTable.image,
        },
      })
      .from(cartItemsTable)
      .innerJoin(sparePartsTable, eq(cartItemsTable.productId, sparePartsTable.id))
      .where(eq(cartItemsTable.cartId, cartId));
    return res.json(createResponse(true, 'Cart fetched', items));
  }
  async addCartItem(req: Request, res: Response) {
    const productId = Number(req.body.productId);
    const rawQty = req.body.quantity;
    const quantity = rawQty === undefined ? 1 : Number(rawQty);


    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {

      return res.status(400).json(
        createResponse(false, 'Valid product ID and quantity between 1 and 20 are required', undefined, 'VALIDATION_ERROR')
      );
    }

    const [product] = await db.select().from(sparePartsTable).where(eq(sparePartsTable.id, productId));
    if (!product || !product.isActive) {
      return res.status(404).json(createResponse(false, 'Product is unavailable', undefined, 'NOT_FOUND'));
    }

    const cartId = await getCartId(getAuthUser(req).id);

    // Check if product is already in user's cart
    const [existingItem] = await db
      .select()
      .from(cartItemsTable)
      .where(and(eq(cartItemsTable.cartId, cartId), eq(cartItemsTable.productId, productId)));

    const targetQuantity = (existingItem?.quantity || 0) + quantity;
    if (targetQuantity > 20) {
      return res.status(400).json(
        createResponse(false, 'Cannot add more than 20 units of this item to cart', undefined, 'LIMIT_EXCEEDED')
      );
    }

    if (product.stockQuantity < targetQuantity) {
      return res.status(409).json(
        createResponse(false, `Insufficient stock. Only ${product.stockQuantity} available`, undefined, 'OUT_OF_STOCK')
      );
    }

    if (existingItem) {
      const [updated] = await db
        .update(cartItemsTable)
        .set({ quantity: targetQuantity })
        .where(eq(cartItemsTable.id, existingItem.id))
        .returning();
      return res.json(createResponse(true, 'Cart updated', updated));
    }

    const [item] = await db.insert(cartItemsTable).values({ cartId, productId, quantity }).returning();
    return res.status(201).json(createResponse(true, 'Item added to cart', item));
  }

  async updateCartItem(req: Request, res: Response) {
    const itemId = Number(req.params.id);
    const quantity = Number(req.body.quantity);

    if (!Number.isInteger(itemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      return res.status(400).json(
        createResponse(false, 'Valid quantity between 1 and 20 is required', undefined, 'VALIDATION_ERROR')
      );
    }

    const cartId = await getCartId(getAuthUser(req).id);

    const [item] = await db
      .select()
      .from(cartItemsTable)
      .where(and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.cartId, cartId)));

    if (!item) {
      return res.status(404).json(createResponse(false, 'Cart item not found', undefined, 'NOT_FOUND'));
    }

    const [product] = await db.select().from(sparePartsTable).where(eq(sparePartsTable.id, item.productId));
    if (!product || product.stockQuantity < quantity) {
      return res.status(409).json(
        createResponse(false, `Insufficient stock. Only ${product?.stockQuantity || 0} available`, undefined, 'OUT_OF_STOCK')
      );
    }

    const [updated] = await db
      .update(cartItemsTable)
      .set({ quantity })
      .where(eq(cartItemsTable.id, itemId))
      .returning();

    return res.json(createResponse(true, 'Cart item updated', updated));
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

  async clearCart(req: Request, res: Response) {
    const cartId = await getCartId(getAuthUser(req).id);
    await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cartId));
    return res.json(createResponse(true, 'Cart cleared'));
  }
}

export const cartController = new CartController();

