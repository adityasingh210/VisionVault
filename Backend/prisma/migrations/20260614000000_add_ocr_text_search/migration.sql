-- Adds full-text search support to ocr_records.
-- Previously this only existed as a loose file at scripts/ocr-search.sql,
-- which is NOT a real Prisma migration (prisma migrate deploy never runs
-- anything outside prisma/migrations), and it also targeted the wrong
-- (pre-mapping) table/column names. This migration fixes both problems.

ALTER TABLE "ocr_records"
  ADD COLUMN IF NOT EXISTS "text_search" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "raw_text")) STORED;

CREATE INDEX IF NOT EXISTS "ocr_records_text_search_idx"
  ON "ocr_records" USING GIN ("text_search");
