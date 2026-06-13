import RedisStore from "rate-limit-redis";
import { getRedis } from "../config/redis.js";
import { env } from "../config/env.js";
import { RateLimitError } from "../lib/errors.js";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

function createLimiter({ max, windowMs = env.RATE_LIMIT_WINDOW_MS, prefix }) {
  return rateLimit({
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
  });
}

let _authRateLimiter, _uploadRateLimiter, _searchRateLimiter;

export function getAuthRateLimiter() {
  if (!_authRateLimiter) _authRateLimiter = createLimiter({ max: env.RATE_LIMIT_AUTH_MAX, prefix: "auth" });
  return _authRateLimiter;
}

export function getUploadRateLimiter() {
  if (!_uploadRateLimiter) _uploadRateLimiter = createLimiter({ max: env.RATE_LIMIT_UPLOAD_MAX, prefix: "upload" });
  return _uploadRateLimiter;
}

export function getSearchRateLimiter() {
  if (!_searchRateLimiter) _searchRateLimiter = createLimiter({ max: env.RATE_LIMIT_SEARCH_MAX, prefix: "search" });
  return _searchRateLimiter;
}