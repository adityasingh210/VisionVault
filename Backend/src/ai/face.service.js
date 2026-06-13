import path from "path";
import { fileURLToPath } from "url";
import "@tensorflow/tfjs-backend-cpu";
import * as faceapi from "face-api.js";
import logger from "../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.resolve(__dirname, "../../.face-models");
let modelsLoaded = false;
let modelsLoading = null;
export async function loadFaceModels() {
  if (modelsLoaded) return;
  if (modelsLoading) return modelsLoading;

  modelsLoading = (async () => {
    const start = Date.now();
    logger.info("Loading face-api models", { dir: MODELS_DIR });

    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_DIR),
      faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_DIR),
      faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_DIR),
    ]);

    modelsLoaded = true;
    modelsLoading = null;
    logger.info("Face-api models loaded", { durationMs: Date.now() - start });
  })();

  return modelsLoading;
}

/**
 *
 * @param {string} imageUrl - Publicly accessible URL
 * @returns {Promise<Array<{
 *   bbox: { x: number, y: number, w: number, h: number },
 *   embedding: number[]
 * }>>}
 */
export async function detectFaces(imageUrl) {
  if (!modelsLoaded) {
    await loadFaceModels();
  }


  const detections = await faceapi
    .detectAllFaces(imageUrl, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d) => ({
    bbox: {
      x: d.detection.box.x,
      y: d.detection.box.y,
      w: d.detection.box.width,
      h: d.detection.box.height,
    },
    // descriptor is Float32Array(128) — convert to plain number[]
    embedding: Array.from(d.descriptor),
  }));
}

/**
 * Computes cosine similarity between two 128-dim face embeddings.
 *
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} similarity in [-1, 1]; higher = more similar
 */
export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Similarity threshold: faces with similarity >= this are considered the same person
export const FACE_SIMILARITY_THRESHOLD = 0.82;
