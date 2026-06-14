import crypto from "crypto";
import prisma from "../../config/database.js";
import { enqueueEmbeddingJob } from "../queues/embedding.queue.js";
import { enqueueOcrJob } from "../queues/ocr.queue.js";
import { enqueueFaceJob } from "../queues/face.queue.js";
import { enqueueCategoryJob } from "../queues/category.queue.js";
import logger from "../../lib/logger.js";
import { env } from "../../config/env.js";
import { Jimp } from "jimp";

const AVERAGE_HASH_SIZE = 32;

function toJpegUrl(url) {
  return url.replace("/upload/", "/upload/f_jpg,q_auto/");
}

async function downloadImageBuffer(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download image: ${response.status} ${response.statusText} — ${url}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function computeSha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function computeAverageHash(buffer) {
  const image = await Jimp.fromBuffer(buffer);
  image.resize({ w: 32, h: 32 });
  image.greyscale();

  const { data, width, height } = image.bitmap;
  const totalPixels = width * height;

  let sum = 0;
  for (let i = 0; i < totalPixels; i++) {
    sum += data[i * 4];
  }
  const mean = sum / totalPixels;

  let hashBits = 0n;
  for (let i = 0; i < totalPixels; i++) {
    hashBits = (hashBits << 1n) | (data[i * 4] >= mean ? 1n : 0n);
  }

  return hashBits.toString(16).padStart(256, "0");
}

function hammingDistance(hexA, hexB) {
  if (hexA.length !== hexB.length) {
    throw new Error(`Hash length mismatch: ${hexA.length} vs ${hexB.length}`);
  }
  const a = BigInt(`0x${hexA}`);
  const b = BigInt(`0x${hexB}`);
  let xor = a ^ b;
  let distance = 0;
  while (xor > 0n) {
    distance += Number(xor & 1n);
    xor >>= 1n;
  }
  return distance;
}

async function findExactDuplicate(sha256Hash, userId, excludeImageId) {
  return prisma.image.findFirst({
    where: { sha256Hash, userId, id: { not: excludeImageId } },
    select: { id: true },
  });
}

async function fetchUserPhashes(userId, excludeImageId) {
  return prisma.image.findMany({
    where: { userId, id: { not: excludeImageId }, phash: { not: null } },
    select: { id: true, phash: true },
  });
}

async function upsertDuplicateGroup(type, imageId, matchingImageId, userId) {
  const existingMembership = await prisma.duplicateGroupMember.findFirst({
    where: { imageId: matchingImageId, group: { type, userId } },
    select: { groupId: true },
  });

  if (existingMembership) {
    await prisma.duplicateGroupMember.upsert({
      where: { groupId_imageId: { groupId: existingMembership.groupId, imageId } },
      create: { groupId: existingMembership.groupId, imageId },
      update: {},
    });
    return existingMembership.groupId;
  }

  const group = await prisma.duplicateGroup.create({
    data: {
      userId,
      type,
      representativeImageId: matchingImageId,
      members: { create: [{ imageId: matchingImageId }, { imageId }] },
    },
  });

  return group.id;
}

async function updateJobStatus(imageId, status, error = null) {
  await prisma.processingJob.updateMany({
    where: { imageId, jobType: "HASH" },
    data: {
      status,
      ...(status === "RUNNING" && { startedAt: new Date() }),
      ...(status === "COMPLETED" && { completedAt: new Date() }),
      ...(error && { error: error.slice(0, 1000) }),
    },
  });
}

async function markImageFailed(imageId) {
  await prisma.image.update({
    where: { id: imageId },
    data: { processingStatus: "FAILED" },
  });
}

async function markImageProcessing(imageId) {
  await prisma.image.update({
    where: { id: imageId },
    data: { processingStatus: "PROCESSING" },
  });
}

export async function processHashJob(job) {
  const { imageId } = job.data;

  logger.info("Processing hash job", { imageId, attempt: job.attemptsMade });

  await updateJobStatus(imageId, "RUNNING");
  await markImageProcessing(imageId);

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
    logger.warn("Hash job skipped — image not found", { imageId });
    return;
  }

  let buffer;
  try {
    buffer = await downloadImageBuffer(toJpegUrl(image.cloudinaryUrl));
  } catch (err) {
    await updateJobStatus(imageId, "FAILED", `Download failed: ${err.message}`);
    await markImageFailed(imageId);
    throw err;
  }

  let sha256Hash, phash;
  try {
    [sha256Hash, phash] = await Promise.all([
      Promise.resolve(computeSha256(buffer)),
      computeAverageHash(buffer),
    ]);
  } catch (err) {
    await updateJobStatus(imageId, "FAILED", `Hashing failed: ${err.message}`);
    await markImageFailed(imageId);
    throw err;
  }

  await prisma.image.update({
    where: { id: imageId },
    data: { sha256Hash, phash },
  });

  const exactMatch = await findExactDuplicate(sha256Hash, image.userId, imageId);
  if (exactMatch) {
    await upsertDuplicateGroup("EXACT", imageId, exactMatch.id, image.userId);
    logger.info("Exact duplicate detected", { imageId, matchId: exactMatch.id });
  }

  const threshold = env.PHASH_HAMMING_THRESHOLD;
  const candidatePhashes = await fetchUserPhashes(image.userId, imageId);
  const nearMatches = candidatePhashes.filter((candidate) => {
    try {
      return hammingDistance(phash, candidate.phash) <= threshold;
    } catch {
      return false;
    }
  });

  for (const match of nearMatches) {
    if (match.id === exactMatch?.id) continue;
    await upsertDuplicateGroup("NEAR", imageId, match.id, image.userId);
    logger.info("Near duplicate detected", {
      imageId,
      matchId: match.id,
      distance: hammingDistance(phash, match.phash),
    });
  }

  await updateJobStatus(imageId, "COMPLETED");

  await prisma.processingJob.createMany({
    data: [
      { imageId, jobType: "OCR",       status: "QUEUED" },
      { imageId, jobType: "EMBEDDING", status: "QUEUED" },
      { imageId, jobType: "CATEGORY",  status: "QUEUED" },
    ],
    skipDuplicates: true,
  });

  await Promise.allSettled([
    enqueueOcrJob(imageId).catch((err) =>
      logger.error("Failed to enqueue OCR job", { imageId, error: err.message })
    ),
    enqueueEmbeddingJob(imageId).catch((err) =>
      logger.error("Failed to enqueue embedding job", { imageId, error: err.message })
    ),
    enqueueCategoryJob(imageId).catch((err) =>
      logger.error("Failed to enqueue category job", { imageId, error: err.message })
    ),
  ]);

  logger.info("Hash job completed", {
    imageId,
    sha256Hash,
    nearMatchCount: nearMatches.length,
    exactMatch: !!exactMatch,
  });
}

export { computeSha256, computeAverageHash, hammingDistance };