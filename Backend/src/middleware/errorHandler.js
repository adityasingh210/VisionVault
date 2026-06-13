import { isAppError } from "../lib/errors.js";
import logger from "../lib/logger.js";
import { env } from "../config/env.js";

export function errorHandler(err, req, res, _next) {
  if (err.code === "P2002") {
    const fields = err.meta?.target?.join(", ") ?? "field";
    return res.status(409).json({
      error: {
        code: "CONFLICT",
        message: `A record with this ${fields} already exists`,
      },
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Record not found",
      },
    });
  }

  if (isAppError(err)) {
    const body = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.meta && { ...err.meta }),
      },
    };

    if (env.NODE_ENV === "development") {
      body.error.stack = err.stack;
    }

    return res.status(err.status).json(body);
  }

  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  const body = {
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  };

  if (env.NODE_ENV === "development") {
    body.error.detail = err.message;
    body.error.stack = err.stack;
  }

  return res.status(500).json(body);
}
