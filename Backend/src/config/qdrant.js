import { QdrantClient } from "@qdrant/js-client-rest";
import { env } from "./env.js";
import logger from "../lib/logger.js";

export const COLLECTIONS = {
  IMAGE_EMBEDDINGS: "image_embeddings",
  FACE_EMBEDDINGS: "face_embeddings",
};

const VECTOR_SIZE = 512;
const FACE_VECTOR_SIZE = 128;

const collectionSchemas = {
  [COLLECTIONS.IMAGE_EMBEDDINGS]: {
    vectors: {
      size: VECTOR_SIZE,
      distance: "Cosine",
    },
  },
  [COLLECTIONS.FACE_EMBEDDINGS]: {
    vectors: {
      size: FACE_VECTOR_SIZE,
      distance: "Cosine",
    },
  },
};


const payloadIndexes = {
  [COLLECTIONS.IMAGE_EMBEDDINGS]: [
    { field: "user_id", schema: "keyword" },
    { field: "category", schema: "keyword" },
    { field: "taken_at", schema: "datetime" },
  ],
  [COLLECTIONS.FACE_EMBEDDINGS]: [
    { field: "user_id", schema: "keyword" },
    { field: "cluster_id", schema: "keyword" },
  ],
};

export const qdrant = new QdrantClient({
  url: env.QDRANT_URL,
  ...(env.QDRANT_API_KEY ? { apiKey: env.QDRANT_API_KEY } : {}),
});

async function ensureCollection(name, schema) {
  const { exists } = await qdrant.collectionExists(name);

  if (!exists) {
    await qdrant.createCollection(name, schema);
    logger.info(`Qdrant collection created`, { collection: name });
  }
}

async function ensurePayloadIndexes(collectionName, indexes) {
  for (const { field, schema } of indexes) {
    try {
      await qdrant.createPayloadIndex(collectionName, {
        field_name: field,
        field_schema: schema,
      });
    } catch (error) {
      logger.debug("Payload index already exists", {
        collection: collectionName,
        field,
      });
    }
  }
}

export async function initializeQdrant() {
  for (const [name, schema] of Object.entries(collectionSchemas)) {
    await ensureCollection(name, schema);
    await ensurePayloadIndexes(name, payloadIndexes[name]);
  }

  logger.info("Qdrant initialized", {
    collections: Object.values(COLLECTIONS),
  });
}

export default qdrant;
