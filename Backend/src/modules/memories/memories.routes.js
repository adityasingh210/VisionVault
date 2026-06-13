import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateQuery } from "../../middleware/validate.js";

import * as memoriesController from "./memories.controller.js";
import {
  highlightsQuerySchema,
  peopleQuerySchema,
  eventsQuerySchema,
  documentsQuerySchema,
  monthlyQuerySchema,
  travelQuerySchema,
} from "./memories.validator.js";

const router = Router();

router.use(authenticate);

router.get(
  "/highlights",
  validateQuery(highlightsQuerySchema),
  memoriesController.getHighlights
);

router.get(
  "/people",
  validateQuery(peopleQuerySchema),
  memoriesController.getPeople
);

router.get(
  "/events",
  validateQuery(eventsQuerySchema),
  memoriesController.getTopEvents
);

router.get(
  "/documents",
  validateQuery(documentsQuerySchema),
  memoriesController.getDocuments
);

router.get(
  "/monthly",
  validateQuery(monthlyQuerySchema),
  memoriesController.getMonthlyMemories
);

router.get(
  "/travel",
  validateQuery(travelQuerySchema),
  memoriesController.getTravelSummary
);

export default router;