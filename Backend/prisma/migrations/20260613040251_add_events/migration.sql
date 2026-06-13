-- CreateEnum
CREATE TYPE "ImageSource" AS ENUM ('LOCAL', 'GOOGLE_PHOTOS');

-- CreateEnum
CREATE TYPE "ImageProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DuplicateType" AS ENUM ('EXACT', 'NEAR');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('HASH', 'EMBEDDING', 'OCR', 'FACE', 'CATEGORY', 'CLUSTER', 'EVENT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EventJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "google_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "token_expiry" TIMESTAMP(3) NOT NULL,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "cloudinary_id" TEXT NOT NULL,
    "cloudinary_url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "file_size" BIGINT,
    "mime_type" TEXT,
    "sha256_hash" TEXT,
    "phash" TEXT,
    "source" "ImageSource" NOT NULL DEFAULT 'LOCAL',
    "google_photos_id" TEXT,
    "taken_at" TIMESTAMP(3),
    "location_lat" DECIMAL(9,6),
    "location_lng" DECIMAL(9,6),
    "metadata" JSONB,
    "processing_status" "ImageProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_categories" (
    "image_id" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "confidence" DECIMAL(4,3),

    CONSTRAINT "image_categories_pkey" PRIMARY KEY ("image_id","category_id")
);

-- CreateTable
CREATE TABLE "duplicate_groups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "DuplicateType" NOT NULL,
    "representative_image_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "duplicate_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_group_members" (
    "group_id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,

    CONSTRAINT "duplicate_group_members_pkey" PRIMARY KEY ("group_id","image_id")
);

-- CreateTable
CREATE TABLE "face_clusters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT,
    "cover_face_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "face_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faces" (
    "id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "cluster_id" TEXT,
    "bbox_x" DOUBLE PRECISION NOT NULL,
    "bbox_y" DOUBLE PRECISION NOT NULL,
    "bbox_w" DOUBLE PRECISION NOT NULL,
    "bbox_h" DOUBLE PRECISION NOT NULL,
    "detection_score" DECIMAL(4,3),
    "embedding_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "qdrant_id" TEXT NOT NULL,

    CONSTRAINT "faces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocr_records" (
    "id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "language" TEXT,
    "confidence" DECIMAL(4,3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,
    "job_type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "EventJobStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "image_count" INTEGER,
    "event_count" INTEGER,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "event_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cover_image_id" TEXT,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "location_lat" DECIMAL(9,6),
    "location_lng" DECIMAL(9,6),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_images" (
    "event_id" TEXT NOT NULL,
    "image_id" TEXT NOT NULL,

    CONSTRAINT "event_images_pkey" PRIMARY KEY ("event_id","image_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "google_accounts_user_id_key" ON "google_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "google_accounts_google_id_key" ON "google_accounts"("google_id");

-- CreateIndex
CREATE INDEX "images_user_id_idx" ON "images"("user_id");

-- CreateIndex
CREATE INDEX "images_sha256_hash_idx" ON "images"("sha256_hash");

-- CreateIndex
CREATE INDEX "images_phash_idx" ON "images"("phash");

-- CreateIndex
CREATE INDEX "images_processing_status_idx" ON "images"("processing_status");

-- CreateIndex
CREATE INDEX "images_user_id_processing_status_idx" ON "images"("user_id", "processing_status");

-- CreateIndex
CREATE INDEX "images_source_idx" ON "images"("source");

-- CreateIndex
CREATE INDEX "images_taken_at_idx" ON "images"("taken_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "images_user_id_cloudinary_id_key" ON "images"("user_id", "cloudinary_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "image_categories_category_id_idx" ON "image_categories"("category_id");

-- CreateIndex
CREATE INDEX "duplicate_groups_user_id_idx" ON "duplicate_groups"("user_id");

-- CreateIndex
CREATE INDEX "face_clusters_user_id_idx" ON "face_clusters"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "faces_qdrant_id_key" ON "faces"("qdrant_id");

-- CreateIndex
CREATE INDEX "faces_image_id_idx" ON "faces"("image_id");

-- CreateIndex
CREATE INDEX "faces_cluster_id_idx" ON "faces"("cluster_id");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_records_image_id_key" ON "ocr_records"("image_id");

-- CreateIndex
CREATE INDEX "processing_jobs_image_id_idx" ON "processing_jobs"("image_id");

-- CreateIndex
CREATE INDEX "processing_jobs_status_job_type_idx" ON "processing_jobs"("status", "job_type");

-- CreateIndex
CREATE UNIQUE INDEX "processing_jobs_image_id_job_type_key" ON "processing_jobs"("image_id", "job_type");

-- CreateIndex
CREATE INDEX "event_jobs_user_id_idx" ON "event_jobs"("user_id");

-- CreateIndex
CREATE INDEX "event_jobs_status_idx" ON "event_jobs"("status");

-- CreateIndex
CREATE INDEX "events_user_id_idx" ON "events"("user_id");

-- CreateIndex
CREATE INDEX "events_user_id_start_at_idx" ON "events"("user_id", "start_at");

-- CreateIndex
CREATE INDEX "event_images_image_id_idx" ON "event_images"("image_id");

-- AddForeignKey
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_categories" ADD CONSTRAINT "image_categories_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_categories" ADD CONSTRAINT "image_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_groups" ADD CONSTRAINT "duplicate_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_groups" ADD CONSTRAINT "duplicate_groups_representative_image_id_fkey" FOREIGN KEY ("representative_image_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_group_members" ADD CONSTRAINT "duplicate_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "duplicate_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_group_members" ADD CONSTRAINT "duplicate_group_members_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_clusters" ADD CONSTRAINT "face_clusters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faces" ADD CONSTRAINT "faces_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faces" ADD CONSTRAINT "faces_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "face_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocr_records" ADD CONSTRAINT "ocr_records_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_jobs" ADD CONSTRAINT "event_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_images" ADD CONSTRAINT "event_images_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_images" ADD CONSTRAINT "event_images_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;
