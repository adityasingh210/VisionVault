// src/modules/search/search.routes.js
import { Router } from "express";
import * as searchController from "./search.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateQuery } from "../../middleware/validate.js";
import { searchRateLimiter } from "../../middleware/rateLimiter.js";
import { searchQuerySchema } from "./search.validator.js";

const router = Router();
router.use(authenticate);
router.get(
  "/",
  searchRateLimiter,
  validateQuery(searchQuerySchema),
  searchController.search
);

export default router;