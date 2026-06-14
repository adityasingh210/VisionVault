import { Queue } from "bullmq";
import { getRedis } from "../../config/redis.js";
import logger from "../../lib/logger.js";
let imageQueue = null;

export function getImageQueue() {
  if (!imageQueue) {
    imageQueue = new Queue("image-processing", {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5_000, // 5s, 10s, 20s
        },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    });

    imageQueue.on("error", (err) => {
      logger.error("Image queue error", { error: err.message });
    });
  }

  return imageQueue;
}

export async function enqueueHashJob(imageId) {
  const queue = getImageQueue();

  const job = await queue.add(
    "hash",
    { imageId },
    {
      jobId: `hash_${imageId}`,
    }
  );

  logger.debug("Hash job enqueued", { imageId, jobId: job.id });
  return job;
}

export async function closeImageQueue() {
  if (imageQueue) {
    await imageQueue.close();
    imageQueue = null;
  }
}
