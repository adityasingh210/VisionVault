import { Queue } from "bullmq";
import { getRedis } from "../../config/redis.js";
import logger from "../../lib/logger.js";

let faceQueue = null;

export function getFaceQueue() {
  if (!faceQueue) {
    faceQueue = new Queue("image-processing", {
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

    faceQueue.on("error", (err) => {
      logger.error("Face queue error", { error: err.message });
    });
  }

  return faceQueue;
}

export async function enqueueFaceJob(imageId) {
  const queue = getFaceQueue();

  const job = await queue.add(
    "face",
    { imageId },
    { jobId: `face_${imageId}` }
  );

  logger.debug("Face job enqueued", { imageId, jobId: job.id });
  return job;
}

export async function closeFaceQueue() {
  if (faceQueue) {
    await faceQueue.close();
    faceQueue = null;
  }
}
