import { Router } from "express";
import {
  getReceipts,
  getReceiptById,
  createReceipt,
  updateReceipt,
  deleteReceipt,
} from "../controllers/receipts.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", getReceipts);
router.get("/:id", getReceiptById);
router.post("/", createReceipt);
router.patch("/:id", updateReceipt);
router.delete("/:id", deleteReceipt);

export default router;

