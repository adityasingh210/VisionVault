// src/workers/queues/ocr.queue.js

import { Queue } from "bullmq";
import { getRedis } from "../../config/redis.js";
import logger from "../../lib/logger.js";

let ocrQueue = null;

export function getOcrQueue() {
  if (!ocrQueue) {
    ocrQueue = new Queue("image-processing", {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5_000,
        },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    });

    ocrQueue.on("error", (err) => {
      logger.error("OCR queue error", { error: err.message });
    });
  }

  return ocrQueue;
}

export async function enqueueOcrJob(imageId) {
  const queue = getOcrQueue();

  const job = await queue.add(
    "ocr",
    { imageId },
    { jobId: `ocr:${imageId}` }
  );

  logger.debug("OCR job enqueued", { imageId, jobId: job.id });
  return job;
}

export async function closeOcrQueue() {
  if (ocrQueue) {
    await ocrQueue.close();
    ocrQueue = null;
  }
}
