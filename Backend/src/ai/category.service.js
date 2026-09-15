import {
  generateImageEmbedding,
  generateTextEmbedding,
  loadClipModels,
} from "./clip.service.js";
import logger from "../lib/logger.js";

export const CATEGORIES = [
  { slug: "people",      label: "a photo of people or a person", aliases: ["people", "person", "persons"] },
  { slug: "selfie",       label: "a selfie or close-up portrait of a person's face", aliases: ["selfie", "selfies"] },
  { slug: "documents",   label: "a photo of a document, invoice, form, or certificate", aliases: ["document", "documents", "invoice", "invoices", "receipt", "receipts"] },
  { slug: "food",        label: "a photo of food or a meal", aliases: ["food", "meal", "meals"] },
  { slug: "travel",      label: "a photo of travel, tourism, or landscape", aliases: ["travel", "trip", "trips", "vacation", "vacations"] },
  { slug: "dogs",         label: "a photo of a dog", aliases: ["dog", "dogs", "puppy", "puppies"] },
  { slug: "cats",         label: "a photo of a cat", aliases: ["cat", "cats", "kitten", "kittens"] },
  { slug: "birds",        label: "a photo of a bird", aliases: ["bird", "birds"] },
  { slug: "pets",        label: "a photo of a pet or domestic animal that is not a dog or cat", aliases: ["pet", "pets"] },
  { slug: "nature",      label: "a photo of nature, plants, flowers, or wildlife", aliases: ["nature", "flower", "flowers", "plant", "plants"] },
  { slug: "screenshots", label: "a screenshot of a phone, computer, or app screen", aliases: ["screenshot", "screenshots"] },
  { slug: "vehicles",    label: "a photo of a vehicle, car, bike, or transport", aliases: ["vehicle", "vehicles", "car", "cars", "bike", "bikes"] },
  { slug: "buildings",   label: "a photo of a building, architecture, or interior", aliases: ["building", "buildings", "architecture"] },
  { slug: "other",       label: "a miscellaneous or uncategorized photo", aliases: [] },
];

const ALIAS_TO_SLUG = new Map();
for (const c of CATEGORIES) {
  for (const alias of c.aliases ?? []) ALIAS_TO_SLUG.set(alias, c.slug);
}

let categoryEmbeddings = null;
export async function loadCategoryEmbeddings() {
  if (categoryEmbeddings) return;

  await loadClipModels();

  logger.info("Computing category text embeddings", {
    count: CATEGORIES.length,
  });

  const embeddings = [];
  for (const c of CATEGORIES) {
    embeddings.push(await generateTextEmbedding(c.label));
  }

categoryEmbeddings = CATEGORIES.map((c, i) => ({
    slug: c.slug,
    displaySlug: c.slug,
    embedding: embeddings[i],
}));

  logger.info("Category embeddings ready");
}

/**

 * @param {number[]} embed
 * @param {number} [temperature=1]
 * @returns {Array<{ slug: string, confidence: number }>}
 */
export function scoreAgainstCategories(embed, temperature = 1) {
  const scores = categoryEmbeddings.map((cat) => {
    const score = cat.embedding.reduce((sum, v, i) => sum + v * embed[i], 0);
    return { slug: cat.displaySlug, confidence: score };
  });
  const maxScore = Math.max(...scores.map((s) => s.confidence));
  const exps = scores.map((s) => Math.exp((s.confidence - maxScore) / temperature));
  const sumExps = exps.reduce((a, b) => a + b, 0);

  return scores.map((s, i) => ({
    slug: s.slug,
    confidence: parseFloat((exps[i] / sumExps).toFixed(4)),
  }));
}

/**
 *
 * @param {string} imageUrl
 * @returns {Promise<Array<{ slug: string, confidence: number }>>}

 */

const IMAGE_MIN_CONFIDENCE = 0.20;

export async function classifyImage(imageUrl) {
  if (!categoryEmbeddings) {
    await loadCategoryEmbeddings();
  }

  const imageEmbed = await generateImageEmbedding(imageUrl);
  const probabilities = scoreAgainstCategories(imageEmbed);
  const filtered = probabilities
  .filter(c => c.confidence > IMAGE_MIN_CONFIDENCE && c.slug !== 'other')
  .sort((a, b) => b.confidence - a.confidence)
  .slice(0, 2);

  if (filtered.length === 0) {
  const other = probabilities.find(c => c.slug === 'other');
  return [{ slug: 'other', confidence: other?.confidence ?? 1.0 }];
}

return filtered;
}
const TEXT_TEMPERATURE = 0.5;
const TEXT_MIN_CONFIDENCE = 0.35;

/**

 * @param {string} text
 * @param {number} [minConfidence=TEXT_MIN_CONFIDENCE]
 * @returns {Promise<Array<{ slug: string, confidence: number }>>}
 */
export async function classifyText(text, minConfidence = TEXT_MIN_CONFIDENCE) {
  const normalized = text.trim().toLowerCase();
  const aliasSlug = ALIAS_TO_SLUG.get(normalized);
  if (aliasSlug) {
    return [{ slug: aliasSlug, confidence: 1.0 }];
  }

  if (!categoryEmbeddings) {
    await loadCategoryEmbeddings();
  }
  const textEmbed = await generateTextEmbedding(text);
  const probabilities = scoreAgainstCategories(textEmbed, TEXT_TEMPERATURE);
  return probabilities
    .filter((c) => c.confidence >= minConfidence && c.slug !== "other")
    .sort((a, b) => b.confidence - a.confidence);
}