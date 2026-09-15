import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { createResponse } from '../utils/helpers';
import { authConfig } from '../config/auth';

export type AuthUser = { id: number; customerId?: number | null; role: string; phone: string };

export function createToken(user: AuthUser): string {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString('base64url');
  const signature = crypto.createHmac('sha256', authConfig.secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readToken(token: string): AuthUser | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', authConfig.secret).update(payload).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AuthUser & { exp: number };
    return value.exp > Date.now() ? value : null;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.shriram_session;
  const user = header?.startsWith('Bearer ') ? readToken(header.slice(7)) : cookieToken ? readToken(cookieToken) : null;
  if (!user) return res.status(401).json(createResponse(false, 'Authentication required', undefined, 'UNAUTHORIZED'));
  (req as Request & { user: AuthUser }).user = user;
  return next();
}

export const getAuthUser = (req: Request) => (req as Request & { user: AuthUser }).user;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
