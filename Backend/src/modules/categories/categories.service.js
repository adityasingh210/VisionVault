import prisma from "../../config/database.js";
import { NotFoundError } from "../../lib/errors.js";
import { env } from "../../config/env.js";

export async function listCategories(userId) {
  const categories = await prisma.category.findMany({
    where: {
      imageCategories: {
        some: {
          image: { userId },
        },
      },
    },
    select: {
      slug: true,
      label: true,
      _count: {
        select: {
          imageCategories: {
            where: { image: { userId } },
          },
        },
      },
    },
    orderBy: { label: "asc" },
  });

  return {
    categories: categories.map((c) => ({
      slug: c.slug,
      label: c.label,
      imageCount: c._count.imageCategories,
    })),
  };
}

export async function getImagesByCategory(slug, userId, query) {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, slug: true, label: true },
  });

  if (!category) throw new NotFoundError("Category");

  const limit = Math.min(query.limit ?? env.DEFAULT_PAGE_SIZE, env.MAX_PAGE_SIZE);
  const minConfidence = query.minConfidence ?? 0.1;

  const imageCategories = await prisma.imageCategory.findMany({
    where: {
      categoryId: category.id,
      confidence: { gte: minConfidence },
      image: { userId },
    },
    select: {
      confidence: true,
      image: {
        select: {
          id: true,
          thumbnailUrl: true,
          cloudinaryUrl: true,
          filename: true,
          takenAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { confidence: "desc" },
    take: limit + 1,
    skip: query.cursor ? 1 : 0,
    ...(query.cursor && { cursor: { imageId_categoryId: { imageId: query.cursor, categoryId: category.id } } }),
  });

  const hasNextPage = imageCategories.length > limit;
  const trimmed = hasNextPage ? imageCategories.slice(0, limit) : imageCategories;

  return {
    category: { slug: category.slug, label: category.label },
    images: trimmed.map((ic) => ({
      ...ic.image,
      confidence: ic.confidence,
    })),
    pagination: {
      nextCursor: hasNextPage ? trimmed[trimmed.length - 1].image.id : null,
      hasNextPage,
      count: trimmed.length,
    },
  };
}
