import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";
import logger from "../lib/logger.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Pings the Cloudinary API to confirm credentials are valid.
 * Called during server startup before accepting traffic.
 */
export async function verifyCloudinaryConnection() {
  const result = await cloudinary.api.ping();

  if (result.status !== "ok") {
    throw new Error(`Cloudinary ping returned unexpected status: ${result.status}`);
  }

  logger.info("Cloudinary connected", { cloud: env.CLOUDINARY_CLOUD_NAME });
}

export default cloudinary;
