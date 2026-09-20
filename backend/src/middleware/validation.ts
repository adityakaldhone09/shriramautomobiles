import type { NextFunction, Request, Response } from 'express';
import type { AnyZodObject } from 'zod';
import { createResponse } from '../utils/helpers';

export function validateBody(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      return next();
    } catch (error: any) {
      return res.status(400).json(
        createResponse(false, 'Validation failed', error.errors || error.message, 'VALIDATION_ERROR')
      );
    }
  };
}
