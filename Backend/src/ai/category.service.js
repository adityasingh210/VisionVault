import {
  generateImageEmbedding,
  generateTextEmbedding,
  loadClipModels,
} from "./clip.service.js";
import logger from "../lib/logger.js";
export const CATEGORIES = [
  { slug: "people",      label: "a photo of people or a person" },
  { slug: "documents",   label: "a photo of a document, invoice, form, or certificate" },
  { slug: "food",        label: "a photo of food or a meal" },
  { slug: "travel",      label: "a photo of travel, tourism, or landscape" },
  { slug: "pets",        label: "a photo of a pet or domestic animal" },
  { slug: "nature",      label: "a photo of nature, plants, or wildlife" },
  { slug: "screenshots", label: "a screenshot of a phone, computer, or app screen" },
  { slug: "vehicles",    label: "a photo of a vehicle, car, bike, or transport" },
  { slug: "buildings",   label: "a photo of a building, architecture, or interior" },
  { slug: "other",       label: "a miscellaneous or uncategorized photo" },
];

let categoryEmbeddings = null;
export async function loadCategoryEmbeddings() {
  if (categoryEmbeddings) return;

  await loadClipModels();

  logger.info("Computing category text embeddings", {
    count: CATEGORIES.length,
  });

  const embeddings = await Promise.all(
    CATEGORIES.map((c) => generateTextEmbedding(c.label))
  );

  categoryEmbeddings = CATEGORIES.map((c, i) => ({
    slug: c.label,        
    displaySlug: c.slug,  
    embedding: embeddings[i],
  }));

  logger.info("Category embeddings ready");
}

/**
 *
 * @param {string} imageUrl
 * @returns {Promise<Array<{ slug: string, confidence: number }>>}

 */
export async function classifyImage(imageUrl) {
  if (!categoryEmbeddings) {
    await loadCategoryEmbeddings();
  }

  const imageEmbed = await generateImageEmbedding(imageUrl);
  const scores = categoryEmbeddings.map((cat) => {
    const score = cat.embedding.reduce((sum, v, i) => sum + v * imageEmbed[i], 0);
    return { slug: cat.displaySlug, confidence: score };
  });
  const maxScore = Math.max(...scores.map((s) => s.confidence));
  const exps = scores.map((s) => Math.exp(s.confidence - maxScore));
  const sumExps = exps.reduce((a, b) => a + b, 0);

  const probabilities = scores.map((s, i) => ({
    slug: s.slug,
    confidence: parseFloat((exps[i] / sumExps).toFixed(4)),
  }));
  return probabilities
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}
