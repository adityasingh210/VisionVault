
import { Router } from "express";
import * as facesController from "./faces.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validateParams } from "../../middleware/validate.js";
import { getFaceClusterByIdSchema } from "./faces.validator.js";

const router = Router();
router.use(authenticate);
router.get("/clusters", facesController.listClusters);
router.get(
  "/clusters/:id",
  validateParams(getFaceClusterByIdSchema),
  facesController.getCluster
);

export default router;

