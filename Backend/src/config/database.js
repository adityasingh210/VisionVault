import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import logger from "../lib/logger.js";


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,                   
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: {
    ca: fs.readFileSync("./ca.pem")
  }
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log:
    env.NODE_ENV === "development"
      ? [
          { emit: "event", level: "query" },
          { emit: "event", level: "warn" },
          { emit: "event", level: "error" },
        ]
      : [
          { emit: "event", level: "warn" },
          { emit: "event", level: "error" },
        ],
});

if (env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    logger.debug("Prisma query", { query: e.query, duration: `${e.duration}ms` });
  });
}

prisma.$on("warn", (e) => {
  logger.warn("Prisma warning", { message: e.message });
});

prisma.$on("error", (e) => {
  logger.error("Prisma error", { message: e });
  logger.error("Prisma error:", e);
    console.error(e);
});

export async function connectDatabase() {
  await prisma.$queryRaw`SELECT 1`;
  logger.info("Database connected");
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  await pool.end();
  logger.info("Database disconnected");
}

export default prisma;
