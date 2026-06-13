import { Router } from "express";
import * as categoriesController from "./categories.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams, validateQuery } from "../../middleware/validate.js";
import { getCategoryBySlugSchema, getCategoryImagesSchema } from "./categories.validator.js";

const router = Router();
router.use(authenticate);

router.get("/", categoriesController.listCategories);
router.get(
  "/:slug/images",
  validateParams(getCategoryBySlugSchema),
  validateQuery(getCategoryImagesSchema),
  categoriesController.getCategoryImages
);

export default router;

