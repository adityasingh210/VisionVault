
import Redis from "ioredis";
import { env } from "./src/config/env.js";

async function flush() {
  if (env.NODE_ENV === "production") {
    console.error(
      "Refusing to run flush.js with NODE_ENV=production. " +
        "This wipes the entire Redis instance (sessions, rate limits, everything)."
    );
    process.exit(1);
  }

  if (process.argv[2] !== "--force") {
    console.error(
      'This will FLUSHALL the Redis instance at REDIS_URL. Re-run as "node flush.js --force" to confirm.'
    );
    process.exit(1);
  }

  const client = new Redis(env.REDIS_URL);
  try {
    await client.flushall();
    console.log("Redis flushed successfully.");
  } finally {
    await client.quit();
  }
}

flush().catch((err) => {
  console.error(err);
  process.exit(1);
});
