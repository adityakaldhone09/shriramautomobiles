import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../lib/db';
import { customersTable, passwordResetTokensTable, usersTable } from '@workspace/db/schema';
import { createResponse, isValidEmail, isValidPhone } from '../utils/helpers';
import { createToken, getAuthUser, hashPassword, verifyPassword } from '../middlewares/auth';

const publicUser = (user: typeof usersTable.$inferSelect) => ({ id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role });

export async function register(req: Request, res: Response) {
  const { name, phone, email, password } = req.body as Record<string, string>;
  if (!name?.trim() || !isValidPhone(phone || '') || !isValidEmail(email || '') || !password || password.length < 8) {
    return res.status(400).json(createResponse(false, 'Name, valid phone, email and an 8-character password are required', undefined, 'VALIDATION_ERROR'));
  }
  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone.replace(/[\s\-+]/g, '')));
    if (existing.length) return res.status(409).json(createResponse(false, 'An account already exists for this phone number', undefined, 'CONFLICT'));
    const [customer] = await db.insert(customersTable).values({ name: name.trim(), phone: phone.replace(/[\s\-+]/g, ''), email: email.trim().toLowerCase() }).returning();
    const [user] = await db.insert(usersTable).values({ customerId: customer.id, name: name.trim(), phone: phone.replace(/[\s\-+]/g, ''), email: email.trim().toLowerCase(), passwordHash: hashPassword(password) }).returning();
    res.cookie('shriram_session', createToken(user), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 });
    return res.status(201).json(createResponse(true, 'Account created', { user: publicUser(user) }));
  } catch (err: any) {
    console.error('Register catch error:', err?.message || err);
    return res.status(400).json(createResponse(false, 'Could not create account: ' + (err?.message || ''), undefined, 'VALIDATION_ERROR'));
  }
}

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body as Record<string, string>;
  if (!identifier || !password) return res.status(400).json(createResponse(false, 'Phone or email and password are required', undefined, 'VALIDATION_ERROR'));
  const users = await db.select().from(usersTable).where(identifier.includes('@') ? eq(usersTable.email, identifier.toLowerCase()) : eq(usersTable.phone, identifier.replace(/[\s\-+]/g, '')));
  const user = users[0];
  if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json(createResponse(false, 'Invalid login details', undefined, 'UNAUTHORIZED'));
  res.cookie('shriram_session', createToken(user), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 });
  return res.json(createResponse(true, 'Login successful', { user: publicUser(user) }));
}

export function logout(_req: Request, res: Response) {
  res.clearCookie('shriram_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  return res.json(createResponse(true, 'Logged out'));
}

export async function refresh(req: Request, res: Response) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : (req as Request & { cookies?: Record<string, string> }).cookies?.shriram_session;
  if (!token) return res.status(401).json(createResponse(false, 'Authentication required', undefined, 'UNAUTHORIZED'));
  const { readToken } = await import('../middlewares/auth');
  const identity = readToken(token);
  if (!identity) return res.status(401).json(createResponse(false, 'Session expired', undefined, 'UNAUTHORIZED'));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, identity.id));
  if (!user) return res.status(401).json(createResponse(false, 'Session expired', undefined, 'UNAUTHORIZED'));
  res.cookie('shriram_session', createToken(user), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 });
  return res.json(createResponse(true, 'Session refreshed', { user: publicUser(user) }));
}

export async function forgotPassword(req: Request, res: Response) {
  const identifier = String(req.body.email || '').trim().toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, identifier));
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    await db.insert(passwordResetTokensTable).values({ userId: user.id, tokenHash: crypto.createHash('sha256').update(rawToken).digest('hex'), expiresAt: new Date(Date.now() + 1000 * 60 * 30) });
    if (process.env.NODE_ENV !== 'production') console.info(`Password reset token for ${user.email}: ${rawToken}`);
  }
  return res.json(createResponse(true, 'If an account exists, reset instructions will be sent shortly'));
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;
  if (!token || typeof password !== 'string' || password.length < 8) return res.status(400).json(createResponse(false, 'A valid token and 8-character password are required', undefined, 'VALIDATION_ERROR'));
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const [reset] = await db.select().from(passwordResetTokensTable).where(and(eq(passwordResetTokensTable.tokenHash, tokenHash), isNull(passwordResetTokensTable.usedAt)));
  if (!reset || reset.expiresAt < new Date()) return res.status(400).json(createResponse(false, 'Reset token is invalid or expired', undefined, 'INVALID_RESET_TOKEN'));
  await db.transaction(async (transaction) => { await transaction.update(usersTable).set({ passwordHash: hashPassword(password), updatedAt: new Date() }).where(eq(usersTable.id, reset.userId)); await transaction.update(passwordResetTokensTable).set({ usedAt: new Date() }).where(eq(passwordResetTokensTable.id, reset.id)); });
  return res.json(createResponse(true, 'Password reset successfully'));
}

export async function me(req: Request, res: Response) {
  const auth = getAuthUser(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.id));
  if (!user) return res.status(404).json(createResponse(false, 'User not found', undefined, 'NOT_FOUND'));
  return res.json(createResponse(true, 'Account fetched', publicUser(user)));
}
