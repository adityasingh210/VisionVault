import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

 
  DATABASE_URL: z.url(),

  REDIS_URL: z.url(),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  COOKIE_SECRET: z
    .string()
    .min(32, "COOKIE_SECRET must be at least 32 characters"),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

 
  QDRANT_URL: z.url(),
  QDRANT_API_KEY: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.url(),
  GOOGLE_PHOTOS_CALLBACK_URL: z.url(),

  FRONTEND_URL: z.url(),

  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_UPLOAD_MAX: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_SEARCH_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),

 
  PHASH_HAMMING_THRESHOLD: z.coerce.number().int().min(0).max(1024).default(50),

  DEFAULT_PAGE_SIZE: z.coerce.number().int().positive().default(50),
  MAX_PAGE_SIZE: z.coerce.number().int().positive().default(100),
  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(25),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return result.data;
}

export const env = validateEnv();
