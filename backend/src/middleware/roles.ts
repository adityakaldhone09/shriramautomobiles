import type { NextFunction, Request, Response } from 'express';
import { createResponse } from '../utils/helpers';
import type { AuthUser } from './auth';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json(createResponse(false, 'Insufficient permissions', undefined, 'FORBIDDEN'));
    }
    return next();
  };
}
