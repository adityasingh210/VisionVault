// src/workers/queues/category.queue.js

import { Queue } from "bullmq";
import { getRedis } from "../../config/redis.js";
import logger from "../../lib/logger.js";

let categoryQueue = null;

export function getCategoryQueue() {
  if (!categoryQueue) {
    categoryQueue = new Queue("image-processing", {
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

    categoryQueue.on("error", (err) => {
      logger.error("Category queue error", { error: err.message });
    });
  }

  return categoryQueue;
}

export async function enqueueCategoryJob(imageId) {
  const queue = getCategoryQueue();

  const job = await queue.add(
    "category",
    { imageId },
    { jobId: `category_${imageId}`}
  );

  logger.debug("Category job enqueued", { imageId, jobId: job.id });
  return job;
}

export async function closeCategoryQueue() {
  if (categoryQueue) {
    await categoryQueue.close();
    categoryQueue = null;
  }
}
