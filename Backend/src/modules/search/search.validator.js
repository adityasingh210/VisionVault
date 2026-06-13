// src/modules/search/search.validator.js
import { z } from "zod";
export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Search query cannot be empty")
    .max(500, "Search query must be at most 500 characters"),

  limit: z.coerce
    .number()
    .int("limit must be an integer")
    .min(1, "limit must be at least 1")
    .max(100, "limit must be at most 100")
    .optional(),

  offset: z.coerce
    .number()
    .int("offset must be an integer")
    .min(0, "offset must be 0 or greater")
    .optional(),
});