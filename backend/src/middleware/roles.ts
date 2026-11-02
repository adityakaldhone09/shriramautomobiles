import type { NextFunction, Request, Response } from 'express';
import { createResponse } from '../utils/helpers';
import type { AuthUser } from './auth';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'MECHANIC' | 'CUSTOMER';

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user) {
      return res.status(403).json(createResponse(false, 'Insufficient permissions', undefined, 'FORBIDDEN'));
    }

    // SUPER_ADMIN has full permissions across all admin and operational routes
    const effectiveRoles = [...roles];
    if (roles.includes('ADMIN') || roles.includes('STAFF')) {
      effectiveRoles.push('SUPER_ADMIN');
    }

    if (!effectiveRoles.includes(user.role)) {
      return res.status(403).json(createResponse(false, 'Insufficient permissions', undefined, 'FORBIDDEN'));
    }
    return next();
  };
}
