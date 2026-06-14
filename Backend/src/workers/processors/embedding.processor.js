import prisma from "../../config/database.js";
import qdrantClient, { COLLECTIONS } from "../../config/qdrant.js";
import { generateImageEmbedding } from "../../ai/clip.service.js";
import logger from "../../lib/logger.js";

async function updateJobStatus(imageId, jobType, status, error = null) {
  await prisma.processingJob.updateMany({
    where: { imageId, jobType },
    data: {
      status,
      ...(status === "RUNNING" && { startedAt: new Date() }),
      ...(status === "COMPLETED" && { completedAt: new Date() }),
      ...(error && { error: error.slice(0, 1000) }), // cap error string length
    },
  });
}
async function allJobsComplete(imageId) {
  const pendingJobs = await prisma.processingJob.count({
    where: {
      imageId,
      jobType: { not: "CLUSTER" },
      status: { notIn: ["COMPLETED", "FAILED"] },
    },
  });

  return pendingJobs === 0;
}
export async function processEmbeddingJob(job) {
  const { imageId } = job.data;

  logger.info("Processing embedding job", { imageId, attempt: job.attemptsMade });
  await prisma.processingJob.upsert({
    where: {
      imageId_jobType: { imageId, jobType: "EMBEDDING" },
    },
    create: {
      imageId,
      jobType: "EMBEDDING",
      status: "RUNNING",
      startedAt: new Date(),
    },
    update: {
      status: "RUNNING",
      startedAt: new Date(),
      attempts: { increment: 1 },
      error: null,
    },
  });

  let image;
  try {
    image = await prisma.image.findUnique({
      where: { id: imageId },
      select: {
        id: true,
        userId: true,
        cloudinaryUrl: true,
        source: true,
        takenAt: true,
        imageCategories: {
          select: {
            category: { select: { slug: true } },
            confidence: true,
          },
          orderBy: { confidence: "desc" },
          take: 1,
        },
      },
    });
  } catch (err) {
    await updateJobStatus(imageId, "EMBEDDING", "FAILED", err.message);
    throw err;
  }
if (!image) {
  await updateJobStatus(
    imageId,
    "EMBEDDING",
    "FAILED",
    "Image not found"
  );

  logger.warn("Embedding job skipped — image not found", {
    imageId,
  });

  return;
}
  let embedding;
  try {
    embedding = await generateImageEmbedding(image.cloudinaryUrl);
  } catch (err) {
    await updateJobStatus(
      imageId,
      "EMBEDDING",
      "FAILED",
      `CLIP inference failed: ${err.message}`
    );
    throw err;
  }
  const topCategory = image.imageCategories[0]?.category?.slug ?? "other";
  const takenAtValue = image.takenAt
  ? image.takenAt.toISOString()
  : null;

  try {
    function uuidToInt(uuid) {
  return parseInt(uuid.replace(/-/g, '').slice(0, 15), 16);
}
    await qdrantClient.upsert(COLLECTIONS.IMAGE_EMBEDDINGS, {
      wait: true,
      points: [
        {
          id: uuidToInt(imageId), 
          vector: embedding,
          payload: {
            image_id: imageId, 
            user_id: image.userId,
            category: topCategory,
            taken_at: takenAtValue,
            source: image.source,
          },
        },
      ],
    });
  } catch (err) {
    await updateJobStatus(
      imageId,
      "EMBEDDING",
      "FAILED",
      `Qdrant upsert failed: ${err.message}`
    );
    throw err;
  }

  await updateJobStatus(imageId, "EMBEDDING", "COMPLETED");
  if (await allJobsComplete(imageId)) {
    await prisma.image.update({
      where: { id: imageId },
      data: { processingStatus: "COMPLETED" },
    });
  }

  logger.info("Embedding job completed", { imageId, category: topCategory });
}