import { Router } from "express";
import { getProfile, upsertProfile } from "../controllers/profile.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();
router.use(authenticate);
router.get("/", getProfile);
router.put("/", upsertProfile);

export default router;
