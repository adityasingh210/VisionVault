import crypto from "crypto";
import sharp from "sharp";

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
  const { data } = await sharp(buffer)
    .resize(32, 32, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  const mean = pixels.reduce((sum, v) => sum + v, 0) / pixels.length;
  const bits = new Uint8Array(128);
  for (let i = 0; i < 1024; i++) {
    if (pixels[i] >= mean) {
      bits[Math.floor(i / 8)] |= 1 << (7 - (i % 8));
    }
  }

  return Buffer.from(bits).toString("hex");
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
