import { fileTypeFromBuffer } from "file-type";
import prisma from "../../config/database.js";
import cloudinary from "../../config/cloudinary.js";
import qdrantClient, { COLLECTIONS } from "../../config/qdrant.js";
import { enqueueHashJob } from "../../workers/queues/image.queue.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import logger from "../../lib/logger.js";

const MAX_FILE_SIZE_BYTES = env.MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
  "image/gif",
]);

const imageSelectFields = {
  id: true,
  userId: true,
  filename: true,
  cloudinaryUrl: true,
  width: true,
  height: true,
  fileSize: true,
  mimeType: true,
  source: true,
  takenAt: true,
  locationLat: true,
  locationLng: true,
  processingStatus: true,
  createdAt: true,
  updatedAt: true,
};

function serializeImage(image) {
  return {
    ...image,
    fileSize:
      image.fileSize != null
        ? image.fileSize.toString()
        : null,
  };
}

async function validateImageBuffer(buffer, originalName) {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(
      `File "${originalName}" exceeds maximum size of ${env.MAX_FILE_SIZE_MB}MB`
    );
  }
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw new ValidationError(
      `File "${originalName}" is not a supported image format`
    );
  }
  return detected.mime;
}

async function uploadToCloudinary(buffer, filename, userId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `photo-platform/${userId}`,
        resource_type: "image",
        eager: [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
        eager_async: false,
        use_filename: true,
        unique_filename: true,
        filename_override: filename,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

export async function uploadImages(files, userId) {
  const results = await Promise.allSettled(
    files.map((file) => uploadSingleImage(file, userId))
  );

  const succeeded = [];
  const failed = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      succeeded.push(result.value);
    } else {
      failed.push({
        filename: files[i].originalname,
        error: result.reason?.message ?? "Upload failed",
      });
    }
  }

  return { succeeded, failed };
}

async function uploadSingleImage(file, userId) {
  const { buffer, originalname } = file;
  const mimeType = await validateImageBuffer(buffer, originalname);
  const cloudinaryResult = await uploadToCloudinary(buffer, originalname, userId);

  const image = await prisma.$transaction(async (tx) => {
    const created = await tx.image.create({
      data: {
        userId,
        filename: originalname,
        cloudinaryId: cloudinaryResult.public_id,
        cloudinaryUrl: cloudinaryResult.secure_url,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        fileSize: BigInt(buffer.length),
        mimeType,
        source: "LOCAL",
        processingStatus: "PENDING",
      },
      select: imageSelectFields,
    });

    await tx.processingJob.create({
      data: { imageId: created.id, jobType: "HASH", status: "QUEUED" },
    });

    return created;
  });

  try {
    await enqueueHashJob(image.id);
  } catch (err) {
    logger.error(
      { err, imageId: image.id },
      "Failed to enqueue hash job"
    );

    await prisma.processingJob.update({
      where: {
        imageId_jobType: {
          imageId: image.id,
          jobType: "HASH",
        },
      },
      data: {
        status: "FAILED",
        error: err.message,
      },
    });

    await prisma.image.update({
      where: { id: image.id },
      data: { processingStatus: "FAILED" },
    });

    throw err;
  }

  return serializeImage(image);
}

export async function getImages(userId, query) {
  const limit = Math.min(
    query.limit ?? env.DEFAULT_PAGE_SIZE,
    env.MAX_PAGE_SIZE
  );

  const where = {
    userId,
    deletedAt: null,
    ...(query.source && { source: query.source }),
    ...(query.status && { processingStatus: query.status }),
  };

  const images = await prisma.image.findMany({
    where,
    select: imageSelectFields,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    skip: query.cursor ? 1 : 0,
    ...(query.cursor && { cursor: { id: query.cursor } }),
  });

  const hasNextPage = images.length > limit;
  const trimmed = hasNextPage ? images.slice(0, limit) : images;

  return {
    images: trimmed.map(serializeImage),
    pagination: {
      nextCursor: hasNextPage ? trimmed[trimmed.length - 1].id : null,
      hasNextPage,
      count: trimmed.length,
    },
  };
}

export async function getImageById(imageId, userId) {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    select: {
      ...imageSelectFields,
      deletedAt: true,
      ocrRecord: {
        select: { rawText: true, language: true, confidence: true },
      },
      imageCategories: {
        select: {
          confidence: true,
          category: { select: { slug: true, label: true } },
        },
      },
      faces: {
        select: {
          id: true,
          bboxX: true,
          bboxY: true,
          bboxW: true,
          bboxH: true,
          clusterId: true,
        },
      },
    },
  });

  if (!image || image.deletedAt) throw new NotFoundError("Image");
  if (image.userId !== userId) throw new ForbiddenError();

  const { deletedAt, ...publicImage } = image;
  return serializeImage(publicImage);
}

export async function getImageProcessingStatus(imageId, userId) {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    select: {
      id: true,
      userId: true,
      processingStatus: true,
      processingJobs: {
        select: {
          jobType: true,
          status: true,
          attempts: true,
          error: true,
          queuedAt: true,
          startedAt: true,
          completedAt: true,
        },
        orderBy: { queuedAt: "asc" },
      },
    },
  });

  if (!image) throw new NotFoundError("Image");
  if (image.userId !== userId) throw new ForbiddenError();

  return {
    imageId: image.id,
    processingStatus: image.processingStatus,
    jobs: image.processingJobs,
  };
}

export async function deleteImage(imageId, userId) {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    select: {
      id: true,
      userId: true,
      cloudinaryId: true,
      faces: { select: { qdrantId: true } },
    },
  });

  if (!image) throw new NotFoundError("Image");
  if (image.userId !== userId) throw new ForbiddenError();

  await cloudinary.uploader.destroy(image.cloudinaryId, {
    resource_type: "image",
  });

  await cleanupQdrantForImages([image]);

  // Soft delete: rows are kept (OcrRecord/Face/ImageCategory/etc are no longer
  // cascade-removed since the Image row itself isn't hard-deleted), and every
  // read path that matters already filters on `deletedAt: null`.
  await prisma.image.update({
    where: { id: imageId },
    data: { deletedAt: new Date() },
  });
}

export async function bulkDeleteImages(imageIds, userId) {
  const images = await prisma.image.findMany({
    where: { id: { in: imageIds }, userId, deletedAt: null },
    select: { id: true, cloudinaryId: true, faces: { select: { qdrantId: true } } },
  });

  if (images.length === 0) throw new NotFoundError("Images");

  const cloudinaryResults = await Promise.allSettled(
    images.map((img) =>
      cloudinary.uploader.destroy(img.cloudinaryId, { resource_type: "image" })
    )
  );

  cloudinaryResults.forEach((result, i) => {
    if (result.status === "rejected") {
      logger.warn("Cloudinary delete failed during bulk delete", {
        cloudinaryId: images[i].cloudinaryId,
        error: result.reason?.message,
      });
    }
  });

  await cleanupQdrantForImages(images);

  const deletedIds = images.map((img) => img.id);
  await prisma.image.updateMany({
    where: { id: { in: deletedIds } },
    data: { deletedAt: new Date() },
  });

  return { deleted: deletedIds.length };
}

/**
 * Removes the Qdrant points for a batch of images (their semantic-search
 * vector) and every face vector belonging to them, so deleting an image never
 * leaves ghost vectors behind that later pollute search results/pagination
 * totals or get face-clustered against a photo the user already deleted.
 *
 * @param {Array<{ id: string, faces?: Array<{ qdrantId: string }> }>} images
 */
async function cleanupQdrantForImages(images) {
  const imageIds = images.map((img) => img.id);
  const faceQdrantIds = images.flatMap((img) => (img.faces ?? []).map((f) => f.qdrantId));

  const results = await Promise.allSettled([
    qdrantClient.delete(COLLECTIONS.IMAGE_EMBEDDINGS, { wait: true, points: imageIds }),
    faceQdrantIds.length
      ? qdrantClient.delete(COLLECTIONS.FACE_EMBEDDINGS, { wait: true, points: faceQdrantIds })
      : Promise.resolve(),
  ]);

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      logger.warn("Qdrant cleanup failed during image delete", {
        collection: i === 0 ? COLLECTIONS.IMAGE_EMBEDDINGS : COLLECTIONS.FACE_EMBEDDINGS,
        imageIds,
        error: result.reason?.message,
      });
    }
  });
}

export async function searchImagesByOcr(userId, query) {
  const limit = Math.min(query.limit ?? env.DEFAULT_PAGE_SIZE, env.MAX_PAGE_SIZE);
  const offset = query.offset ?? 0;
  const searchQuery = query.q.trim();
  const tsQuery = searchQuery
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word}:*`)
    .join(" & ");

  const rawResults = await prisma.$queryRaw`
    SELECT
      i.id,
      ocr.raw_text AS "rawText",
      ts_rank(ocr.text_search, to_tsquery('english', ${tsQuery})) AS rank
    FROM ocr_records ocr
    JOIN images i ON i.id = ocr.image_id
    WHERE
      i.user_id = ${userId}
      AND i.deleted_at IS NULL
      AND ocr.text_search @@ to_tsquery('english', ${tsQuery})
    ORDER BY rank DESC, i.created_at DESC
    LIMIT ${limit + 1}
    OFFSET ${offset}
  `;

  const hasNextPage = rawResults.length > limit;
  const trimmed = hasNextPage ? rawResults.slice(0, limit) : rawResults;

  if (trimmed.length === 0) {
    return {
      images: [],
      pagination: { nextOffset: null, hasNextPage: false, count: 0 },
    };
  }

  const imageIds = trimmed.map((r) => r.id);
  const images = await prisma.image.findMany({
    where: { id: { in: imageIds } },
    select: imageSelectFields,
  });
  const imageMap = Object.fromEntries(images.map((img) => [img.id, img]));
  const orderedImages = trimmed.map((r) => imageMap[r.id]).filter(Boolean);

  return {
    images: orderedImages,
    pagination: {
      nextOffset: hasNextPage ? offset + limit : null,
      hasNextPage,
      count: orderedImages.length,
    },
  };
}