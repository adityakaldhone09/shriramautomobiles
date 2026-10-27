import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { createResponse } from '../utils/helpers';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = Number(err.status || err.statusCode || 500);
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    logger.error(`${req.method} ${req.path} - Request failed`, {
      status,
      code: typeof err.code === 'string' ? err.code : 'INTERNAL_SERVER_ERROR',
    });
  } else {
    logger.error(`${req.method} ${req.path} - Error:`, err);
  }

  const message =
    status >= 500 && isProd
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal Server Error';

  return res.status(status).json(
    createResponse(
      false,
      message,
      !isProd ? err.stack : undefined,
      err.code || (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST')
    )
  );
}
