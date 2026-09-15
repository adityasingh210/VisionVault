import crypto from "crypto";

/**
 * @returns {string}
 */
export function generateTokenId() {
  return crypto.randomUUID();
}