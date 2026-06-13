// src/modules/images/images.validator.js

import { z } from "zod";

export const uploadImagesSchema = z.object({});

export const getImagesSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  source: z.enum(["LOCAL", "GOOGLE_PHOTOS"]).optional(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
});

export const getImageByIdSchema = z.object({
  id: z.string().uuid(),
});

export const deleteImageSchema = z.object({
  id: z.string().uuid(),
});

export const bulkDeleteSchema = z.object({
  imageIds: z
    .array(z.string().uuid())
    .min(1, "At least one image ID is required")
    .max(100, "Cannot delete more than 100 images at once"),
});

export const getImageStatusSchema = z.object({
  id: z.string().uuid(),
});

export const ocrSearchSchema = z.object({
  q: z.string().trim().min(1, "Search query cannot be empty").max(500),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
