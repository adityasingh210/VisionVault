import crypto from "crypto";
import { Jimp } from "jimp";

/**
 * @param {Buffer} buffer
 * @returns {string} hex digest
 */
export function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * @param {Buffer} buffer  Raw image bytes
 * @returns {Promise<string>} hex pHash
 */
export async function computeAverageHash(buffer) {
  const image = await Jimp.fromBuffer(buffer);
  image.resize({ w: 32, h: 32 });
  image.greyscale();

  const { data, width, height } = image.bitmap;
  const totalPixels = width * height;

  let sum = 0;
  for (let i = 0; i < totalPixels; i++) {
    sum += data[i * 4];
  }
  const mean = sum / totalPixels;

  let hashBits = 0n;
  for (let i = 0; i < totalPixels; i++) {
    hashBits = (hashBits << 1n) | (data[i * 4] >= mean ? 1n : 0n);
  }

  return hashBits.toString(16).padStart(256, "0");
}

/**
 * @param {string} hexA
 * @param {string} hexB
 * @returns {number}
 */
export function hammingDistance(hexA, hexB) {
  if (hexA.length !== hexB.length) {
    throw new Error("pHash strings must be the same length");
  }
  let distance = 0;
  for (let i = 0; i < hexA.length; i += 2) {
    const byteA = parseInt(hexA.slice(i, i + 2), 16);
    const byteB = parseInt(hexB.slice(i, i + 2), 16);
    let xor = byteA ^ byteB;
    while (xor) {
      xor &= xor - 1;
      distance++;
    }
  }
  return distance;
}
/**
 * @returns {string}
 */

export function generateTokenId() {
  return crypto.randomUUID();
}