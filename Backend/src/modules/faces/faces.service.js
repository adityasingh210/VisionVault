import prisma from "../../config/database.js";
import { NotFoundError, ForbiddenError } from "../../lib/errors.js";

export async function listFaceClusters(userId) {
  const clusters = await prisma.faceCluster.findMany({
    where: { userId },
    select: {
      id: true,
      label: true,
      createdAt: true,
      _count: { select: { faces: true } },
      faces: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          image: {
            select: { id: true, thumbnailUrl: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    clusters: clusters.map((c) => ({
      id: c.id,
      label: c.label,
      faceCount: c._count.faces,
      representativeImage: c.faces[0]?.image ?? null,
      createdAt: c.createdAt,
    })),
  };
}
export async function getFaceClusterById(clusterId, userId) {
  const cluster = await prisma.faceCluster.findUnique({
    where: { id: clusterId },
    select: {
      id: true,
      userId: true,
      label: true,
      createdAt: true,
      faces: {
        select: {
          id: true,
          bboxX: true,
          bboxY: true,
          bboxW: true,
          bboxH: true,
          image: {
            select: {
              id: true,
              thumbnailUrl: true,
              cloudinaryUrl: true,
              takenAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cluster) throw new NotFoundError("FaceCluster");
  if (cluster.userId !== userId) throw new ForbiddenError();

  return {
    id: cluster.id,
    label: cluster.label,
    createdAt: cluster.createdAt,
    faces: cluster.faces,
  };
}
