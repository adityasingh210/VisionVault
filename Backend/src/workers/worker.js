import "dotenv/config";
import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { getRedis } from "../config/redis.js";
import {
  connectDatabase,
  disconnectDatabase,
} from "../config/database.js";
import {
  connectRedis,
  disconnectRedis,
} from "../config/redis.js";

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
  try {
    await connectDatabase();
    await connectRedis();
    await seedCategories();

    logger.info("Preloading AI models...");

    await Promise.all([
      loadClipModels().then(() => {
        logger.info("CLIP models ready");
      }),

      loadCategoryEmbeddings().then(() => {
        logger.info("Category embeddings ready");
      }),
    ]);

    try {
      console.log("========== BEFORE FACE MODELS ==========");

      await loadFaceModels();

      console.log("========== AFTER FACE MODELS ==========");

      logger.info("Face models ready");
    } catch (err) {
      console.error("========== FACE MODEL ERROR ==========");
      console.error(err);
      console.error("MESSAGE:", err?.message);
      console.error("STACK:", err?.stack);

      logger.error("Face models failed to load", {
        error: err?.message,
        stack: err?.stack,
      });
    }

    worker = new Worker("image-processing", processJob, {
      connection: getRedis(),
      concurrency: 1,
      lockDuration: 300000,
      stalledInterval: 60000,
      maxStalledCount: 1,
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
      logger.error(
        {
          jobName: job?.name,
          imageId: job?.data?.imageId,
          error: err?.stack || err?.message,
        },
        "Job failed"
      );
    });

    worker.on("error", (err) => {
      logger.error("Worker error", {
        error: err?.stack || err?.message,
      });
    });

    getRedis().on("error", (err) => {
      logger.error("Redis connection error", {
        error: err?.stack || err?.message,
      });
    });

    worker.on("stalled", (jobId) => {
      logger.warn("Job stalled detected and handled", {
        jobId,
      });
    });

    logger.info("Worker started", {
      queue: "image-processing",
      concurrency: 1,
      env: env.NODE_ENV,
    });
  } catch (err) {
    console.error("========== WORKER START FAILED ==========");
    console.error(err);
    console.error("MESSAGE:", err?.message);
    console.error("STACK:", err?.stack);

    logger.error("Worker start failed", {
      error: err?.stack || err?.message,
    });

    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info(
    `Worker received ${signal}, shutting down gracefully`
  );

  try {
    if (worker) {
      await worker.close();
    }

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
    logger.error("Worker shutdown error", {
      error: err?.message,
      stack: err?.stack,
    });

    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("uncaughtException", (err) => {
  console.error("========== UNCAUGHT EXCEPTION ==========");
  console.error(err);
  console.error(err?.stack);

  logger.error("Worker uncaught exception", {
    error: err?.message,
    stack: err?.stack,
  });

  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("========== UNHANDLED REJECTION ==========");
  console.error(reason);

  logger.error("Worker unhandled rejection", {
    reason,
  });
});

start().catch((err) => {
  console.error("========== WORKER START FAILED ==========");
  console.error(err);
  console.error("MESSAGE:", err?.message);
  console.error("STACK:", err?.stack);

  process.exit(1);
});