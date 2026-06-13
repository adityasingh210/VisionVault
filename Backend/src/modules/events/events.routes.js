import { Router } from "express";
import * as eventsController from "./events.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import { getEventByIdSchema, getEventImagesSchema } from "./events.validator.js";

const router = Router();
router.use(authenticate);

router.get("/", eventsController.listEvents);
router.post("/rebuild", eventsController.rebuildEvents);
router.get("/:id", validateParams(getEventByIdSchema), eventsController.getEvent);
router.get(
  "/:id/images",
  validateParams(getEventByIdSchema),
  validateQuery(getEventImagesSchema),
  eventsController.getEventImages
);

export default router;
