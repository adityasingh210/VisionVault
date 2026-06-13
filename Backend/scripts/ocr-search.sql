-- ============================================================
-- MIGRATION: OCR full-text search index
-- Run AFTER `prisma migrate dev` to add the tsvector column
-- ============================================================

-- Add generated tsvector column for full-text search
ALTER TABLE "OcrRecord"
  ADD COLUMN IF NOT EXISTS "textSearch" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "rawText")) STORED;

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "ocr_text_search_idx"
  ON "OcrRecord" USING GIN ("textSearch");


-- ============================================================
-- Face model files
-- ============================================================
-- Download from: https://github.com/vladmandic/face-api/tree/master/model
-- Place in: .face-models/
--
-- Required files:
--   ssd_mobilenetv1_model-weights_manifest.json + shards
--   face_landmark_68_model-weights_manifest.json + shards
--   face_recognition_model-weights_manifest.json + shards


-- ============================================================
-- env.js — no new env vars needed
-- All new services use existing config
-- ============================================================
