import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { usersTable } from '@workspace/db/schema';
import { createResponse, isValidEmail, isValidPhone } from '../utils/helpers';
import { getAuthUser } from '../middlewares/auth';

const safeUser = (user: typeof usersTable.$inferSelect) => ({ id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role });

export async function getProfile(req: Request, res: Response) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, getAuthUser(req).id));
  if (!user) return res.status(404).json(createResponse(false, 'Profile not found', undefined, 'NOT_FOUND'));
  return res.json(createResponse(true, 'Profile fetched', safeUser(user)));
}

export async function updateProfile(req: Request, res: Response) {
  const { name, phone, email } = req.body;
  if (!name?.trim() || !isValidPhone(phone || '') || !isValidEmail(email || '')) return res.status(400).json(createResponse(false, 'Name, valid phone and email are required', undefined, 'VALIDATION_ERROR'));
  const [user] = await db.update(usersTable).set({ name: name.trim(), phone: phone.replace(/[\s\-+]/g, ''), email: email.toLowerCase().trim(), updatedAt: new Date() }).where(eq(usersTable.id, getAuthUser(req).id)).returning();
  if (!user) return res.status(404).json(createResponse(false, 'Profile not found', undefined, 'NOT_FOUND'));
  return res.json(createResponse(true, 'Profile updated', safeUser(user)));
}
