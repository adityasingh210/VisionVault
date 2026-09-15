import { AutoTokenizer, AutoProcessor, CLIPTextModelWithProjection, CLIPVisionModelWithProjection, RawImage, env as transformersEnv } from "@xenova/transformers";
import logger from "../lib/logger.js";
import { Jimp } from "jimp";
transformersEnv.cacheDir = process.env.MODEL_CACHE_DIR ?? "./.model-cache";
transformersEnv.allowLocalModels = true;

const MODEL_ID = "Xenova/clip-vit-base-patch32";

let tokenizer = null;
let processor = null;
let textModel = null;
let visionModel = null;
let modelsLoading = null;

export async function loadClipModels() {
  if (tokenizer && processor && textModel && visionModel) return;
  if (modelsLoading) return modelsLoading;

  modelsLoading = (async () => {
    logger.info("Loading CLIP models", { model: MODEL_ID });
    const start = Date.now();
    [tokenizer, processor, textModel, visionModel] = await Promise.all([
      AutoTokenizer.from_pretrained(MODEL_ID),
      AutoProcessor.from_pretrained(MODEL_ID),
      CLIPTextModelWithProjection.from_pretrained(MODEL_ID),
      CLIPVisionModelWithProjection.from_pretrained(MODEL_ID),
    ]);
    logger.info("CLIP models loaded", { durationMs: Date.now() - start });
    modelsLoading = null;
  })();
  return modelsLoading;
}

function toJpegUrl(url) {
  return url.replace("/upload/", "/upload/f_jpg,q_auto/");
}

// Without a timeout, a slow/hanging Cloudinary response can hold the fetch
// open indefinitely. The BullMQ worker only has `lockDuration` (5 min, see
// worker.js) before the job is considered stalled and retried/duplicated —
// better to fail fast here with a clear error than let that happen silently.
const IMAGE_FETCH_TIMEOUT_MS = 20_000;

export async function generateImageEmbedding(imageUrl) {
  if (!visionModel || !processor) {
    await loadClipModels();
  }

  logger.debug("Fetching image for CLIP embedding");
  try {
    const response = await fetch(toJpegUrl(imageUrl), {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.debug("Decoding image with Jimp");
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

    logger.debug("Constructing RawImage wrapper");
    const rawImage = new RawImage(rgbData, width, height, 3);

    const imageInputs = await processor(rawImage);
    const { image_embeds } = await visionModel(imageInputs);

    logger.debug("CLIP embedding generated successfully");
    return l2Normalize(Array.from(image_embeds.data));
  } catch (error) {
    logger.error("Critical error in CLIP embedding pipeline", { error: error.message });
    // Re-throw instead of returning a fake zero-vector: a zero-vector looks like a
    // "valid" embedding to Qdrant/search code, silently poisoning search results.
    // Throwing lets the caller (embedding.processor.js) mark the job FAILED and retry it.
    throw error;
  }
}

export async function generateTextEmbedding(text) {
  if (!textModel || !tokenizer) await loadClipModels();
  const textInputs = tokenizer([text], { padding: true, truncation: true });
  const { text_embeds } = await textModel(textInputs);
  return l2Normalize(Array.from(text_embeds.data));
}

function l2Normalize(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map((val) => val / magnitude);
}