import path from "path";
import { fileURLToPath } from "url";
import "@tensorflow/tfjs-backend-cpu";
import * as tf from "@tensorflow/tfjs";
import * as faceapi from "face-api.js";
import logger from "../lib/logger.js";
import { Jimp } from "jimp";


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

async function fetchImageAsTensor(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const image = await Jimp.read(buffer);
  const { width, height } = image.bitmap;

  const numPixels = width * height;
  const rgbData = new Uint8Array(numPixels * 3);

  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    rgbData[i * 3]     = image.bitmap.data[idx];
    rgbData[i * 3 + 1] = image.bitmap.data[idx + 1];
    rgbData[i * 3 + 2] = image.bitmap.data[idx + 2];
  }

  return tf.tensor3d(rgbData, [height, width, 3], "int32");
}

export async function detectFaces(imageUrl) {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  const tensor = await fetchImageAsTensor(imageUrl);

  try {
    const detections = await faceapi
      .detectAllFaces(tensor, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();

    return detections.map((d) => ({
      bbox: {
        x: d.detection.box.x,
        y: d.detection.box.y,
        w: d.detection.box.width,
        h: d.detection.box.height,
      },
      embedding: Array.from(d.descriptor),
    }));
  } finally {
    tensor.dispose();
  }
}

export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const FACE_SIMILARITY_THRESHOLD = 0.82;