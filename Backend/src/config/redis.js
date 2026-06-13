import Redis from "ioredis";
import { env } from "./env.js";
import logger from "../lib/logger.js";

let redis;

function createRedisClient() {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, 
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on("connect", () => logger.info("Redis connected"));
  client.on("ready", () => logger.debug("Redis ready"));
  client.on("error", (err) => logger.error("Redis error", { error: err.message }));
  client.on("close", () => logger.warn("Redis connection closed"));
  client.on("reconnecting", (ms) =>
    logger.warn("Redis reconnecting", { delay: `${ms}ms` })
  );

  return client;
}

export async function connectRedis() {
  redis = createRedisClient();
  await redis.connect();
}

export async function disconnectRedis() {
  if (redis) {
    await redis.quit();
    logger.info("Redis disconnected");
  }
}

export function getRedis() {
  if (!redis) {
    throw new Error(
      "Redis client is not initialized. Call connectRedis() first."
    );
  }
  return redis;
}

export default { getRedis, connectRedis, disconnectRedis };
