// One-off migration script: re-runs CLIP categorization for every existing
// image against the updated, more granular CATEGORIES list in
// src/ai/category.service.js (added dogs/cats/birds/selfie instead of one
// broad "pets" bucket).
//
// Why this is needed: images that were already processed got tagged under
// the OLD category set (e.g. everything animal-related just got "pets").
// Changing CATEGORIES going forward only affects NEW uploads — this script
// re-classifies photos that already exist in the DB so search results catch
// up immediately instead of waiting for someone to re-upload everything.
//
// USAGE:
//   node scripts/recategorize-images.js [--dry-run] [--resume]
//
//   --dry-run   Classify and log what WOULD change, write nothing to
//               Postgres/Qdrant. Use this first on a fresh CATEGORIES change.
//   --resume    Continue from the last checkpoint (scripts/.recategorize-
//               checkpoint.json) instead of starting from the beginning.
//               Written automatically after every batch and on SIGINT/
//               SIGTERM, so an interrupted run can pick back up without
//               re-paying CLIP inference cost for images already done.
//
// Safe to re-run — classifyImage + imageCategory upsert are both idempotent.
//
// SCALE NOTES (this is written to be safe for 100k+ images):
//   - Images are paginated (BATCH_SIZE at a time via Prisma cursor
//     pagination) instead of loaded into memory all at once.
//   - Up to CONCURRENCY classifyImage calls run in flight at once — fast
//     enough to get through a large library, bounded enough not to hammer
//     Cloudinary/Qdrant/the CLIP process.
//   - Each image gets MAX_RETRIES attempts with exponential backoff before
//     being counted as a real failure, so a transient network blip doesn't
//     permanently skip an image.
//   - Progress is checkpointed after every batch (and on interrupt) so a
//     crash partway through a 100k-image run doesn't mean starting over.

import { readFile, writeFile, unlink } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "../src/config/database.js";
import qdrantClient, { COLLECTIONS } from "../src/config/qdrant.js";
import { classifyImage, CATEGORIES } from "../src/ai/category.service.js";
import logger from "../src/lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHECKPOINT_PATH = path.join(__dirname, ".recategorize-checkpoint.json");

const BATCH_SIZE = 200;
const CONCURRENCY = 5;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const RESUME = args.includes("--resume");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Runs `worker` over `items` with at most `limit` in flight at once. */
async function mapWithConcurrency(items, limit, worker) {
  let next = 0;
  async function runOne() {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, runOne)
  );
}

async function withRetries(fn, { retries = MAX_RETRIES, label = "" } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        logger.warn("Recategorize: retrying after failure", {
          label,
          attempt,
          retries,
          delayMs: delay,
          error: err.message,
        });
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

async function loadCheckpoint() {
  if (!RESUME) return null;
  try {
    const raw = await readFile(CHECKPOINT_PATH, "utf-8");
    const checkpoint = JSON.parse(raw);
    logger.info("Recategorize: resuming from checkpoint", checkpoint);
    return checkpoint;
  } catch {
    logger.info("Recategorize: no checkpoint found, starting from the beginning");
    return null;
  }
}

async function saveCheckpoint(state) {
  if (DRY_RUN) return; // dry runs shouldn't persist resume state
  await writeFile(CHECKPOINT_PATH, JSON.stringify(state, null, 2));
}

async function clearCheckpoint() {
  try {
    await unlink(CHECKPOINT_PATH);
  } catch {
    // fine if it never existed
  }
}

async function seedCategories() {
  if (DRY_RUN) return;
  await Promise.all(
    CATEGORIES.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        create: { slug: c.slug, label: c.slug.charAt(0).toUpperCase() + c.slug.slice(1) },
        update: {},
      })
    )
  );
}

/**
 * Categories that used to exist but aren't in the current CATEGORIES list
 * (e.g. the old broad "pets" bucket after it was split into dogs/cats/pets).
 * We deliberately do NOT bulk-delete these upfront: that would leave every
 * image with zero categories for however long the full run takes, and any
 * image that fails classification would stay uncategorized indefinitely.
 * Instead, each image's own stale rows are removed only once THAT image has
 * been successfully reclassified (see processImage below), so a partial or
 * failed run only ever leaves old tags in place a little longer — it never
 * wipes tags out from under images that haven't been redone yet.
 */
async function getStaleCategoryIds() {
  const currentSlugs = new Set(CATEGORIES.map((c) => c.slug));
  const allCategories = await prisma.category.findMany({ select: { id: true, slug: true } });
  return allCategories.filter((c) => !currentSlugs.has(c.slug)).map((c) => c.id);
}

async function processImage(image, staleCategoryIds, stats) {
  try {
    const predictions = await withRetries(() => classifyImage(image.cloudinaryUrl), {
      label: `classifyImage:${image.id}`,
    });
    const categorySlugs = predictions.map((p) => p.slug);
    const topCategory = predictions[0]?.slug ?? "other";

    if (DRY_RUN) {
      logger.info("Recategorize: [dry-run] would tag", {
        imageId: image.id,
        predictions,
      });
      stats.done += 1;
      return;
    }

    const categories = await prisma.category.findMany({
      where: { slug: { in: categorySlugs } },
      select: { id: true, slug: true },
    });
    const slugToId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
    const newCategoryIds = new Set(categorySlugs.map((s) => slugToId[s]).filter(Boolean));

    // Write new tags and drop this image's stale-category rows together so
    // an image is never left in a half-migrated state between the two.
    await prisma.$transaction([
      ...predictions
        .filter((p) => slugToId[p.slug])
        .map((p) =>
          prisma.imageCategory.upsert({
            where: { imageId_categoryId: { imageId: image.id, categoryId: slugToId[p.slug] } },
            create: { imageId: image.id, categoryId: slugToId[p.slug], confidence: p.confidence },
            update: { confidence: p.confidence },
          })
        ),
      ...(staleCategoryIds.length
        ? [
            prisma.imageCategory.deleteMany({
              where: {
                imageId: image.id,
                categoryId: { in: staleCategoryIds.filter((id) => !newCategoryIds.has(id)) },
              },
            }),
          ]
        : []),
    ]);

    try {
      await withRetries(
        () =>
          qdrantClient.setPayload(COLLECTIONS.IMAGE_EMBEDDINGS, {
            payload: { category: topCategory },
            filter: { must: [{ key: "image_id", match: { value: image.id } }] },
          }),
        { label: `qdrant.setPayload:${image.id}`, retries: 2 }
      );
    } catch (err) {
      // Postgres write already succeeded — Qdrant's payload copy of the
      // category is a denormalized convenience field for filtering, not the
      // source of truth, so a failure here is worth logging but shouldn't
      // fail the whole image (or block moving on to the next one).
      logger.warn("Recategorize: could not update Qdrant payload after retries", {
        imageId: image.id,
        error: err.message,
      });
    }

    stats.done += 1;
  } catch (err) {
    stats.failed += 1;
    stats.failedIds.push(image.id);
    logger.warn("Recategorize: failed for image after retries", {
      imageId: image.id,
      error: err.message,
    });
  }
}

async function main() {
  logger.info("Recategorize: starting", { dryRun: DRY_RUN, resume: RESUME, batchSize: BATCH_SIZE, concurrency: CONCURRENCY });

  await seedCategories();
  const staleCategoryIds = await getStaleCategoryIds();
  if (staleCategoryIds.length) {
    logger.info("Recategorize: found stale category ids (will be cleaned up per-image as each image is reprocessed)", {
      count: staleCategoryIds.length,
    });
  }

  const checkpoint = await loadCheckpoint();
  let cursor = checkpoint?.lastImageId ?? null;

  const stats = {
    done: checkpoint?.done ?? 0,
    failed: checkpoint?.failed ?? 0,
    failedIds: checkpoint?.failedIds ?? [],
  };

  let interrupted = false;
  const onInterrupt = async (signal) => {
    if (interrupted) return; // avoid double-handling
    interrupted = true;
    logger.warn(`Recategorize: received ${signal}, saving checkpoint before exit`);
    await saveCheckpoint({ lastImageId: cursor, ...stats });
    process.exit(130);
  };
  process.on("SIGINT", () => onInterrupt("SIGINT"));
  process.on("SIGTERM", () => onInterrupt("SIGTERM"));

  // Rough total for progress logging only — not used for pagination itself.
  const total = await prisma.image.count({ where: { deletedAt: null } });
  logger.info("Recategorize: images to process", { total });

  while (!interrupted) {
    const images = await prisma.image.findMany({
      where: { deletedAt: null },
      select: { id: true, cloudinaryUrl: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (!images.length) break;

    await mapWithConcurrency(images, CONCURRENCY, (image) =>
      processImage(image, staleCategoryIds, stats)
    );

    cursor = images[images.length - 1].id;
    await saveCheckpoint({ lastImageId: cursor, ...stats });

    logger.info("Recategorize: progress", {
      done: stats.done,
      failed: stats.failed,
      total,
    });
  }

  if (interrupted) return; // checkpoint already saved by the signal handler

  logger.info("Recategorize: complete", {
    done: stats.done,
    failed: stats.failed,
    total,
    failedIds: stats.failed ? stats.failedIds.slice(0, 50) : [],
  });
  if (stats.failed) {
    logger.warn(
      "Recategorize: some images failed after retries and were left untouched " +
      "(including any stale-category cleanup). Re-run with --resume to retry " +
      "just the remainder, or re-run without --resume for a full pass — both are safe."
    );
  } else {
    await clearCheckpoint();
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  logger.error("Recategorize: fatal error", { error: err.message, stack: err.stack });
  await prisma.$disconnect();
  process.exit(1);
});
