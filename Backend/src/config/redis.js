import Redis from "ioredis";
import { env } from "./env.js";
import logger from "../lib/logger.js";

let redis;

function createRedisClient() {
  const client = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  username: env.REDIS_USERNAME,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

  client.on("connect", () => {
    logger.info("Redis connected");
  });

  client.on("ready", () => {
    logger.debug("Redis ready");
  });
  
client.on("error", (err) => {
  console.error("REDIS ACTUAL ERROR:", err);
});

  client.on("close", () => {
    logger.warn("Redis connection closed");
  });

  client.on("reconnecting", (delay) => {
    logger.warn("Redis reconnecting", {
      delay: `${delay}ms`,
    });
  });

  return client;
}

export async function connectRedis() {
  redis = createRedisClient();

  try {
    await redis.ping();
    logger.info("Redis connection verified");
  } catch (error) {
    console.error("REDIS CONNECTION FAILED:", error);
    throw error;
  }
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

export default {
  getRedis,
  connectRedis,
  disconnectRedis,
};