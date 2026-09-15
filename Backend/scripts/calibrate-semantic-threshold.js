// Calibrates SEMANTIC_ABS_FLOOR / SEMANTIC_RELATIVE_Z in src/ai/search.service.js
// against real data instead of a hand-picked constant.
//
// WHY: CLIP has a "modality gap" — unrelated text/image pairs commonly score
// ~0.15-0.25 cosine similarity from geometry alone, not real relevance. The
// only way to know where YOUR corpus's noise band actually ends and real
// relevance begins is to run known-relevant and known-irrelevant pairs
// through the real embedding pipeline and look at the score distributions.
//
// USAGE:
//   node scripts/calibrate-semantic-threshold.js [path/to/pairs.json]
//
// Defaults to scripts/data/semantic-pairs.sample.json (a tiny illustrative
// example — replace it with real pairs from your own corpus for a threshold
// that actually means something; a handful of examples won't give a
// statistically sound cutoff).
//
// INPUT FORMAT (JSON array):
//   [
//     { "query": "dog", "imageUrl": "https://.../dog1.jpg", "relevant": true },
//     { "query": "dog", "imageUrl": "https://.../cat1.jpg", "relevant": false },
//     ...
//   ]
// Build this from your own library: for a sample of images, write the query
// a user would realistically type to find that photo (relevant: true), and
// pair the same query with photos that clearly do NOT match (relevant:
// false). Aim for at least ~30-50 pairs of each to get distributions that
// mean something; more is better.
//
// OUTPUT: score distribution stats for each group, a precision/recall/F1
// sweep across candidate thresholds, and a recommended SEMANTIC_ABS_FLOOR.

import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import {
  generateTextEmbedding,
  generateImageEmbedding,
} from "../src/ai/clip.service.js";
import logger from "../src/lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PAIRS_PATH = path.join(__dirname, "data", "semantic-pairs.sample.json");

function cosineSim(a, b) {
  // Both generateTextEmbedding/generateImageEmbedding already L2-normalize,
  // so dot product IS cosine similarity here.
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function stats(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return {
    n: values.length,
    mean: mean.toFixed(4),
    std: Math.sqrt(variance).toFixed(4),
    min: sorted[0].toFixed(4),
    p25: pct(0.25).toFixed(4),
    median: pct(0.5).toFixed(4),
    p75: pct(0.75).toFixed(4),
    max: sorted[sorted.length - 1].toFixed(4),
  };
}

function evaluateThreshold(pairs, threshold) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const p of pairs) {
    const predictedRelevant = p.score >= threshold;
    if (predictedRelevant && p.relevant) tp++;
    else if (predictedRelevant && !p.relevant) fp++;
    else if (!predictedRelevant && !p.relevant) tn++;
    else fn++;
  }
  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { threshold, tp, fp, tn, fn, precision, recall, f1 };
}

async function main() {
  const pairsPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_PAIRS_PATH;

  const isDefault = pairsPath === DEFAULT_PAIRS_PATH;
  logger.info("Calibrate: loading pairs", { pairsPath, isDefaultSample: isDefault });
  if (isDefault) {
    logger.warn(
      "Calibrate: using the bundled sample file — this is illustrative only. " +
      "Pass a real pairs file built from your own corpus for a meaningful threshold: " +
      "node scripts/calibrate-semantic-threshold.js path/to/real-pairs.json"
    );
  }

  const raw = await readFile(pairsPath, "utf-8");
  const pairs = JSON.parse(raw);
  if (!Array.isArray(pairs) || !pairs.length) {
    throw new Error("Pairs file must be a non-empty JSON array");
  }

  // Cache embeddings so repeated queries/images in the pairs file only cost
  // one CLIP inference each.
  const textCache = new Map();
  const imageCache = new Map();
  const getTextEmbed = async (q) => {
    if (!textCache.has(q)) textCache.set(q, await generateTextEmbedding(q));
    return textCache.get(q);
  };
  const getImageEmbed = async (url) => {
    if (!imageCache.has(url)) imageCache.set(url, await generateImageEmbedding(url));
    return imageCache.get(url);
  };

  const scored = [];
  let i = 0;
  for (const pair of pairs) {
    i += 1;
    try {
      const [textEmbed, imageEmbed] = await Promise.all([
        getTextEmbed(pair.query),
        getImageEmbed(pair.imageUrl),
      ]);
      const score = cosineSim(textEmbed, imageEmbed);
      scored.push({ ...pair, score });
    } catch (err) {
      logger.warn("Calibrate: skipping pair (embedding failed)", {
        query: pair.query,
        imageUrl: pair.imageUrl,
        error: err.message,
      });
    }
    if (i % 20 === 0) logger.info("Calibrate: progress", { done: i, total: pairs.length });
  }

  const relevant = scored.filter((p) => p.relevant).map((p) => p.score);
  const irrelevant = scored.filter((p) => !p.relevant).map((p) => p.score);

  console.log("\n=== Score distributions ===");
  console.log("Relevant pairs:  ", stats(relevant));
  console.log("Irrelevant pairs:", stats(irrelevant));

  if (!relevant.length || !irrelevant.length) {
    console.warn(
      "\nNeed at least one relevant AND one irrelevant pair to sweep thresholds — stopping here."
    );
    return;
  }

  console.log("\n=== Threshold sweep (floor classifier: score >= threshold => relevant) ===");
  console.log("threshold  precision  recall  f1      tp  fp  tn  fn");
  let best = null;
  for (let t = 0.05; t <= 0.5; t += 0.01) {
    const result = evaluateThreshold(scored, t);
    if (!best || result.f1 > best.f1) best = result;
    console.log(
      `${t.toFixed(2)}       ${result.precision.toFixed(3)}      ${result.recall.toFixed(3)}   ${result.f1.toFixed(3)}   ${result.tp}   ${result.fp}   ${result.tn}   ${result.fn}`
    );
  }

  console.log(`\n=== Recommendation ===`);
  console.log(
    `Best F1 threshold from this batch: ${best.threshold.toFixed(2)} ` +
    `(precision=${best.precision.toFixed(3)}, recall=${best.recall.toFixed(3)})`
  );
  console.log(
    "Consider setting SEMANTIC_ABS_FLOOR a little BELOW this value (e.g. -0.02) " +
    "so the relative/statistical cutoff (SEMANTIC_RELATIVE_Z) does the fine-grained " +
    "filtering per-query, and the floor only exists to reject clear noise outright."
  );
  console.log(
    "If precision stays low even at high thresholds, the irrelevant-pair scores are " +
    "overlapping the relevant-pair scores too much for a single global floor to fully " +
    "solve — that's a sign per-query relative thresholding (already implemented) is " +
    "doing more of the real work than the floor, which is expected with CLIP."
  );
}

main().catch((err) => {
  logger.error("Calibrate: fatal error", { error: err.message, stack: err.stack });
  process.exit(1);
});
