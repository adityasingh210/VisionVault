// src/modules/memories/memories.validator.js

import { z } from "zod";
const currentYear = new Date().getFullYear();
const yearSchema = z.coerce
  .number()
  .int()
  .min(2000, "year must be 2000 or later")
  .max(currentYear + 1, `year must be ${currentYear + 1} or earlier`)
  .optional();
const limitSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(200)
  .optional();
export const highlightsQuerySchema = z.object({});
export const peopleQuerySchema = z.object({
  limit: limitSchema,
});
export const eventsQuerySchema = z.object({
  limit: limitSchema,
  year:  yearSchema,
});

export const documentsQuerySchema = z.object({
  limit: limitSchema,
});

export const monthlyQuerySchema = z.object({
  year:         yearSchema,
  previewCount: z.coerce.number().int().min(1).max(10).optional(),
});
export const travelQuerySchema = z.object({
  year: yearSchema,
});