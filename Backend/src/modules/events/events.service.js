import prisma from "../../config/database.js";
import { enqueueEventJob } from "../../workers/queues/event.queue.js";
import { NotFoundError, ForbiddenError } from "../../lib/errors.js";
import { env } from "../../config/env.js";
export async function listEvents(userId) {
  const events = await prisma.event.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      locationLat: true,
      locationLng: true,
      metadata: true,
      createdAt: true,
      coverImage: {
        select: { id: true, thumbnailUrl: true, cloudinaryUrl: true },
      },
      _count: { select: { eventImages: true } },
      eventImages: {
        take: 20,
        select: {
          image: {
            select: {
              imageCategories: {
                select: { category: { select: { slug: true, label: true } }, confidence: true },
                orderBy: { confidence: "desc" },
                take: 1,
              },
              faces: {
                select: { clusterId: true },
                where: { clusterId: { not: null } },
              },
            },
          },
        },
      },
    },
    orderBy: { startAt: "desc" },
  });

  return {
    events: events.map((e) => formatEvent(e)),
  };
}

export async function getEventById(eventId, userId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      userId: true,
      title: true,
      startAt: true,
      endAt: true,
      locationLat: true,
      locationLng: true,
      metadata: true,
      createdAt: true,
      coverImage: {
        select: { id: true, thumbnailUrl: true, cloudinaryUrl: true },
      },
      _count: { select: { eventImages: true } },
      eventImages: {
        take: 50,
        select: {
          image: {
            select: {
              imageCategories: {
                select: { category: { select: { slug: true, label: true } }, confidence: true },
                orderBy: { confidence: "desc" },
                take: 1,
              },
              faces: {
                select: { clusterId: true },
                where: { clusterId: { not: null } },
              },
            },
          },
        },
      },
    },
  });

  if (!event) throw new NotFoundError("Event");
  if (event.userId !== userId) throw new ForbiddenError();

  return formatEvent(event);
}

export async function getEventImages(eventId, userId, query) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, userId: true },
  });

  if (!event) throw new NotFoundError("Event");
  if (event.userId !== userId) throw new ForbiddenError();

  const limit = Math.min(query.limit ?? env.DEFAULT_PAGE_SIZE, env.MAX_PAGE_SIZE);

  const eventImages = await prisma.eventImage.findMany({
    where: { eventId },
    select: {
      image: {
        select: {
          id: true,
          thumbnailUrl: true,
          cloudinaryUrl: true,
          filename: true,
          takenAt: true,
          createdAt: true,
          width: true,
          height: true,
        },
      },
    },
    take: limit + 1,
    skip: query.cursor ? 1 : 0,
    ...(query.cursor
      ? { cursor: { eventId_imageId: { eventId, imageId: query.cursor } } }
      : {}),
    orderBy: { image: { takenAt: "asc" } },
  });

  const hasNextPage = eventImages.length > limit;
  const trimmed = hasNextPage ? eventImages.slice(0, limit) : eventImages;

  return {
    images: trimmed.map((ei) => ei.image),
    pagination: {
      nextCursor: hasNextPage ? trimmed[trimmed.length - 1].image.id : null,
      hasNextPage,
      count: trimmed.length,
    },
  };
}

export async function rebuildEvents(userId) {
  const running = await prisma.eventJob.findFirst({
    where: { userId, status: { in: ["QUEUED", "RUNNING"] } },
    select: { id: true, status: true },
  });

  if (running) {
    return { jobId: running.id, status: running.status, message: "Already in progress" };
  }

  const job = await prisma.eventJob.create({
    data: { userId, status: "QUEUED" },
  });

  await enqueueEventJob(userId, job.id);

  return { jobId: job.id, status: "QUEUED", message: "Event clustering started" };
}

function formatEvent(event) {
  const categoryCounts = {};
  const faceClusterIds = new Set();

  for (const ei of event.eventImages ?? []) {
    const cat = ei.image.imageCategories[0]?.category;
    if (cat) {
      categoryCounts[cat.slug] = (categoryCounts[cat.slug] ?? { slug: cat.slug, label: cat.label, count: 0 });
      categoryCounts[cat.slug].count++;
    }
    for (const face of ei.image.faces ?? []) {
      if (face.clusterId) faceClusterIds.add(face.clusterId);
    }
  }

  const topCategories = Object.values(categoryCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(({ slug, label }) => ({ slug, label }));

  return {
    id: event.id,
    title: event.title,
    imageCount: event._count?.eventImages ?? 0,
    startAt: event.startAt,
    endAt: event.endAt,
    locationLat: event.locationLat,
    locationLng: event.locationLng,
    coverImage: event.coverImage ?? null,
    topCategories,
    topPeople: faceClusterIds.size,
    createdAt: event.createdAt,
  };
}
