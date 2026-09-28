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
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    if (!payload || !signature) return null;

    const expected = crypto.createHmac('sha256', authConfig.secret).update(payload).digest('base64url');
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const value = JSON.parse(decoded) as AuthUser & { exp: number };

    if (!value || typeof value.id !== 'number' || typeof value.exp !== 'number') {
      return null;
    }

    return value.exp > Date.now() ? value : null;
  } catch {
    return null;
  }
}

export function extractAuthToken(req: Request): string | null {
  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookies?.shriram_session) {
    return cookies.shriram_session;
  }
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractAuthToken(req);
  const user = token ? readToken(token) : null;
  if (!user) {
    return res.status(401).json(createResponse(false, 'Authentication required', undefined, 'UNAUTHORIZED'));
  }
  (req as Request & { user: AuthUser }).user = user;
  return next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractAuthToken(req);
  if (token) {
    const user = readToken(token);
    if (user) {
      (req as Request & { user: AuthUser }).user = user;
    }
  }
  return next();
}

export const getAuthUser = (req: Request): AuthUser => (req as Request & { user: AuthUser }).user;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    if (!password || !stored || typeof stored !== 'string') return false;
    const parts = stored.split(':');
    if (parts.length !== 2) return false;
    const [salt, expected] = parts;
    if (!salt || !expected) return false;

    const actual = crypto.scryptSync(password, salt, 64).toString('hex');
    const actualBuffer = Buffer.from(actual, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (actualBuffer.length === 0 || expectedBuffer.length === 0 || actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

