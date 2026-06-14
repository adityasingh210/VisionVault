import RedisStore from "rate-limit-redis";
import { getRedis } from "../config/redis.js";
import { env } from "../config/env.js";
import { RateLimitError } from "../lib/errors.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

function createLimiter({ max, windowMs = env.RATE_LIMIT_WINDOW_MS, prefix }) {
  let limiter = null;

  return (req, res, next) => {
    if (!limiter) {
      limiter = rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req),
        handler: (_req, _res, next) => {
          next(new RateLimitError());
        },
        store: new RedisStore({
          prefix: `rl:${prefix}:`,
          sendCommand: (...args) => getRedis().call(...args),
        }),
         validate: { creationStack: false },
      });
    }
    return limiter(req, res, next);
  };
}

export const authRateLimiter = createLimiter({
  max: env.RATE_LIMIT_AUTH_MAX,
  prefix: "auth",
});

export const uploadRateLimiter = createLimiter({
  max: env.RATE_LIMIT_UPLOAD_MAX,
  prefix: "upload",
});

export const searchRateLimiter = createLimiter({
  max: env.RATE_LIMIT_SEARCH_MAX,
  prefix: "search",
});