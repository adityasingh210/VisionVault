// src/workers/processors/face.processor.js

import { randomUUID } from "crypto";
import prisma from "../../config/database.js";
import qdrantClient, { COLLECTIONS } from "../../config/qdrant.js";
import {
  detectFaces,
  cosineSimilarity,
  FACE_SIMILARITY_THRESHOLD,
} from "../../ai/face.service.js";
import logger from "../../lib/logger.js";

async function updateJobStatus(imageId, status, error = null) {
  await prisma.processingJob.updateMany({
    where: { imageId, jobType: "FACE" },
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

async function assignCluster(userId, faceId, embedding) {
  // Search top-5 nearest faces for this user
  const searchResult = await qdrantClient.search(COLLECTIONS.FACE_EMBEDDINGS, {
    vector: embedding,
    limit: 5,
    filter: {
      must: [{ key: "user_id", match: { value: userId } }],
    },
    with_payload: true,
  });

  for (const hit of searchResult) {
    if (hit.payload.face_id === faceId) continue;

    const similarity = hit.score;
    if (similarity >= FACE_SIMILARITY_THRESHOLD) {
      const existingFace = await prisma.face.findUnique({
        where: { qdrantId: String(hit.payload.face_id) },
        select: { clusterId: true },
      });

      if (existingFace?.clusterId) {
        return existingFace.clusterId;
      }
    }
  }

  const cluster = await prisma.faceCluster.create({
    data: { userId },
  });

  return cluster.id;
}

export async function processFaceJob(job) {
  const { imageId } = job.data;

  logger.info("Processing face job", { imageId, attempt: job.attemptsMade });

  await prisma.processingJob.upsert({
    where: { imageId_jobType: { imageId, jobType: "FACE" } },
    create: {
      imageId,
      jobType: "FACE",
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
    logger.warn("Face job skipped — image not found", { imageId });
    return;
  }

  let faces;
  try {
    faces = await detectFaces(image.cloudinaryUrl);
  } catch (err) {
    await updateJobStatus(imageId, "FAILED", `Face detection failed: ${err.message}`);
    throw err;
  }

  logger.info("Faces detected", { imageId, count: faces.length });

  for (const face of faces) {
    const faceId = randomUUID();
    try {
      await qdrantClient.upsert(COLLECTIONS.FACE_EMBEDDINGS, {
        wait: true,
        points: [
          {
            id: faceId,
            vector: face.embedding,
            payload: {
              face_id: faceId,
              image_id: imageId,
              user_id: image.userId,
              cluster_id: null, // will be updated after assignment
            },
          },
        ],
      });
    } catch (err) {
      logger.error("Qdrant face upsert failed", { imageId, faceId, error: err.message });
      throw err;
    }
    const clusterId = await assignCluster(image.userId, faceId, face.embedding);
    await prisma.face.create({
      data: {
        id: faceId,
        imageId,
        qdrantId: faceId,
        bboxX: face.bbox.x,
        bboxY: face.bbox.y,
        bboxW: face.bbox.w,
        bboxH: face.bbox.h,
        clusterId,
      },
    });
    await qdrantClient.setPayload(COLLECTIONS.FACE_EMBEDDINGS, {
      payload: { cluster_id: clusterId },
      points: [faceId],
    });
  }

  await updateJobStatus(imageId, "COMPLETED");

  if (await allJobsComplete(imageId)) {
    await prisma.image.update({
      where: { id: imageId },
      data: { processingStatus: "COMPLETED" },
    });
  }

  logger.info("Face job completed", { imageId, facesStored: faces.length });
}
