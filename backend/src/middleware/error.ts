import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { createResponse } from '../utils/helpers';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(`${req.method} ${req.path} - Error:`, err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(status).json(
    createResponse(
      false,
      message,
      process.env.NODE_ENV === 'development' ? err.stack : undefined,
      err.code || 'INTERNAL_SERVER_ERROR'
    )
  );
}
