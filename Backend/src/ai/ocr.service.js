// src/ai/ocr.service.js

import Tesseract from "tesseract.js";
import logger from "../lib/logger.js";

/**
 * Extracts text from an image URL using Tesseract.js.
 *
 * @param {string} imageUrl - Publicly accessible image URL (Cloudinary CDN)
 * @returns {Promise<{ rawText: string, language: string, confidence: number }>}
 */
export async function extractTextFromImage(imageUrl) {
  logger.debug("Starting OCR", { imageUrl });

  const result = await Tesseract.recognize(imageUrl, "eng+hin", {
    logger: () => {}, // suppress per-progress logs
  });

  const rawText = result.data.text?.trim() ?? "";
  const confidence = result.data.confidence ?? 0; // 0–100
  const language = detectPrimaryLanguage(result.data.blocks ?? []);

  logger.debug("OCR complete", {
    chars: rawText.length,
    confidence,
    language,
  });

  return {
    rawText,
    language,
    confidence,
  };
}

/**
 * Picks the most common language from Tesseract block data.
 * Falls back to "eng" if no blocks found.
 *
 * @param {Array} blocks - Tesseract block array
 * @returns {string}
 */
function detectPrimaryLanguage(blocks) {
  if (!blocks.length) return "eng";

  const counts = {};
  for (const block of blocks) {
    const lang = block.language ?? "eng";
    counts[lang] = (counts[lang] ?? 0) + 1;
  }

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
