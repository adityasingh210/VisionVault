import { generateTextEmbedding } from "./clip.service.js";
import { classifyText } from "./category.service.js";
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
// --- Semantic score thresholding -----------------------------------------
// A single fixed global threshold can't tell "this query has 40 genuinely
// great matches" (keep all 40) apart from "this query has 1 okay match and
// 39 borderline ones" (keep just the 1) — both cases can produce a top score
// around the same value. So this uses two stages instead of one constant:
//
// 1. SEMANTIC_ABS_FLOOR — an absolute cosine-similarity floor that rejects
//    anything sitting inside CLIP's baseline "modality gap" noise band.
//    Unrelated text/image pairs commonly score ~0.15-0.25 from geometry
//    alone, not real relevance (this replaced the old 0.22 constant, which
//    sat inside that band and barely filtered anything — e.g. "human"
//    matched a dog photo).
// 2. SEMANTIC_RELATIVE_Z — among candidates that clear the floor, keep the
//    ones within an adaptive margin of THIS query's best match: cutoff =
//    topScore - SEMANTIC_RELATIVE_Z * std(scores). The margin is anchored to
//    the top score (not the mean) so the best match is always kept, and it
//    scales with how spread out the batch is: a tight cluster of similarly-
//    good scores (small std) gets a small margin and mostly survives intact,
//    while a lone good match sitting well above a long noisy tail (large
//    std) gets a wider margin that still correctly excludes the tail. A
//    mean-anchored version of this was tried first and rejected: it cut a
//    tight, genuinely-relevant cluster roughly in half (everything below the
//    mean), which is the opposite of what "adapts to the query" should do.
//
// CAVEAT: both constants below are still hand-picked starting points, not
// derived from labeled data — see scripts/calibrate-semantic-threshold.js,
// which runs known-relevant/known-irrelevant (query, image) pairs through
// the real embedding pipeline and reports the actual score distributions so
// these can be set from evidence instead of guesswork. Re-run it whenever
// the CLIP model or the image corpus changes meaningfully.
const SEMANTIC_ABS_FLOOR = 0.24;
const SEMANTIC_RELATIVE_Z = 0.75;

/**
 * Applies the relative/statistical cutoff described above to a batch of
 * Qdrant results that have already cleared SEMANTIC_ABS_FLOOR.
 * @param {Array<{ score: number }>} results
 * @returns {Array<{ score: number }>}
 */
function applyRelativeSemanticCutoff(results) {
  if (results.length <= 1) return results;
  const scores = results.map((r) => r.score);
  const topScore = Math.max(...scores);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const std = Math.sqrt(variance);
  const cutoff = Math.max(SEMANTIC_ABS_FLOOR, topScore - SEMANTIC_RELATIVE_Z * std);
  return results.filter((r) => r.score >= cutoff);
}
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
    if (words.includes(name)) {
      monthFilter = num;
      break;
    }
  }
  // categorySlug is no longer decided here via a hardcoded keyword list —
  // see runCategorySearch(), which classifies the query with the same CLIP
  // category model used to categorize photos at upload time.
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

  // Capture a full name after "with", not just the first word — "with John
  // Smith" used to only capture "John", silently dropping "Smith" and making
  // the face-cluster lookup broader (and less accurate) than intended.
  // Grabs up to 3 words after "with", then walks them in order and stops at
  // the first stop word ("with John at the beach" -> "John", not "John At
  // The"). Still a heuristic — a name followed immediately by another
  // capitalized word ("with John Beach") can't be distinguished from a
  // two-word name by regex alone — but it fixes the multi-word-name case
  // that was silently broken before without regressing the simple case.
  const withMatch = query.match(/\bwith\s+([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i);
  let faceLabel = null;
  if (withMatch) {
    const nameWords = [];
    for (const w of withMatch[1].split(/\s+/)) {
      if (STOP_WORDS.has(w.toLowerCase())) break;
      nameWords.push(w);
    }
    if (nameWords.length) faceLabel = nameWords.join(" ").toLowerCase();
  }
  const semanticQuery = words
    .filter((w) => !STOP_WORDS.has(w) && !/^\d{4}$/.test(w))
    .join(" ") || query;

  return {
    rawQuery: query,
    semanticQuery,
    ocrTerms,
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
    if (intent.yearFilter && intent.monthFilter) {
      // Both given: one precise range for that exact year+month.
      const lastDay = new Date(intent.yearFilter, intent.monthFilter, 0).getDate();
      const mm = String(intent.monthFilter).padStart(2, "0");
      filter.must.push({
        key: "taken_at",
        range: {
          gte: `${intent.yearFilter}-${mm}-01T00:00:00Z`,
          lte: `${intent.yearFilter}-${mm}-${lastDay}T23:59:59Z`,
        },
      });
    } else if (intent.yearFilter) {
      filter.must.push({
        key: "taken_at",
        range: {
          gte: `${intent.yearFilter}-01-01T00:00:00Z`,
          lte: `${intent.yearFilter}-12-31T23:59:59Z`,
        },
      });
    } else if (intent.monthFilter) {
      // Month given without a year: OR together that month's range across a
      // generous span of years (Qdrant has no "extract month" filter, so this
      // is the simplest correct way to match "june trip" regardless of year).
      const mm = String(intent.monthFilter).padStart(2, "0");
      const currentYear = new Date().getFullYear();
      const should = [];
      for (let y = currentYear; y >= currentYear - 20; y--) {
        const lastDay = new Date(y, intent.monthFilter, 0).getDate();
        should.push({
          key: "taken_at",
          range: {
            gte: `${y}-${mm}-01T00:00:00Z`,
            lte: `${y}-${mm}-${lastDay}T23:59:59Z`,
          },
        });
      }
      filter.must.push({ should });
    }

    const candidates = await qdrantClient.search(COLLECTIONS.IMAGE_EMBEDDINGS, {
      vector: embedding,
      limit: SIGNAL_LIMIT,
      filter,
      with_payload: true,
      score_threshold: SEMANTIC_ABS_FLOOR,
    });
    const results = applyRelativeSemanticCutoff(candidates);
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
        OR: intent.ocrTerms.map((term) => ({
          rawText: { contains: term, mode: "insensitive" },
        })),
      },
      select: { imageId: true, rawText: true },
      take: SIGNAL_LIMIT,
    });

    for (const r of results) {
      // Score scales with how many of the query's OCR terms actually appear in
      // this image's text, so a match on 2/2 terms ranks above a match on 1/2.
      const lowerText = r.rawText?.toLowerCase() ?? "";
      const matchedTerms = intent.ocrTerms.filter((term) =>
        lowerText.includes(term.toLowerCase())
      ).length;
      const score = 0.8 * (matchedTerms / intent.ocrTerms.length);
      scores.set(r.imageId, score);
    }
  } catch (err) {
    logger.warn("OCR search failed", { error: err.message });
  }
  return scores;
}
async function runCategorySearch(intent, userId) {
  const scores = new Map();

  try {
    // Classify the query itself with CLIP against the same category space
    // used to tag photos on upload (category.service.js), instead of a
    // hardcoded keyword list. This is what makes "cat" vs "dog" actually
    // resolve to different categories rather than both hitting one "pets"
    // bucket.
    const matches = await classifyText(intent.semanticQuery || intent.rawQuery);
    if (!matches.length) return scores;

    const categorySlug = matches[0].slug;
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    });
    if (!category) return scores;

    const imageCategories = await prisma.imageCategory.findMany({
      where: {
        categoryId: category.id,
        image: { userId, deletedAt: null },
        confidence: { gte: 0.2 },
      },
      select: { imageId: true, confidence: true },
      orderBy: { confidence: "desc" },
      take: SIGNAL_LIMIT,
    });

    for (const ic of imageCategories) {
      scores.set(ic.imageId, parseFloat(ic.confidence));
    }
    scores.__matchedSlug = categorySlug; // stashed for logging/parsedQuery below
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
      category: category.__matchedSlug ?? null,
      eventKeywords: intent.eventKeywords,
      faceLabel: intent.faceLabel,
      ocrTerms: intent.ocrTerms,
      yearFilter: intent.yearFilter,
      monthFilter: intent.monthFilter,
    },
  };
}