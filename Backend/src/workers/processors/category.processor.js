

import prisma from "../../config/database.js";
import qdrantClient, { COLLECTIONS } from "../../config/qdrant.js";
import { classifyImage, CATEGORIES } from "../../ai/category.service.js";
import logger from "../../lib/logger.js";

async function updateJobStatus(imageId, status, error = null) {
  await prisma.processingJob.updateMany({
    where: { imageId, jobType: "CATEGORY" },
    data: {
      status,
      ...(status === "RUNNING" && { startedAt: new Date() }),
      ...(status === "COMPLETED" && { completedAt: new Date() }),
      ...(error && { error: error.slice(0, 1000) }),
    },
  });
}

async function allJobsComplete(imageId) {
  const pending = await prisma.processingJob.count({
    where: {
      imageId,
      jobType: { not: "CLUSTER" },
      status: { notIn: ["COMPLETED", "FAILED"] },
    },
  });
  return pending === 0;
}
export async function seedCategories() {
  await Promise.all(
    CATEGORIES.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        create: { slug: c.slug, label: c.slug.charAt(0).toUpperCase() + c.slug.slice(1) },
        update: {},
      })
    )
  );
}

export async function processCategoryJob(job) {
  const { imageId } = job.data;

  logger.info("Processing category job", { imageId, attempt: job.attemptsMade });

  await prisma.processingJob.upsert({
    where: { imageId_jobType: { imageId, jobType: "CATEGORY" } },
    create: {
      imageId,
      jobType: "CATEGORY",
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
      select: { id: true, userId: true, cloudinaryUrl: true },
    });
  } catch (err) {
    await updateJobStatus(imageId, "FAILED", err.message);
    throw err;
  }

  if (!image) {
    logger.warn("Category job skipped — image not found", { imageId });
    return;
  }

  let predictions;
  try {
    predictions = await classifyImage(image.cloudinaryUrl);
  } catch (err) {
    await updateJobStatus(imageId, "FAILED", `Classification failed: ${err.message}`);
    throw err;
  }

  const categorySlugs = predictions.map((p) => p.slug);
  const categories = await prisma.category.findMany({
    where: { slug: { in: categorySlugs } },
    select: { id: true, slug: true },
  });
  const slugToId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  await Promise.all(
    predictions.map((p) => {
      const categoryId = slugToId[p.slug];
      if (!categoryId) return null;
      return prisma.imageCategory.upsert({
        where: { imageId_categoryId: { imageId, categoryId } },
        create: { imageId, categoryId, confidence: p.confidence },
        update: { confidence: p.confidence },
      });
    })
  );
  const topCategory = predictions[0]?.slug ?? "other";
  try {
    await qdrantClient.setPayload(COLLECTIONS.IMAGE_EMBEDDINGS, {
      payload: { category: topCategory },
      points: [imageId],
    });
  } catch (err) {
    logger.warn("Could not update Qdrant category payload", {
      imageId,
      error: err.message,
    });
  }

  await updateJobStatus(imageId, "COMPLETED");

  if (await allJobsComplete(imageId)) {
    await prisma.image.update({
      where: { id: imageId },
      data: { processingStatus: "COMPLETED" },
    });
  }

  logger.info("Category job completed", { imageId, topCategory, predictions });
}
