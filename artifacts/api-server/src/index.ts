import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, "0.0.0.0", () => {
  logger.info({ port, environment: process.env.NODE_ENV ?? "development" }, "API server running");
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Cannot start API server: port ${port} is already in use.`);
    console.error("Run: lsof -nP -iTCP:" + port + " -sTCP:LISTEN");
    console.error("Change PORT in the root .env file and restart the server.");
    process.exit(1);
  }

  logger.error({ err: error }, "Error listening on port");
  process.exit(1);
});
