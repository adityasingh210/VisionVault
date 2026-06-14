import { fileTypeFromBuffer } from "file-type";
import prisma from "../../config/database.js";
import cloudinary from "../../config/cloudinary.js";
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
    {
      err,
      imageId: image.id,
    },
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
    where: {
      id: image.id,
    },
    data: {
      processingStatus: "FAILED",
    },
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
    ...(query.source && { source: query.source }),
    ...(query.status && { processingStatus: query.status }),
  };

  const images = await prisma.image.findMany({
    where,
    select: imageSelectFields,
    orderBy: { createdAt: "desc" },
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

  if (!image) throw new NotFoundError("Image");
  if (image.userId !== userId) throw new ForbiddenError();

  return serializeImage(image);
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
    select: { id: true, userId: true, cloudinaryId: true },
  });

  if (!image) throw new NotFoundError("Image");
  if (image.userId !== userId) throw new ForbiddenError();

  await cloudinary.uploader.destroy(image.cloudinaryId, {
    resource_type: "image",
  });

  await prisma.image.delete({ where: { id: imageId } });
}

export async function bulkDeleteImages(imageIds, userId) {
  const images = await prisma.image.findMany({
    where: { id: { in: imageIds }, userId },
    select: { id: true, cloudinaryId: true },
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

  const deletedIds = images.map((img) => img.id);
  await prisma.image.deleteMany({ where: { id: { in: deletedIds } } });

  return { deleted: deletedIds.length };
}

/**
 *
 * @param {string} userId
 * @param {{ q: string, cursor?: string, limit?: number }} query
 */
export async function searchImagesByOcr(userId, query) {
  const limit = Math.min(query.limit ?? env.DEFAULT_PAGE_SIZE, env.MAX_PAGE_SIZE);
  const searchQuery = query.q.trim();
  const tsQuery = searchQuery
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word}:*`) 
    .join(" & ");

  const rawResults = await prisma.$queryRaw`
    SELECT
      i.id,
      ocr."rawText",
      ts_rank(ocr."textSearch", to_tsquery('english', ${tsQuery})) AS rank
    FROM "OcrRecord" ocr
    JOIN "Image" i ON i.id = ocr."imageId"
    WHERE
      i."userId" = ${userId}
      AND ocr."textSearch" @@ to_tsquery('english', ${tsQuery})
      ${query.cursor ? prisma.$queryRaw`AND i.id > ${query.cursor}` : prisma.$queryRaw``}
    ORDER BY rank DESC, i."createdAt" DESC
    LIMIT ${limit + 1}
  `;

  const hasNextPage = rawResults.length > limit;
  const trimmed = hasNextPage ? rawResults.slice(0, limit) : rawResults;

  if (trimmed.length === 0) {
    return {
      images: [],
      pagination: { nextCursor: null, hasNextPage: false, count: 0 },
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
      nextCursor: hasNextPage ? trimmed[trimmed.length - 1].id : null,
      hasNextPage,
      count: orderedImages.length,
    },
  };
}
