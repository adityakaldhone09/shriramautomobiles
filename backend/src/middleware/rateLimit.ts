import type { NextFunction, Request, Response } from 'express';
import { createResponse } from '../utils/helpers';

const store = new Map<string, { count: number; resetTime: number }>();

// Periodically clean up expired entries every 5 minutes (unref so it doesn't hold process open)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (now > value.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);
if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

export function rateLimit(limit = 100, windowMs = 60 * 1000, keyPrefix = 'global') {
  return (req: Request, res: Response, next: NextFunction) => {
    // If running in test mode, bypass rate limiting to prevent test flakiness
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    const record = store.get(key);
    if (!record || now > record.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= limit) {
      return res.status(429).json(
        createResponse(false, 'Too many requests, please try again later', undefined, 'RATE_LIMIT_EXCEEDED')
      );
    }

    record.count++;
    return next();
  };
}

export const authLimiter = rateLimit(15, 15 * 60 * 1000, 'auth');
export const standardLimiter = rateLimit(300, 15 * 60 * 1000, 'api');
export const aiLimiter = rateLimit(40, 60 * 1000, 'ai');
export const orderLimiter = rateLimit(30, 60 * 1000, 'order');

