import type { NextFunction, Request, Response } from 'express';
import { createResponse } from '../utils/helpers';

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(limit = 100, windowMs = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = requestCounts.get(ip);
    if (!record || now > record.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
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
