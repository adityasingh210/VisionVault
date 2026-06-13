import "dotenv/config";
import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { getRedis } from "../config/redis.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { connectRedis, disconnectRedis } from "../config/redis.js";

import { processHashJob } from "./processors/hash.processor.js";
import { processEmbeddingJob } from "./processors/embedding.processor.js";
import { processOcrJob } from "./processors/ocr.processor.js";
import { processFaceJob } from "./processors/face.processor.js";
import { processCategoryJob } from "./processors/category.processor.js";

import { closeImageQueue } from "./queues/image.queue.js";
import { closeEmbeddingQueue } from "./queues/embedding.queue.js";
import { closeOcrQueue } from "./queues/ocr.queue.js";
import { closeFaceQueue } from "./queues/face.queue.js";
import { closeCategoryQueue } from "./queues/category.queue.js";

import { loadClipModels } from "../ai/clip.service.js";
import { loadCategoryEmbeddings } from "../ai/category.service.js";
import { loadFaceModels } from "../ai/face.service.js";
import logger from "../lib/logger.js";
import { processEventJob } from "./processors/event.processor.js";
import { closeEventQueue } from "./queues/event.queue.js";
import { seedCategories } from "./processors/category.processor.js";

let worker = null;

async function processJob(job) {
  switch (job.name) {
    case "hash":
      return processHashJob(job);
    case "embedding":
      return processEmbeddingJob(job);
    case "ocr":
      return processOcrJob(job);
    case "face":
      return processFaceJob(job);
    case "category":
      return processCategoryJob(job);
    case "event":
      return processEventJob(job);
    default:
      throw new Error(`Unknown job type: ${job.name}`);
  }
}

async function start() {
  await connectDatabase();
  await connectRedis();
  await seedCategories();

  logger.info("Preloading AI models...");
  await Promise.all([
    loadClipModels().then(() => logger.info("CLIP models ready")),
    loadCategoryEmbeddings().then(() => logger.info("Category embeddings ready")),
    loadFaceModels().then(() => logger.info("Face models ready")),
  ]);

  worker = new Worker("image-processing", processJob, {
    connection: getRedis(),
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });

  worker.on("active", (job) => {
    logger.debug("Job started", {
      jobId: job.id,
      jobName: job.name,
      imageId: job.data.imageId,
    });
  });

  worker.on("completed", (job) => {
    logger.info("Job completed", {
      jobId: job.id,
      jobName: job.name,
      imageId: job.data.imageId,
    });
  });

  worker.on("failed", (job, err) => {
    logger.error("Job failed", {
      jobId: job?.id,
      jobName: job?.name,
      data: job?.data,
      attempt: job?.attemptsMade,
      error: err.message,
    });
  });

  worker.on("error", (err) => {
    logger.error("Worker error", { error: err.message });
  });

  worker.on("stalled", (jobId) => {
    logger.warn("Job stalled", { jobId });
  });

  logger.info("Worker started", {
    queue: "image-processing",
    concurrency: 3,
    env: env.NODE_ENV,
  });
}

async function shutdown(signal) {
  logger.info(`Worker received ${signal}, shutting down gracefully`);

  try {
    if (worker) await worker.close();

    await Promise.allSettled([
      closeImageQueue(),
      closeEmbeddingQueue(),
      closeOcrQueue(),
      closeFaceQueue(),
      closeCategoryQueue(),
      closeEventQueue(),
    ]);

    await disconnectDatabase();
    await disconnectRedis();

    logger.info("Worker shutdown complete");
    process.exit(0);
  } catch (err) {
    logger.error("Worker shutdown error", { error: err.message });
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error("Worker uncaught exception", {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Worker unhandled rejection", { reason: String(reason) });
  process.exit(1);
});

start().catch((err) => {
    console.error(err);
  process.exit(1);
});
