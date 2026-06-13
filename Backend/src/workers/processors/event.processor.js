import prisma from "../../config/database.js";
import {
  bucketByTime,
  mergeByLocation,
  refineByVisualSimilarity,
  reinforceByFaces,
  generateEventTitle,
} from "../../ai/event.service.js";
import logger from "../../lib/logger.js";

const BATCH_SIZE = 500;

export async function processEventJob(job) {
  const { userId, eventJobId } = job.data;

  logger.info("Processing event job", { userId, eventJobId });
  await prisma.eventJob.update({
    where: { id: eventJobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    await runEventClustering(userId, eventJobId);
  } catch (err) {
    await prisma.eventJob.update({
      where: { id: eventJobId },
      data: {
        status: "FAILED",
        error: String(err?.message ?? err).slice(0, 1000),
      },
    });
    throw err;
  }
}

async function runEventClustering(userId, eventJobId) {
  const allImages = await fetchAllImages(userId);

  logger.info("Images fetched for event clustering", {
    userId,
    count: allImages.length,
  });

  if (allImages.length < 3) {
    await prisma.eventJob.update({
      where: { id: eventJobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        imageCount: allImages.length,
        eventCount: 0,
      },
    });
    return;
  }
  const imageToFaceClusters = buildFaceClusterMap(allImages);
  const imageToCategorySlug = buildCategoryMap(allImages);
  let buckets = bucketByTime(allImages);
  logger.info("Time buckets created", { userId, buckets: buckets.length });
  buckets = mergeByLocation(buckets);
  logger.info("After location merge", { userId, buckets: buckets.length });
  buckets = await refineByVisualSimilarity(buckets, userId);
  logger.info("After visual refinement", { userId, buckets: buckets.length });
  buckets = reinforceByFaces(buckets, imageToFaceClusters);
  logger.info("After face reinforcement", { userId, buckets: buckets.length });
  const validBuckets = buckets.filter((b) => b.images.length >= 3);
  logger.info("Valid events", { userId, count: validBuckets.length });
  await prisma.event.deleteMany({ where: { userId } });
  let eventCount = 0;

  for (const bucket of validBuckets) {
    const title = generateEventTitle(
      bucket,
      imageToCategorySlug,
      imageToFaceClusters
    );
    const coverImage = bucket.images[0];
    const uniqueImageIds = [...new Set(bucket.images.map((img) => img.id))];

    const event = await prisma.event.create({
      data: {
        userId,
        title,
        coverImageId: coverImage?.id ?? null,
        startAt: bucket.startAt ?? null,
        endAt: bucket.endAt ?? null,
        locationLat: bucket.lat ?? null,
        locationLng: bucket.lng ?? null,
        metadata: {
          imageCount: uniqueImageIds.length,
        },
        eventImages: {
          create: uniqueImageIds.map((imageId) => ({ imageId })),
        },
      },
    });

    eventCount++;
    logger.debug("Event created", { eventId: event.id, title, imageCount: uniqueImageIds.length });
  }
  await prisma.eventJob.update({
    where: { id: eventJobId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      imageCount: allImages.length,
      eventCount,
    },
  });

  logger.info("Event clustering complete", { userId, eventCount });
}
async function fetchAllImages(userId) {
  const all = [];
  let cursor = undefined;

  while (true) {
    const batch = await prisma.image.findMany({
      where: {
        userId,
        processingStatus: "COMPLETED",
        deletedAt: null,
      },
      select: {
        id: true,
        takenAt: true,
        locationLat: true,
        locationLng: true,
        faces: {
          select: { clusterId: true },
          where: { clusterId: { not: null } },
        },
        imageCategories: {
          select: {
            confidence: true,
            category: { select: { slug: true } },
          },
          orderBy: { confidence: "desc" },
          take: 1,
        },
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (!batch.length) break;

    all.push(...batch);
    cursor = batch[batch.length - 1].id;

    if (batch.length < BATCH_SIZE) break;
  }

  return all;
}
function buildFaceClusterMap(images) {
  const map = new Map();
  for (const img of images) {
    const clusterIds = img.faces
      .map((f) => f.clusterId)
      .filter(Boolean);
    map.set(img.id, clusterIds);
  }
  return map;
}

function buildCategoryMap(images) {
  const map = new Map();
  for (const img of images) {
    const topCat = img.imageCategories[0]?.category?.slug ?? "other";
    map.set(img.id, topCat);
  }
  return map;
}
