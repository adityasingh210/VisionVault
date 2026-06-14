import { ZodError } from "zod";
import { ValidationError } from "../lib/errors.js";

/**
 *
 * @param {import("zod").ZodTypeAny} schema
 */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ValidationError("Request validation failed", issues);
    }

    req.body = result.data; // Replace with parsed, typed data
    next();
  };
}

/**
 *
 * @param {import("zod").ZodTypeAny} schema
 */
export function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const issues = result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ValidationError("Query validation failed", issues);
    }

    req.query = result.data;
    next();
  };
}

/**
 *
 * @param {import("zod").ZodTypeAny} schema
 */
export function validateParams(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const issues = result.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      throw new ValidationError("Route parameter validation failed", issues);
    }

    req.params = result.data;
    next();
  };
}
