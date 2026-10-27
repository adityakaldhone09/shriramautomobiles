import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { closeDatabasePool, ensureDbInitialized } from "./db/client";

function safeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unknown error";
  }

  let message = error.message.replace(/[\r\n]/g, " ");
  for (const key of ["DATABASE_URL", "AUTH_SECRET"]) {
    const secret = process.env[key];
    if (secret) {
      message = message.replaceAll(secret, "[redacted]");
    }
  }

  return message
    .replace(/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s]+@/gi, "$1[redacted]@")
    .replace(
      /((?:password|secret|token|api[_-]?key)\s*[=:]\s*)[^\s&]+/gi,
      "$1[redacted]",
    );
}

async function startServer() {
  await ensureDbInitialized();
  const port = parseInt(env.PORT || "5001", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port between 1 and 65535");
  }
  const server = app.listen(port, "0.0.0.0", () => {
    logger.info(`Shriram Automobiles server listening on 0.0.0.0:${port}`);
  });
  server.on("error", (error) => {
    logger.error(`API server listener failed: ${safeErrorMessage(error)}`);
    void closeDatabasePool().catch(() => {
      logger.error(
        "Failed to close database connections after listener failure",
      );
    });
    process.exitCode = 1;
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info(`Received ${signal}; shutting down HTTP server`);
    server.close(async (error) => {
      if (error) {
        logger.error("Failed to close HTTP server cleanly");
        process.exitCode = 1;
      }
      try {
        await closeDatabasePool();
      } catch {
        logger.error("Failed to close database connections cleanly");
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

startServer().catch(async (error: unknown) => {
  logger.error(
    `Failed to start API server: ${safeErrorMessage(error)}. Verify runtime configuration and database availability.`,
  );
  try {
    await closeDatabasePool();
  } catch {
    logger.error("Failed to close database connections after startup failure");
  }
  process.exitCode = 1;
});
