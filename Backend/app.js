import "express-async-errors";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import { env } from "./src/config/env.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import logger from "./src/lib/logger.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import imagesRoutes from "./src/modules/images/images.routes.js";
import facesRoutes from "./src/modules/faces/faces.routes.js";
import categoriesRoutes from "./src/modules/categories/categories.routes.js";
import eventsRoutes from "./src/modules/events/events.routes.js";
import searchRoutes from "./src/modules/search/search.routes.js";
import memoriesRoutes from "./src/modules/memories/memories.routes.js";

const app = express();

app.use(helmet());
app.set('etag', false)

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser(env.COOKIE_SECRET));

if (env.NODE_ENV !== "test") {
  app.use(
    morgan("combined", {
      stream: { write: (msg) => logger.info({ type: "access" }, msg.trim()) },
      skip: (req) => req.path === "/health",
    })
  );
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/images", imagesRoutes);
app.use("/api/faces", facesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/memories", memoriesRoutes);
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested route does not exist",
    },
  });
});

app.use(errorHandler);

export default app;
