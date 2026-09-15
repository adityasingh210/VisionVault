// src/workers/processors/ocr.processor.js

import prisma from "../../config/database.js";
import { extractTextFromImage } from "../../ai/ocr.service.js";
import logger from "../../lib/logger.js";

async function updateJobStatus(imageId, status, error = null) {
  await prisma.processingJob.updateMany({
    where: { imageId, jobType: "OCR" },
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

export async function processOcrJob(job) {
  const { imageId } = job.data;

  logger.info("Processing OCR job", { imageId, attempt: job.attemptsMade });

  await prisma.processingJob.upsert({
    where: { imageId_jobType: { imageId, jobType: "OCR" } },
    create: {
      imageId,
      jobType: "OCR",
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
      select: { id: true, cloudinaryUrl: true },
    });
  } catch (err) {
    await updateJobStatus(imageId, "FAILED", err.message);
    throw err;
  }

  if (!image) {
    logger.warn("OCR job skipped — image not found", { imageId });
    return;
  }

  let ocrResult;
  try {
    ocrResult = await extractTextFromImage(image.cloudinaryUrl);
  } catch (err) {
    await updateJobStatus(imageId, "FAILED", `OCR failed: ${err.message}`);
    throw err;
  }

  if (ocrResult && ocrResult.rawText && ocrResult.rawText.length > 0) {
    let safeConfidence = 0;
    if (ocrResult.confidence) {
      const confNum = Number(ocrResult.confidence);
      safeConfidence = confNum > 1 ? confNum / 100 : confNum;
    }

    await prisma.ocrRecord.upsert({
      where: { imageId },
      create: {
        imageId,
        rawText: ocrResult.rawText,
        language: ocrResult.language || "eng",
        confidence: safeConfidence, 
      },
      update: {
        rawText: ocrResult.rawText,
        language: ocrResult.language || "eng",
        confidence: safeConfidence,
      },
    });
  }

  await updateJobStatus(imageId, "COMPLETED");

  if (await allJobsComplete(imageId)) {
    await prisma.image.update({
      where: { id: imageId },
      data: { processingStatus: "COMPLETED" },
    });
  }

  logger.info("OCR job completed", {
    imageId,
    chars: ocrResult.rawText.length,
    language: ocrResult.language,
    confidence: ocrResult.confidence,
  });
}
