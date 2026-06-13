import {AutoTokenizer,AutoProcessor,CLIPTextModelWithProjection,CLIPVisionModelWithProjection,RawImage,env as transformersEnv,} from "@xenova/transformers";
import logger from "../lib/logger.js";

transformersEnv.cacheDir = process.env.MODEL_CACHE_DIR ?? "./.model-cache";
transformersEnv.allowLocalModels = true;

const MODEL_ID = "Xenova/clip-vit-base-patch32";

let tokenizer = null;
let processor = null;

let textModel = null;
let visionModel = null;
let modelsLoading = null;

export async function loadClipModels() {
 if (tokenizer &&processor &&textModel &&visionModel
) {
  return;
}

  if (modelsLoading) {
    return modelsLoading;
  }

  modelsLoading = (async () => {
    logger.info("Loading CLIP models", { model: MODEL_ID });

    const start = Date.now();

  [tokenizer, processor, textModel, visionModel] =
  await Promise.all([
    AutoTokenizer.from_pretrained(MODEL_ID),
    AutoProcessor.from_pretrained(MODEL_ID),

    CLIPTextModelWithProjection.from_pretrained(
      MODEL_ID
    ),

    CLIPVisionModelWithProjection.from_pretrained(
      MODEL_ID
    ),
  ]);

    logger.info("CLIP models loaded", {
      durationMs: Date.now() - start,
    });

    modelsLoading = null;
  })();

  return modelsLoading;
}
/**
 * Generates a 512-dimensional L2-normalized embedding for an image.
 *
 * @param {string} imageUrl - Publicly accessible URL (Cloudinary CDN URL)
 * @returns {number[]} 512-element array, L2-normalized
 */

export async function generateImageEmbedding(imageUrl) {
  if (!visionModel || !processor) {
    await loadClipModels();
  }

  const image = await RawImage.read(imageUrl);

  const imageInputs = await processor(image);

  const { image_embeds } =
    await visionModel(imageInputs);

  return l2Normalize(
    Array.from(image_embeds.data)
  );
}

/**
 * Generates a 512-dimensional L2-normalized embedding for a text query.
 *
 * @param {string} text - Natural language query, e.g. "dog on beach"
 * @returns {number[]} 512-element array, L2-normalized
 */
export async function generateTextEmbedding(text) {
  if (!textModel || !tokenizer) {
    await loadClipModels();
  }

  const textInputs = tokenizer([text], {
    padding: true,
    truncation: true,
  });

  const { text_embeds } =
    await textModel(textInputs);

  return l2Normalize(
    Array.from(text_embeds.data)
  );
}

function l2Normalize(vector) {
  const magnitude = Math.sqrt(
    vector.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) {
    throw new Error("Cannot normalize a zero vector — image may be blank or corrupt");
  }

  return vector.map((val) => val / magnitude);
}