import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { ensureDbInitialized } from './db/client';

async function startServer() {
  await ensureDbInitialized();
  const port = parseInt(env.PORT || '5001', 10);

  app.listen(port, () => {
    logger.info(`Shriram Automobiles API Server running at http://localhost:${port}/api`);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start API server:', err);
  process.exit(1);
});
