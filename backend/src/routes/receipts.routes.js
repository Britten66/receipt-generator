import { Router } from "express";
import {
  getReceipts,
  getReceiptById,
  createReceipt,
  updateReceipt,
  deleteReceipt,
} from "../controllers/receipts.controller.js";
import { validateDeviceId } from "../middleware/auth.middleware.js";

const router = Router();

// Apply device ID validation to all routes
router.use(validateDeviceId);

router.get("/", getReceipts);
router.get("/:id", getReceiptById);
router.post("/", createReceipt);
router.patch("/:id", updateReceipt);
router.delete("/:id", deleteReceipt);

export default router;

