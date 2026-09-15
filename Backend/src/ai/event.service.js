import qdrantClient, { COLLECTIONS } from "../config/qdrant.js";
import logger from "../lib/logger.js";
const TIME_GAP_MS = 6 * 60 * 60 * 1000;
const LOCATION_MERGE_KM = 50;
const MIN_IMAGES_PER_EVENT = 3;
const VISUAL_MERGE_THRESHOLD = 0.82;

/**
 * @param {Array<{id: string, takenAt: Date|null, locationLat: any, locationLng: any}>} images
 * @returns {Array<{images: Array, startAt: Date|null, endAt: Date|null, lat: number|null, lng: number|null}>}
 */
export function bucketByTime(images) {
  const dated = images
    .filter((img) => img.takenAt)
    .sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));

  const undated = images.filter((img) => !img.takenAt);

  const buckets = [];
  let current = null;

  for (const img of dated) {
    const t = new Date(img.takenAt).getTime();

    if (!current || t - new Date(current.endAt).getTime() > TIME_GAP_MS) {
      current = {
        images: [img],
        startAt: img.takenAt,
        endAt: img.takenAt,
        lat: img.locationLat != null ? parseFloat(img.locationLat) : null,
        lng: img.locationLng != null ? parseFloat(img.locationLng) : null,
      };
      buckets.push(current);
    } else {
      current.images.push(img);
      current.endAt = img.takenAt;
      if (img.locationLat != null && img.locationLng != null) {
        const n = current.images.filter((i) => i.locationLat != null).length;
        current.lat = current.lat != null
          ? (current.lat * (n - 1) + parseFloat(img.locationLat)) / n
          : parseFloat(img.locationLat);
        current.lng = current.lng != null
          ? (current.lng * (n - 1) + parseFloat(img.locationLng)) / n
          : parseFloat(img.locationLng);
      }
    }
  }
  if (undated.length >= MIN_IMAGES_PER_EVENT) {
    buckets.push({
      images: undated,
      startAt: null,
      endAt: null,
      lat: null,
      lng: null,
    });
  }

  return buckets;
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

/**
 * @param {Array} buckets
 * @returns {Array}
 */
export function mergeByLocation(buckets) {
  const merged = [...buckets];
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const a = merged[i];
        const b = merged[j];

        if (a.lat == null || b.lat == null) continue;

        const dist = haversineKm(a.lat, a.lng, b.lat, b.lng);
        if (dist > LOCATION_MERGE_KM) continue;
        if (a.startAt && b.startAt) {
          const gap = Math.abs(
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
          );
          if (gap > 2 * 24 * 60 * 60 * 1000) continue;
        }

        // Merge b into a
        merged[i] = {
          images: [...a.images, ...b.images],
          startAt: a.startAt && b.startAt
            ? new Date(Math.min(new Date(a.startAt), new Date(b.startAt)))
            : a.startAt ?? b.startAt,
          endAt: a.endAt && b.endAt
            ? new Date(Math.max(new Date(a.endAt), new Date(b.endAt)))
            : a.endAt ?? b.endAt,
          lat: (a.lat + b.lat) / 2,
          lng: (a.lng + b.lng) / 2,
        };

        merged.splice(j, 1);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }

  return merged;
}

/**
 *
 * @param {Array} buckets
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function refineByVisualSimilarity(buckets, userId) {
  const centroids = await Promise.all(
    buckets.map(async (bucket) => {
      const sample = bucket.images.slice(0, 10);
      const imageIds = sample.map((img) => img.id);

      try {
        const results = await qdrantClient.retrieve(
          COLLECTIONS.IMAGE_EMBEDDINGS,
          {
            ids: imageIds,
            with_vector: true,
            with_payload: false,
          }
        );

        if (!results.length) return null;
        const dim = results[0].vector.length;
        const centroid = new Array(dim).fill(0);
        for (const r of results) {
          for (let i = 0; i < dim; i++) {
            centroid[i] += r.vector[i] / results.length;
          }
        }

        return centroid;
      } catch {
        return null;
      }
    })
  );
  const merged = [...buckets];
  const mergedCentroids = [...centroids];
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const ca = mergedCentroids[i];
        const cb = mergedCentroids[j];
        if (!ca || !cb) continue;

        const similarity = cosineSimilarity(ca, cb);
        if (similarity < VISUAL_MERGE_THRESHOLD) continue;
        const a = merged[i];
        const b = merged[j];
        if (a.startAt && b.startAt) {
          const gap = Math.abs(
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
          );
          if (gap > 7 * 24 * 60 * 60 * 1000) continue;
        }
        merged[i] = {
          images: [...a.images, ...b.images],
          startAt: a.startAt && b.startAt
            ? new Date(Math.min(new Date(a.startAt), new Date(b.startAt)))
            : a.startAt ?? b.startAt,
          endAt: a.endAt && b.endAt
            ? new Date(Math.max(new Date(a.endAt), new Date(b.endAt)))
            : a.endAt ?? b.endAt,
          lat: a.lat ?? b.lat,
          lng: a.lng ?? b.lng,
        };
        mergedCentroids[i] = ca.map((v, idx) => (v + cb[idx]) / 2);
        merged.splice(j, 1);
        mergedCentroids.splice(j, 1);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }

  return merged;
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 *
 * @param {Array} buckets
 * @param {Map<string, string[]>} imageToFaceClusters - imageId → clusterIds[]
 * @returns {Array}
 */
export function reinforceByFaces(buckets, imageToFaceClusters) {
  // Build cluster set per bucket
  const bucketClusters = buckets.map((bucket) => {
    const clusterIds = new Set();
    for (const img of bucket.images) {
      const clusters = imageToFaceClusters.get(img.id) ?? [];
      clusters.forEach((c) => clusterIds.add(c));
    }
    return clusterIds;
  });

  const merged = [...buckets];
  const mergedClusters = [...bucketClusters];
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const ca = mergedClusters[i];
        const cb = mergedClusters[j];
        let shared = 0;
        for (const c of ca) {
          if (cb.has(c)) shared++;
        }

        if (shared < 2) continue; 

        const a = merged[i];
        const b = merged[j];
        if (a.startAt && b.startAt) {
          const gap = Math.abs(
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
          );
          if (gap > 30 * 24 * 60 * 60 * 1000) continue;
        }

        merged[i] = {
          images: [...a.images, ...b.images],
          startAt: a.startAt && b.startAt
            ? new Date(Math.min(new Date(a.startAt), new Date(b.startAt)))
            : a.startAt ?? b.startAt,
          endAt: a.endAt && b.endAt
            ? new Date(Math.max(new Date(a.endAt), new Date(b.endAt)))
            : a.endAt ?? b.endAt,
          lat: a.lat ?? b.lat,
          lng: a.lng ?? b.lng,
        };

        for (const c of cb) mergedClusters[i].add(c);
        merged.splice(j, 1);
        mergedClusters.splice(j, 1);
        changed = true;
        break;
      }
      if (changed) break;
    }
  }

  return merged;
}

const CATEGORY_TITLES = {
  travel:     ["Trip", "Vacation", "Getaway", "Adventure"],
  people:     ["Gathering", "Get Together", "Meetup"],
  food:       ["Food Outing", "Dining Experience"],
  nature:     ["Nature Trip", "Outdoor Adventure"],
  buildings:  ["City Visit", "Exploration"],
  pets:       ["Pet Moments"],
  vehicles:   ["Road Trip", "Drive"],
  documents:  ["Documents"],
  screenshots:["Screenshots"],
  other:      ["Moments", "Memories"],
};

const FACE_TITLES = {
  1: ["Solo Moments", "Personal Memories"],
  2: ["Together", "Two of Us"],
  many: ["Group Gathering", "Friends Meetup", "Family Time"],
};

/**
 *
 * @param {object} bucket
 * @param {Map<string, string>} imageToCategorySlug 
 * @param {Map<string, string[]>} imageToFaceClusters 
 * @returns {string}
 */
export function generateEventTitle(bucket, imageToCategorySlug, imageToFaceClusters) {
  const categoryCounts = {};
  for (const img of bucket.images) {
    const cat = imageToCategorySlug.get(img.id) ?? "other";
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  const topCategory = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";
  const allClusters = new Set();
  for (const img of bucket.images) {
    (imageToFaceClusters.get(img.id) ?? []).forEach((c) => allClusters.add(c));
  }
  const faceCount = allClusters.size;
  let datePrefix = "";
  if (bucket.startAt) {
    const d = new Date(bucket.startAt);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    datePrefix = `${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  const titleOptions = CATEGORY_TITLES[topCategory] ?? CATEGORY_TITLES.other;
  const titleBase = titleOptions[Math.floor(Math.random() * titleOptions.length)];
  let faceModifier = "";
  if (faceCount === 1) {
    faceModifier = FACE_TITLES[1][0];
  } else if (faceCount === 2) {
    faceModifier = FACE_TITLES[2][0];
  } else if (faceCount > 2) {
    faceModifier = FACE_TITLES.many[Math.floor(Math.random() * FACE_TITLES.many.length)];
  }
  if (datePrefix && faceModifier && topCategory !== "other") {
    return `${datePrefix} ${titleBase}`;
  } else if (faceModifier && topCategory === "people") {
    return faceModifier;
  } else if (datePrefix) {
    return `${datePrefix} ${titleBase}`;
  }

  return titleBase;
}
