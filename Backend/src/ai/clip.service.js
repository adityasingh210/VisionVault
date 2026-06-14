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

export async function generateImageEmbedding(imageUrl) {
  if (!visionModel || !processor) {
    await loadClipModels();
  }

  console.log("STEP 1 - Fetching Image for Embedding...");
  try {
    const response = await fetch(toJpegUrl(imageUrl));
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("STEP 2 - Decoding with Jimp (pure JS)...");
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

    console.log("STEP 3 - Constructing RawImage wrapper object...");
    const rawImage = new RawImage(rgbData, width, height, 3);

    const imageInputs = await processor(rawImage);
    const { image_embeds } = await visionModel(imageInputs);

    console.log("STEP 4 - CLIP Embedding success!");
    return l2Normalize(Array.from(image_embeds.data));
  } catch (error) {
    console.error("Critical error in CLIP embedding pipeline:", error);
    return new Array(512).fill(0);
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