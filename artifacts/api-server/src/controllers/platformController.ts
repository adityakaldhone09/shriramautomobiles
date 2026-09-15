import type { Request, Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { notificationsTable, wholesaleQuotesTable } from '@workspace/db/schema';
import { getAuthUser } from '../middlewares/auth';
import { createResponse, isValidPhone } from '../utils/helpers';

export async function listNotifications(req: Request, res: Response) {
  const rows = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, getAuthUser(req).id)).orderBy(desc(notificationsTable.createdAt));
  return res.json(createResponse(true, 'Notifications fetched', rows));
}

export async function markNotificationRead(req: Request, res: Response) {
  const [row] = await db.update(notificationsTable).set({ isRead: true }).where(and(eq(notificationsTable.id, Number(req.params.id)), eq(notificationsTable.userId, getAuthUser(req).id))).returning();
  if (!row) return res.status(404).json(createResponse(false, 'Notification not found', undefined, 'NOT_FOUND'));
  return res.json(createResponse(true, 'Notification marked read', row));
}

export async function createWholesaleQuote(req: Request, res: Response) {
  const { name, phone, businessName, requiredProducts, message } = req.body;
  if (!name || !isValidPhone(phone || '') || !Array.isArray(requiredProducts) || !requiredProducts.length) return res.status(400).json(createResponse(false, 'Name, valid phone and products are required', undefined, 'VALIDATION_ERROR'));
  const [quote] = await db.insert(wholesaleQuotesTable).values({ name, phone, businessName, requiredProducts, message }).returning();
  return res.status(201).json(createResponse(true, 'Wholesale quote request received', quote));
}

export async function listWholesaleQuotes(_req: Request, res: Response) {
  return res.json(createResponse(true, 'Wholesale quotes fetched', await db.select().from(wholesaleQuotesTable).orderBy(desc(wholesaleQuotesTable.createdAt))));
}
