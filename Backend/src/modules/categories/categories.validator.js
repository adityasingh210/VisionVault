import { z } from "zod";

export const getCategoryBySlugSchema = z.object({
  slug: z.string().min(1).max(100),
});

export const getCategoryImagesSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  minConfidence: z.coerce.number().min(0).max(1).optional(),
});
