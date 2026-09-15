// Calibrates classifyText()'s TEXT_TEMPERATURE / TEXT_MIN_CONFIDENCE (and can
// sanity-check classifyImage()'s IMAGE_MIN_CONFIDENCE) in
// src/ai/category.service.js against real labeled data.
//
// USAGE:
//   node scripts/calibrate-category-thresholds.js [path/to/text-labels.json]
//
// Defaults to scripts/data/category-text-labels.sample.json (illustrative
// only — replace with real (query, expectedSlug) pairs from your own users'
// search terms / category names for a meaningful result).
//
// INPUT FORMAT (JSON array):
//   [
//     { "query": "dogs", "expectedSlug": "dogs" },
//     { "query": "puppy playing fetch", "expectedSlug": "dogs" },
//     { "query": "my passport", "expectedSlug": "documents" },
//     ...
//   ]
//
// WHAT IT DOES: for a grid of temperature values, embeds every query once
// and scores it against the category space at every candidate minConfidence,
// reporting top-1 accuracy (did the highest-confidence category match
// expectedSlug?) and, at each minConfidence, how often the expected category
// (a) was returned at all and (b) was returned as the top hit. Use this to
// pick a temperature that makes the confidence gap between the right
// category and the rest as large as possible, then pick the lowest
// minConfidence that doesn't let obviously-wrong categories leak in.

import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import {
  loadCategoryEmbeddings,
  scoreAgainstCategories,
  CATEGORIES,
} from "../src/ai/category.service.js";
import { generateTextEmbedding } from "../src/ai/clip.service.js";
import logger from "../src/lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LABELS_PATH = path.join(__dirname, "data", "category-text-labels.sample.json");
const CANDIDATE_TEMPERATURES = [0.3, 0.4, 0.5, 0.6, 0.75, 1.0];
const CANDIDATE_MIN_CONFIDENCES = [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5];

async function main() {
  const labelsPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_LABELS_PATH;
  const isDefault = labelsPath === DEFAULT_LABELS_PATH;

  logger.info("Calibrate: loading labels", { labelsPath, isDefaultSample: isDefault });
  if (isDefault) {
    logger.warn(
      "Calibrate: using the bundled sample file — this is illustrative only. " +
      "Pass real (query, expectedSlug) pairs for a meaningful result: " +
      "node scripts/calibrate-category-thresholds.js path/to/real-labels.json"
    );
  }

  const raw = await readFile(labelsPath, "utf-8");
  const labels = JSON.parse(raw);
  if (!Array.isArray(labels) || !labels.length) {
    throw new Error("Labels file must be a non-empty JSON array");
  }

  const validSlugs = new Set(CATEGORIES.map((c) => c.slug));
  for (const l of labels) {
    if (!validSlugs.has(l.expectedSlug)) {
      throw new Error(`Unknown expectedSlug "${l.expectedSlug}" — check src/ai/category.service.js CATEGORIES`);
    }
  }

  await loadCategoryEmbeddings();

  logger.info("Calibrate: embedding queries", { count: labels.length });
  const embeddings = [];
  for (const l of labels) {
    embeddings.push(await generateTextEmbedding(l.query));
  }

  console.log("\n=== Temperature sweep (top-1 accuracy = expected slug ranked #1) ===");
  console.log("temperature  top1_accuracy  mean_confidence_of_expected");
  let bestTemp = { temperature: 1, top1Accuracy: -1 };
  for (const temperature of CANDIDATE_TEMPERATURES) {
    let correct = 0;
    let confSum = 0;
    for (let i = 0; i < labels.length; i++) {
      const probs = scoreAgainstCategories(embeddings[i], temperature);
      const ranked = [...probs].sort((a, b) => b.confidence - a.confidence);
      if (ranked[0].slug === labels[i].expectedSlug) correct++;
      const expectedProb = probs.find((p) => p.slug === labels[i].expectedSlug);
      confSum += expectedProb?.confidence ?? 0;
    }
    const top1Accuracy = correct / labels.length;
    const meanConf = confSum / labels.length;
    console.log(`${temperature.toFixed(2)}         ${top1Accuracy.toFixed(3)}           ${meanConf.toFixed(3)}`);
    if (top1Accuracy > bestTemp.top1Accuracy) {
      bestTemp = { temperature, top1Accuracy };
    }
  }

  console.log(`\nBest temperature by top-1 accuracy: ${bestTemp.temperature} (${bestTemp.top1Accuracy.toFixed(3)})`);
  console.log("Using that temperature for the minConfidence sweep below:\n");

  console.log("=== minConfidence sweep at best temperature ===");
  console.log("minConfidence  recall(expected>=threshold)  precision(expected is top hit among survivors)");
  for (const minConfidence of CANDIDATE_MIN_CONFIDENCES) {
    let expectedSurvives = 0;
    let expectedSurvivesAndIsTop = 0;
    let anySurvives = 0;
    for (let i = 0; i < labels.length; i++) {
      const probs = scoreAgainstCategories(embeddings[i], bestTemp.temperature);
      const survivors = probs
        .filter((p) => p.confidence >= minConfidence && p.slug !== "other")
        .sort((a, b) => b.confidence - a.confidence);
      if (survivors.length) anySurvives++;
      const expectedSurvived = survivors.some((p) => p.slug === labels[i].expectedSlug);
      if (expectedSurvived) {
        expectedSurvives++;
        if (survivors[0].slug === labels[i].expectedSlug) expectedSurvivesAndIsTop++;
      }
    }
    const recall = expectedSurvives / labels.length;
    const precision = anySurvives === 0 ? 0 : expectedSurvivesAndIsTop / anySurvives;
    console.log(`${minConfidence.toFixed(2)}           ${recall.toFixed(3)}                       ${precision.toFixed(3)}`);
  }

  console.log(
    "\nPick the lowest minConfidence where recall is acceptably high without precision " +
    "dropping much — that's your TEXT_MIN_CONFIDENCE. Update TEXT_TEMPERATURE and " +
    "TEXT_MIN_CONFIDENCE in src/ai/category.service.js with the chosen values."
  );
}

main().catch((err) => {
  logger.error("Calibrate: fatal error", { error: err.message, stack: err.stack });
  process.exit(1);
});
