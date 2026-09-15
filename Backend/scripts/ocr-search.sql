-- ============================================================
-- OCR full-text search index
-- ============================================================
-- This used to live only here, which meant `prisma migrate deploy`
-- never actually ran it (this /scripts folder is not a migrations
-- folder), and it also used the wrong (pre-@@map) table/column names
-- ("OcrRecord"/"textSearch"/"rawText" instead of the real
-- ocr_records/text_search/raw_text). Both problems are why
-- GET /api/images/search/ocr threw on every request.
--
-- The real, applied fix now lives at:
--   prisma/migrations/20260614000000_add_ocr_text_search/migration.sql
--
-- Do not run the SQL below manually — it targets non-existent tables
-- and is kept here only as a historical note. Just run
-- `prisma migrate deploy` (or `prisma migrate dev` locally) to apply
-- the real migration above.


-- ============================================================
-- Face model files
-- ============================================================
-- Required for the FACE processing job (src/ai/face.service.js) to work.
-- Download from: https://github.com/vladmandic/face-api/tree/master/model
-- Place in: .face-models/
--
-- Required files:
--   ssd_mobilenetv1_model-weights_manifest.json + shards
--   face_landmark_68_model-weights_manifest.json + shards
--   face_recognition_model-weights_manifest.json + shards
--
-- Without these files, the worker now logs an error and disables FACE
-- jobs specifically at startup (see src/workers/worker.js) instead of
-- crashing the whole worker — OCR/embedding/category jobs are unaffected.


-- ============================================================
-- env.js — no new env vars needed
-- All new services use existing config
-- ============================================================
