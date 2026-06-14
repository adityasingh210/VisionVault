import { Router } from "express";
import * as imagesController from "./images.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { uploadSingle, uploadMultiple } from "../../middleware/upload.js";
import {uploadRateLimiter,searchRateLimiter,} from "../../middleware/rateLimiter.js";
import { validate, validateQuery, validateParams } from "../../middleware/validate.js";
import {
  getImagesSchema,
  getImageByIdSchema,
  bulkDeleteSchema,
  getImageStatusSchema,
  ocrSearchSchema,
} from "./images.validator.js";

const router = Router();
router.use(authenticate);
router.post(
  "/upload",
   uploadRateLimiter,
  uploadSingle("image"),
  imagesController.uploadSingle
);

router.post(
  "/upload/batch",
  uploadRateLimiter,
  uploadMultiple("images", 20),
  imagesController.uploadBatch
);
router.get(
  "/search/ocr",
  searchRateLimiter,
  validateQuery(ocrSearchSchema),
  imagesController.searchByOcr
);
router.delete(
  "/bulk",
  validate(bulkDeleteSchema),
  imagesController.bulkDeleteImages
);
router.get(
  "/",
  validateQuery(getImagesSchema),
  imagesController.listImages
);

router.get(
  "/:id",
  validateParams(getImageByIdSchema),
  imagesController.getImage
);

router.get(
  "/:id/status",
  validateParams(getImageStatusSchema),
  imagesController.getImageProcessingStatus
);

router.delete(
  "/:id",
  validateParams(getImageByIdSchema),
  imagesController.deleteImage
);

export default router;
