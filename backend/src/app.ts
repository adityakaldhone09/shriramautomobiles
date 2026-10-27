import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index';
import { errorHandler } from './middleware/error';
import { standardLimiter } from './middleware/rateLimit';
import { ensureDbInitialized } from './db/client';
import { createResponse } from './utils/helpers';

interface AppOptions {
  frontendDistPath?: string;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);

  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
  }
  app.disable('x-powered-by');
  app.set('trust proxy', trustProxyHops);

  // 1. Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https:;"
      );
    }
    next();
  });

  // 2. Controlled Origin CORS (avoiding arbitrary reflection)
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? []
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:5001',
          'http://127.0.0.1:5001',
        ];
  if (process.env.APP_URL) allowedOrigins.push(process.env.APP_URL.trim());
  if (process.env.CORS_ORIGIN) allowedOrigins.push(process.env.CORS_ORIGIN.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (
          process.env.NODE_ENV !== 'production' &&
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 86400,
    })
  );

  // 3. Request body size limits to prevent Denial of Service
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Rate Limiting
  app.use(standardLimiter);

  app.use('/api', async (req, _res, next) => {
    if (req.path === '/health' || req.path === '/healthz') {
      return next();
    }

    try {
      await ensureDbInitialized();
      return next();
    } catch (error) {
      return next(error);
    }
  });

  // 5. Mount API Routes
  app.use('/api', apiRouter);
  app.use('/api', (_req, res) => {
    return res
      .status(404)
      .json(createResponse(false, 'API route not found', undefined, 'NOT_FOUND'));
  });

  const frontendDistPath =
    options.frontendDistPath ??
    (process.env.SERVE_FRONTEND === 'true'
      ? fileURLToPath(new URL('../../frontend/dist/', import.meta.url))
      : undefined);

  if (frontendDistPath) {
    const indexPath = path.join(frontendDistPath, 'index.html');
    if (!existsSync(indexPath)) {
      throw new Error(`Frontend build entry point was not found at ${indexPath}`);
    }

    app.use(
      '/assets',
      express.static(path.join(frontendDistPath, 'assets'), {
        immutable: true,
        maxAge: '1y',
      })
    );
    app.use(express.static(frontendDistPath, { index: false, maxAge: 0 }));

    app.get('*', (req, res, next) => {
      if (!req.accepts('html')) {
        return next();
      }
      return res.sendFile(indexPath);
    });
  }

  // 6. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
