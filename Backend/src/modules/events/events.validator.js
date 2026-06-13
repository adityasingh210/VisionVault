import { z } from "zod";

export const getEventByIdSchema = z.object({
  id: z.string().uuid(),
});

export const getEventImagesSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});