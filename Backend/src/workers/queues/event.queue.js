
import { Queue } from "bullmq";
import { getRedis } from "../../config/redis.js";
import logger from "../../lib/logger.js";

let eventQueue = null;

export function getEventQueue() {
  if (!eventQueue) {
    eventQueue = new Queue("image-processing", {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 10_000,
        },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    });

    eventQueue.on("error", (err) => {
      logger.error("Event queue error", { error: err.message });
    });
  }

  return eventQueue;
}

export async function enqueueEventJob(userId, eventJobId) {
  const queue = getEventQueue();

  const job = await queue.add(
    "event",
    { userId, eventJobId },
    {
      jobId: `event:${userId}:${eventJobId}`,
    }
  );

  logger.debug("Event job enqueued", { userId, eventJobId, jobId: job.id });
  return job;
}

export async function closeEventQueue() {
  if (eventQueue) {
    await eventQueue.close();
    eventQueue = null;
  }
}
