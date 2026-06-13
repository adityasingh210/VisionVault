import { Queue } from "bullmq";
import { getRedis } from "../../config/redis.js";
import logger from "../../lib/logger.js";
let embeddingQueue = null;

export function getEmbeddingQueue() {
  if (!embeddingQueue) {
    embeddingQueue = new Queue("image-processing", {
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

    embeddingQueue.on("error", (err) => {
      logger.error("Embedding queue error", { error: err.message });
    });
  }

  return embeddingQueue;
}
export async function enqueueEmbeddingJob(imageId) {
  const queue = getEmbeddingQueue();

  const job = await queue.add(
    "embedding",
    { imageId },
    {
      jobId: `embedding:${imageId}`,
    }
  );

  logger.debug("Embedding job enqueued", { imageId, jobId: job.id });
  return job;
}

export async function closeEmbeddingQueue() {
  if (embeddingQueue) {
    await embeddingQueue.close();
    embeddingQueue = null;
  }
}