import { generateTextEmbedding } from "./clip.service.js";
import qdrantClient, { COLLECTIONS } from "../config/qdrant.js";
import prisma from "../config/database.js";
import logger from "../lib/logger.js";
const WEIGHTS = {
  semantic:  0.40,
  ocr:       0.30,
  category:  0.15,
  event:     0.10,
  face:      0.05,
};
const SIGNAL_LIMIT = 100;
const CATEGORY_KEYWORDS = {
  documents:   ["invoice", "receipt", "document", "certificate", "form", "aadhaar", "pan", "id card", "bill", "paper"],
  screenshots: ["screenshot", "screen", "otp", "notification", "whatsapp", "chat", "message"],
  food:        ["food", "meal", "restaurant", "dinner", "lunch", "breakfast", "eat", "dish"],
  travel:      ["travel", "trip", "vacation", "holiday", "tour", "goa", "jaipur", "beach", "mountain", "airport"],
  people:      ["people", "person", "family", "friend", "wedding", "birthday", "party", "group"],
  nature:      ["nature", "forest", "park", "flower", "tree", "garden", "sunset", "sunrise"],
  vehicles:    ["car", "bike", "road", "vehicle", "drive", "motorcycle"],
  buildings:   ["building", "office", "home", "house", "mall", "hotel", "architecture"],
  pets:        ["dog", "cat", "pet", "animal"],
};
const MONTH_MAP = {
  january: 1, february: 2, march: 3, april: 4,
  may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7,
  aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * @param {string} query
 * @returns {{
 *   rawQuery: string,
 *   semanticQuery: string,
 *   ocrTerms: string[],
 *   categorySlug: string|null,
 *   eventKeywords: string[],
 *   faceLabel: string|null,
 *   yearFilter: number|null,
 *   monthFilter: number|null,
 * }}
 */
export function parseSearchIntent(query) {
  const lower = query.toLowerCase().trim();
  const words = lower.split(/\s+/);
  const yearMatch = lower.match(/\b(20\d{2})\b/);
  const yearFilter = yearMatch ? parseInt(yearMatch[1]) : null;
  let monthFilter = null;
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    if (lower.includes(name)) {
      monthFilter = num;
      break;
    }
  }
  let categorySlug = null;
  let maxCategoryMatches = 0;
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter((kw) => lower.includes(kw)).length;
   if (matches >= 2 && matches > maxCategoryMatches) {
      maxCategoryMatches = matches;
      categorySlug = slug;
    }
  }

  const STOP_WORDS = new Set([
    "show", "find", "search", "get", "from", "with", "the", "and", "or",
    "photos", "photo", "images", "image", "pics", "picture", "pictures",
    "my", "me", "all", "some", "any", "in", "of", "for", "at", "to",
    "this", "that", "have", "has", "had", "was", "are", "were",
  ]);
  const ocrTerms = words.filter(
    (w) => w.length > 3 && !STOP_WORDS.has(w) && !/^\d{4}$/.test(w)
  );
  const EVENT_TRIGGERS = ["trip", "vacation", "party", "wedding", "gathering",
    "birthday", "farewell", "event", "tour", "outing", "celebration"];
  const eventKeywords = [];
  for (const trigger of EVENT_TRIGGERS) {
    if (lower.includes(trigger)) {
      const idx = words.indexOf(trigger);
      const contextWords = idx > 0
        ? [words[idx - 1], trigger].join(" ")
        : trigger;
      eventKeywords.push(contextWords);
      eventKeywords.push(trigger);
    }
  }
  const capitalWords = query.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  eventKeywords.push(...capitalWords.map((w) => w.toLowerCase()));

  const withMatch = query.match(/\bwith\s+([A-Z][a-zA-Z]+)\b/);
  const faceLabel = withMatch ? withMatch[1].toLowerCase() : null;
  const semanticQuery = words
    .filter((w) => !STOP_WORDS.has(w) && !/^\d{4}$/.test(w))
    .join(" ") || query;

  return {
    rawQuery: query,
    semanticQuery,
    ocrTerms,
    categorySlug,
    eventKeywords: [...new Set(eventKeywords)],
    faceLabel,
    yearFilter,
    monthFilter,
  };
}


async function runSemanticSearch(intent, userId) {
  const scores = new Map();
  try {
    const embedding = await generateTextEmbedding(intent.semanticQuery);

    const filter = {
      must: [{ key: "user_id", match: { value: userId } }],
    };
    if (intent.yearFilter) {
      filter.must.push({
        key: "taken_at",
        range: {
          gte: `${intent.yearFilter}-01-01T00:00:00Z`,
          lte: `${intent.yearFilter}-12-31T23:59:59Z`,
        },
      });
    }

    const results = await qdrantClient.search(COLLECTIONS.IMAGE_EMBEDDINGS, {
      vector: embedding,
      limit: SIGNAL_LIMIT,
      filter,
      with_payload:true,
    });
    console.log("Qdrant results count:", results.length);
   console.log("First result:", results[0]);
    for (const r of results) {
      scores.set(String(r.payload.image_id), r.score);
    }
  } catch (err) {
    logger.warn("Semantic search failed", { error: err.message });
  }
  return scores;
}

async function runOcrSearch(intent, userId) {
  const scores = new Map();
  if (!intent.ocrTerms.length) return scores;

  try {
    const results = await prisma.ocrRecord.findMany({
      where: {
        image: { userId, deletedAt: null },
        rawText: {
          contains: intent.ocrTerms[0],
          mode: "insensitive",
        },
      },
      select: { imageId: true },
      take: SIGNAL_LIMIT,
    });

    for (const r of results) {
      scores.set(r.imageId, 0.8);
    }
  } catch (err) {
    logger.warn("OCR search failed", { error: err.message });
  }
  return scores;
}
async function runCategorySearch(intent, userId) {
  const scores = new Map();
  if (!intent.categorySlug) return scores;

  try {
    const category = await prisma.category.findUnique({
      where: { slug: intent.categorySlug },
      select: { id: true },
    });
    if (!category) return scores;

    const imageCategories = await prisma.imageCategory.findMany({
      where: {
        categoryId: category.id,
        image: { userId, deletedAt: null },
        confidence: { gte: 0.1 },
      },
      select: { imageId: true, confidence: true },
      orderBy: { confidence: "desc" },
      take: SIGNAL_LIMIT,
    });

    for (const ic of imageCategories) {
      scores.set(ic.imageId, parseFloat(ic.confidence));
    }
  } catch (err) {
    logger.warn("Category search failed", { error: err.message });
  }
  return scores;
}
async function runEventSearch(intent, userId) {
  const scores = new Map();
  if (!intent.eventKeywords.length) return scores;

  try {
    const eventConditions = intent.eventKeywords.map((kw) => ({
      title: { contains: kw, mode: "insensitive" },
    }));

    const events = await prisma.event.findMany({
      where: { userId, OR: eventConditions },
      select: { id: true, title: true },
      take: 10,
    });

    if (!events.length) return scores;

    const eventIds = events.map((e) => e.id);

    const eventImages = await prisma.eventImage.findMany({
      where: {
        eventId: { in: eventIds },
        image: { deletedAt: null },
      },
      select: { imageId: true },
      take: SIGNAL_LIMIT,
    });

    for (const ei of eventImages) {
      scores.set(ei.imageId, 1.0);
    }
  } catch (err) {
    logger.warn("Event search failed", { error: err.message });
  }
  return scores;
}

async function runFaceSearch(intent, userId) {
  const scores = new Map();
  if (!intent.faceLabel) return scores;

  try {
    const clusters = await prisma.faceCluster.findMany({
      where: {
        userId,
        label: { contains: intent.faceLabel, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (!clusters.length) return scores;

    const clusterIds = clusters.map((c) => c.id);

    const faces = await prisma.face.findMany({
      where: {
        clusterId: { in: clusterIds },
        image: { userId, deletedAt: null },
      },
      select: { imageId: true },
      take: SIGNAL_LIMIT,
    });

    for (const f of faces) {
      scores.set(f.imageId, 1.0);
    }
  } catch (err) {
    logger.warn("Face search failed", { error: err.message });
  }
  return scores;
}

/**
 * @param {object} signalScores - { semantic, ocr, category, event, face }
 * @param {object} intent
 * @returns {Array<{ imageId: string, score: number, signals: string[] }>}
 */
function mergeScores(signalScores, intent) {
  const merged = new Map();

  const add = (signal, weight, scoreMap) => {
    for (const [imageId, score] of scoreMap) {
      const current = merged.get(imageId) ?? { score: 0, signals: [] };
      current.score += score * weight;
      current.signals.push(signal);
      merged.set(imageId, current);
    }
  };

  add("semantic",  WEIGHTS.semantic,  signalScores.semantic);
  add("ocr",       WEIGHTS.ocr,       signalScores.ocr);
  add("category",  WEIGHTS.category,  signalScores.category);
  add("event",     WEIGHTS.event,     signalScores.event);
  add("face",      WEIGHTS.face,      signalScores.face);

  return Array.from(merged.entries())
    .map(([imageId, { score, signals }]) => ({ imageId, score, signals }))
    .sort((a, b) => b.score - a.score);
}

const IMAGE_SELECT = {
  id: true,
  cloudinaryUrl: true,
  filename: true,
  takenAt: true,
  width: true,
  height: true,
  processingStatus: true,
  createdAt: true,
  imageCategories: {
    select: {
      confidence: true,
      category: { select: { slug: true, label: true } },
    },
    orderBy: { confidence: "desc" },
    take: 1,
  },
};

/**
 *
 * @param {string} query
 * @param {string} userId
 * @param {{ limit?: number, cursor?: number }} options
 * @returns {Promise<{ results: Array, total: number, signals: string[], query: object }>}
 */
export async function hybridSearch(query, userId, options = {}) {
  const limit = Math.min(options.limit ?? 50, 100);
  const offset = options.offset ?? 0;

  const intent = parseSearchIntent(query);

  logger.info("Hybrid search", {
    userId,
    query,
    intent: {
      semantic: intent.semanticQuery,
      category: intent.categorySlug,
      event: intent.eventKeywords,
      face: intent.faceLabel,
      ocr: intent.ocrTerms,
      year: intent.yearFilter,
    },
  });
  const [semantic, ocr, category, event, face] = await Promise.all([
    runSemanticSearch(intent, userId),
    runOcrSearch(intent, userId),
    runCategorySearch(intent, userId),
    runEventSearch(intent, userId),
    runFaceSearch(intent, userId),
  ]);

  const rankedIds = mergeScores({ semantic, ocr, category, event, face }, intent);

  const totalCount = rankedIds.length;
  const pageIds = rankedIds.slice(offset, offset + limit);

 if (!pageIds.length) {
  return {
    results: [],
    total: totalCount,
    signals: [],
    parsedQuery: intent,
  };
}
  const imageIds = pageIds.map((r) => r.imageId);
  const images = await prisma.image.findMany({
    where: { id: { in: imageIds }, deletedAt: null },
    select: IMAGE_SELECT,
  });

  const imageMap = Object.fromEntries(images.map((img) => [img.id, img]));
  const results = pageIds
    .map((r) => {
      const img = imageMap[r.imageId];
      if (!img) return null;
      return {
        ...img,
        _searchScore: parseFloat(r.score.toFixed(4)),
        _matchedSignals: r.signals,
      };
    })
    .filter(Boolean);
  const firedSignals = [];
  if (semantic.size) firedSignals.push("semantic");
  if (ocr.size) firedSignals.push("ocr");
  if (category.size) firedSignals.push("category");
  if (event.size) firedSignals.push("event");
  if (face.size) firedSignals.push("face");

  return {
    results,
    total: totalCount,
    signals: firedSignals,
    parsedQuery: {
      semantic: intent.semanticQuery,
      category: intent.categorySlug,
      eventKeywords: intent.eventKeywords,
      faceLabel: intent.faceLabel,
      ocrTerms: intent.ocrTerms,
      yearFilter: intent.yearFilter,
      monthFilter: intent.monthFilter,
    },
  };
}