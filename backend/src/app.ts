import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index';
import { errorHandler } from './middleware/error';
import { rateLimit } from './middleware/rateLimit';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(rateLimit(300, 60 * 1000));

  app.use('/api', apiRouter);

  app.use(errorHandler);

  return app;
}

export const app = createApp();
