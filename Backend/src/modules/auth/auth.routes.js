import { Router } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import { getAuthRateLimiter } from "../../middleware/rateLimiter.js";
import { registerSchema, loginSchema } from "./auth.validator.js";

const router = Router();

router.post("/register", (req, res, next) => getAuthRateLimiter()(req, res, next), validate(registerSchema), authController.register);
router.post("/login", (req, res, next) => getAuthRateLimiter()(req, res, next), validate(loginSchema), authController.login);
router.post("/refresh", (req, res, next) => getAuthRateLimiter()(req, res, next), authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);
router.get("/me", authenticate, authController.me);

export default router;