// src/modules/memories/memories.service.js
import prisma from "../../config/database.js";
import logger from "../../lib/logger.js";
const COMPLETED_IMAGE = { processingStatus: "COMPLETED", deletedAt: null };
const THUMB_SELECT = {
  id: true,
  cloudinaryUrl: true,
  filename: true,
  takenAt: true,
  width: true,
  height: true,
};

/**
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getHighlights(userId) {
  const baseWhere = { userId, ...COMPLETED_IMAGE };

  const [
    totalImages,
    totalEvents,
    totalPeople,
    topCategoriesRaw,
    topLocationsRaw,
    topTripsRaw,
    earliestImage,
    latestImage,
  ] = await Promise.all([
    prisma.image.count({ where: baseWhere }),
    prisma.event.count({ where: { userId } }),
    prisma.faceCluster.count({
      where: {
        userId,
        faces: { some: {} },
      },
    }),
    prisma.imageCategory.groupBy({
      by: ["categoryId"],
      where: {
        image: { userId, ...COMPLETED_IMAGE },
      },
      _count: { imageId: true },
      orderBy: { _count: { imageId: "desc" } },
      take: 5,
    }),
    prisma.event.findMany({
      where: {
        userId,
        locationLat: { not: null },
        locationLng: { not: null },
      },
      select: {
        id: true,
        title: true,
        locationLat: true,
        locationLng: true,
        _count: { select: { eventImages: true } },
      },
      orderBy: { eventImages: { _count: "desc" } },
      take: 5,
    }),
    prisma.event.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: "Trip", mode: "insensitive" } },
          { title: { contains: "Vacation", mode: "insensitive" } },
          { title: { contains: "Getaway", mode: "insensitive" } },
          { title: { contains: "Adventure", mode: "insensitive" } },
          { title: { contains: "Tour", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        coverImageId: true,
        coverImage: { select: THUMB_SELECT },
        locationLat: true,
        locationLng: true,
        _count: { select: { eventImages: true } },
      },
      orderBy: { eventImages: { _count: "desc" } },
      take: 5,
    }),
    prisma.image.findFirst({
      where: { userId, takenAt: { not: null }, ...COMPLETED_IMAGE },
      select: { takenAt: true },
      orderBy: { takenAt: "asc" },
    }),

    prisma.image.findFirst({
      where: { userId, takenAt: { not: null }, ...COMPLETED_IMAGE },
      select: { takenAt: true },
      orderBy: { takenAt: "desc" },
    }),
  ]);
  const categoryIds = topCategoriesRaw.map((r) => r.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, slug: true, label: true },
  });
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  const topCategories = topCategoriesRaw.map((r) => ({
    slug: categoryMap[r.categoryId]?.slug ?? "other",
    label: categoryMap[r.categoryId]?.label ?? "Other",
    imageCount: r._count.imageId,
  }));

  const topLocations = topLocationsRaw.map((e) => ({
    eventId: e.id,
    title: e.title,
    lat: e.locationLat ? parseFloat(e.locationLat) : null,
    lng: e.locationLng ? parseFloat(e.locationLng) : null,
    imageCount: e._count.eventImages,
  }));

  const topTrips = topTripsRaw.map((e) => ({
    eventId: e.id,
    title: e.title,
    startAt: e.startAt,
    endAt: e.endAt,
    imageCount: e._count.eventImages,
    lat: e.locationLat ? parseFloat(e.locationLat) : null,
    lng: e.locationLng ? parseFloat(e.locationLng) : null,
    coverImage: e.coverImage ?? null,
  }));

  logger.info("Highlights fetched", { userId, totalImages, totalEvents, totalPeople });

  return {
    totalImages,
    totalEvents,
    totalPeople,
    topCategories,
    topLocations,
    topTrips,
    dateRange: {
      from: earliestImage?.takenAt ?? null,
      to: latestImage?.takenAt ?? null,
    },
  };
}
/**
 * @param {string} userId
 * @param {{ limit?: number }} options
 * @returns {Promise<Array>}
 */
export async function getMostPhotographedPeople(userId, options = {}) {
  const limit = Math.min(options.limit ?? 20, 50);
  const clusters = await prisma.faceCluster.findMany({
    where: {
      userId,
      faces: { some: {} },
    },
    select: {
      id: true,
      label: true,
      coverFaceId: true,
      createdAt: true,
      faces: {
        select: {
          imageId: true,
          image: {
            select: { takenAt: true },
            where: COMPLETED_IMAGE,
          },
        },
        where: {
          image: { userId, ...COMPLETED_IMAGE },
        },
      },
    },
    orderBy: {
      faces: { _count: "desc" },
    },
    take: limit,
  });
  const coverFaceIds = clusters
    .map((c) => c.coverFaceId)
    .filter(Boolean);

  let faceImageMap = {};
  if (coverFaceIds.length > 0) {
    const coverFaces = await prisma.face.findMany({
      where: { id: { in: coverFaceIds } },
      select: {
        id: true,
        image: { select: THUMB_SELECT },
      },
    });
    faceImageMap = Object.fromEntries(coverFaces.map((f) => [f.id, f.image]));
  }

  const result = clusters.map((cluster) => {
    const uniqueImageIds = [...new Set(cluster.faces.map((f) => f.imageId))];
    const imageCount = uniqueImageIds.length;
    const dates = cluster.faces
      .map((f) => f.image?.takenAt)
      .filter(Boolean)
      .map((d) => new Date(d).getTime());

    const firstSeen = dates.length ? new Date(Math.min(...dates)) : null;
    const lastSeen  = dates.length ? new Date(Math.max(...dates)) : null;

    return {
      clusterId: cluster.id,
      label: cluster.label ?? null,
      imageCount,
      firstSeen,
      lastSeen,
      coverImage: cluster.coverFaceId
        ? (faceImageMap[cluster.coverFaceId] ?? null)
        : null,
    };
  });
  result.sort((a, b) => b.imageCount - a.imageCount);

  return result;
}

/**
 *
 * @param {string} userId
 * @param {{ limit?: number, year?: number }} options
 * @returns {Promise<Array>}
 */
export async function getTopEvents(userId, options = {}) {
  const limit = Math.min(options.limit ?? 20, 50);

  const where = { userId };
  if (options.year) {
    where.startAt = {
      gte: new Date(`${options.year}-01-01T00:00:00Z`),
      lte: new Date(`${options.year}-12-31T23:59:59Z`),
    };
  }

  const events = await prisma.event.findMany({
    where,
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      locationLat: true,
      locationLng: true,
      coverImage: { select: THUMB_SELECT },
      _count: { select: { eventImages: true } },
    },
    orderBy: { eventImages: { _count: "desc" } },
    take: limit,
  });

  return events.map((e) => {
    const durationMs =
      e.startAt && e.endAt
        ? new Date(e.endAt).getTime() - new Date(e.startAt).getTime()
        : null;

    const durationDays = durationMs !== null
      ? Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)))
      : null;

    return {
      eventId: e.id,
      title: e.title,
      imageCount: e._count.eventImages,
      startAt: e.startAt,
      endAt: e.endAt,
      durationDays,
      lat: e.locationLat ? parseFloat(e.locationLat) : null,
      lng: e.locationLng ? parseFloat(e.locationLng) : null,
      coverImage: e.coverImage ?? null,
    };
  });
}
const DOCUMENT_TYPES = [
  { type: "id",       keywords: ["aadhaar", "pan card", "passport", "voter", "driving licence", "license", "id card"] },
  { type: "invoice",  keywords: ["invoice", "bill", "receipt", "gst", "amount due", "total amount"] },
  { type: "certificate", keywords: ["certificate", "award", "achievement", "completion", "degree", "marksheet"] },
  { type: "medical",  keywords: ["prescription", "diagnosis", "report", "hospital", "patient", "medicine"] },
  { type: "financial",keywords: ["bank", "statement", "account", "balance", "salary", "tax"] },
  { type: "other",    keywords: [] },
];

function inferDocumentType(rawText) {
  if (!rawText) return "other";
  const lower = rawText.toLowerCase();
  for (const { type, keywords } of DOCUMENT_TYPES) {
    if (keywords.some((kw) => lower.includes(kw))) return type;
  }
  return "other";
}

/**
 *
 * @param {string} userId
 * @param {{ limit?: number }} options
 * @returns {Promise<object>}
 */
export async function getImportantDocuments(userId, options = {}) {
  const limit = Math.min(options.limit ?? 100, 200);
  const docImages = await prisma.image.findMany({
    where: {
      userId,
      ...COMPLETED_IMAGE,
      imageCategories: {
        some: {
          category: { slug: "documents" },
          confidence: { gte: 0.3 },
        },
      },
    },
    select: {
      ...THUMB_SELECT,
      ocrRecord: {
        select: { rawText: true, language: true, confidence: true },
      },
      imageCategories: {
        where: { category: { slug: "documents" } },
        select: { confidence: true },
        take: 1,
      },
    },
    orderBy: { takenAt: "desc" },
    take: limit,
  });
  const groups = {};
  for (const img of docImages) {
    const docType = inferDocumentType(img.ocrRecord?.rawText ?? "");
    if (!groups[docType]) groups[docType] = [];
    groups[docType].push({
      id: img.id,
      cloudinaryUrl: img.cloudinaryUrl,
      filename: img.filename,
      takenAt: img.takenAt,
      width: img.width,
      height: img.height,
      ocrConfidence: img.ocrRecord?.confidence ?? null,
      categoryConfidence: parseFloat(img.imageCategories[0]?.confidence ?? 0),
    });
  }

  const groupedDocuments = Object.entries(groups).map(([type, images]) => ({
    type,
    count: images.length,
    images,
  }));
  const TYPE_ORDER = ["id", "certificate", "medical", "financial", "invoice", "other"];
  groupedDocuments.sort(
    (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
  );

  return {
    totalDocuments: docImages.length,
    groups: groupedDocuments,
  };
}
/**
 *
 * @param {string} userId
 * @param {{ year?: number, previewCount?: number }} options
 * @returns {Promise<Array>}
 */
export async function getMonthlyMemories(userId, options = {}) {
  const previewCount = Math.min(options.previewCount ?? 4, 10);

  const where = {
    userId,
    ...COMPLETED_IMAGE,
    takenAt: { not: null },
  };

  if (options.year) {
    where.takenAt = {
      not: null,
      gte: new Date(`${options.year}-01-01T00:00:00Z`),
      lte: new Date(`${options.year}-12-31T23:59:59Z`),
    };
  }
  const images = await prisma.image.findMany({
    where,
    select: {
      id: true,
      cloudinaryUrl: true,
      filename: true,
      takenAt: true,
      width: true,
      height: true,
    },
    orderBy: { takenAt: "desc" },
  });
  const monthMap = new Map();

  for (const img of images) {
    const d = new Date(img.takenAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (!monthMap.has(key)) {
      monthMap.set(key, {
        year: d.getFullYear(),
        month: d.getMonth() + 1, 
        key,
        imageCount: 0,
        previewImages: [],
      });
    }

    const entry = monthMap.get(key);
    entry.imageCount++;

    if (entry.previewImages.length < previewCount) {
      entry.previewImages.push({
        id: img.id,
        cloudinaryUrl: img.cloudinaryUrl,
        filename: img.filename,
        takenAt: img.takenAt,
        width: img.width,
        height: img.height,
      });
    }
  }
  const months = Array.from(monthMap.values()).sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });

  return months;
}
const TRAVEL_CATEGORY_SLUGS = ["travel", "nature", "buildings", "vehicles"];
const TRAVEL_TITLE_KEYWORDS = [
  "trip", "vacation", "getaway", "adventure", "tour",
  "outing", "road trip", "drive", "city visit", "exploration",
  "nature trip", "outdoor adventure",
];

/**
 *
 * @param {string} userId
 * @param {{ year?: number }} options
 * @returns {Promise<object>}
 */
export async function getTravelSummary(userId, options = {}) {
  const eventsWhere = {
    userId,
    OR: [
      {
        locationLat: { not: null },
        locationLng: { not: null },
      },
      ...TRAVEL_TITLE_KEYWORDS.map((kw) => ({
        title: { contains: kw, mode: "insensitive" },
      })),
    ],
  };

  if (options.year) {
    eventsWhere.startAt = {
      gte: new Date(`${options.year}-01-01T00:00:00Z`),
      lte: new Date(`${options.year}-12-31T23:59:59Z`),
    };
  }

  const events = await prisma.event.findMany({
    where: eventsWhere,
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      locationLat: true,
      locationLng: true,
      coverImage: { select: THUMB_SELECT },
      _count: { select: { eventImages: true } },
      eventImages: {
        select: {
          image: {
            select: {
              imageCategories: {
                select: { category: { select: { slug: true } } },
                orderBy: { confidence: "desc" },
                take: 1,
              },
            },
            where: COMPLETED_IMAGE,
          },
        },
        take: 20,
      },
    },
    orderBy: { startAt: "desc" },
  });
  const travelEvents = events.filter((e) => {
    const imageSample = e.eventImages
      .map((ei) => ei.image?.imageCategories[0]?.category?.slug)
      .filter(Boolean);

    if (imageSample.length === 0) return true;

    const travelCount = imageSample.filter((slug) =>
      TRAVEL_CATEGORY_SLUGS.includes(slug)
    ).length;

    return travelCount / imageSample.length >= 0.3;
  });

  const totalImages = travelEvents.reduce(
    (sum, e) => sum + e._count.eventImages,
    0
  );
  const visitedPlaces = buildVisitedPlaces(travelEvents);

  // Build trip list
  const trips = travelEvents.map((e) => ({
    eventId: e.id,
    title: e.title,
    startAt: e.startAt,
    endAt: e.endAt,
    imageCount: e._count.eventImages,
    lat: e.locationLat ? parseFloat(e.locationLat) : null,
    lng: e.locationLng ? parseFloat(e.locationLng) : null,
    coverImage: e.coverImage ?? null,
  }));

  return {
    tripCount: travelEvents.length,
    totalImages,
    visitedPlaces,
    trips,
  };
}
function buildVisitedPlaces(events) {
  const places = [];

  for (const event of events) {
    const lat = event.locationLat ? parseFloat(event.locationLat) : null;
    const lng = event.locationLng ? parseFloat(event.locationLng) : null;

    if (!lat || !lng) {
      places.push({
        name: event.title,
        lat: null,
        lng: null,
        visitCount: 1,
        imageCount: event._count.eventImages,
        lastVisited: event.startAt,
      });
      continue;
    }
    const nearby = places.find((p) => {
      if (!p.lat) return false;
      return haversineKm(p.lat, p.lng, lat, lng) < 50;
    });

    if (nearby) {
      nearby.visitCount++;
      nearby.imageCount += event._count.eventImages;
      if (event.startAt && (!nearby.lastVisited || event.startAt > nearby.lastVisited)) {
        nearby.lastVisited = event.startAt;
      }
    } else {
      places.push({
        name: event.title,
        lat,
        lng,
        visitCount: 1,
        imageCount: event._count.eventImages,
        lastVisited: event.startAt,
      });
    }
  }
  return places.sort((a, b) => b.visitCount - a.visitCount);
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}