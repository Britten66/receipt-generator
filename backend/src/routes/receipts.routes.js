import { Router } from "express";
import {
  getReceipts,
  getReceiptById,
  createReceipt,
  updateReceipt,
  deleteReceipt,
} from "../controllers/receipts.controller.js";

const router = Router();

router.get("/", getReceipts);
router.get("/:id", getReceiptById);
router.post("/", createReceipt);
router.put("/:id", updateReceipt);
router.delete("/:id", deleteReceipt);

export default router;
