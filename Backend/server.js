import "dotenv/config";
import app from "./app.js";
import { env } from "./src/config/env.js";
import { connectDatabase, disconnectDatabase } from "./src/config/database.js";
import { connectRedis, disconnectRedis } from "./src/config/redis.js";
import { verifyCloudinaryConnection } from "./src/config/cloudinary.js";
import { initializeQdrant } from "./src/config/qdrant.js";
import logger from "./src/lib/logger.js";

let server;

async function start() {
  await connectDatabase();
  await connectRedis();
await verifyCloudinaryConnection();
await initializeQdrant();


  server = app.listen(env.PORT, () => {
    logger.info(`Server started`, {
      port: env.PORT,
      env: env.NODE_ENV,
    });
  });
}

async function shutdown(signal) {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  server?.close(async () => {
    try {
      await disconnectDatabase();
      await disconnectRedis();
      logger.info("Graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error("Error during shutdown", { error: err.message });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error("Shutdown timeout exceeded, forcing exit");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGUSR2", () => shutdown("SIGUSR2")); 

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason: String(reason) });
  process.exit(1);
});

start().catch((err) => {
  logger.error("Failed to start server", { error: err.message, stack: err.stack });
  console.error("ACTUAL STARTUP ERROR:");
  console.error(err);
  process.exit(1);
});
