import pool from "../db/pool.js";
import { z } from "zod";

const receiptSchema = z.object({
  vendor_name: z.string().min(1),
  customer_name: z.string().min(1),
  receipt_number: z.string().min(1),
  status: z.enum(["draft", "sent", "paid", "voided"]).optional(),
  date: z.string().optional(),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  total: z.number().min(0),
  notes: z.string().optional(),
  line_items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().min(0),
        unit_price: z.number().min(0),
        total: z.number().min(0),
      }),
    )
    .optional(),
});

export const getReceipts = async (req, res) => {
  try {
    const device_id = req.headers["x-device-id"];
    if (!device_id) return res.status(400).json({ error: "Missing device ID" });

    const result = await pool.query(
      "SELECT * FROM receipts WHERE device_id = $1 ORDER BY created_at DESC",
      [device_id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getReceipts:", err.message);
    res.status(500).json({ error: "Failed to fetch receipts" });
  }
};

export const getReceiptById = async (req, res) => {
  try {
    const device_id = req.headers["x-device-id"];
    const { id } = req.params;

    const receipt = await pool.query(
      "SELECT * FROM receipts WHERE id = $1 AND device_id = $2",
      [id, device_id],
    );
    if (!receipt.rows.length) return res.status(404).json({ error: "Not found" });

    const items = await pool.query(
      "SELECT * FROM line_items WHERE receipt_id = $1",
      [id],
    );

    res.json({ ...receipt.rows[0], line_items: items.rows });
  } catch (err) {
    console.error("getReceiptById:", err.message);
    res.status(500).json({ error: "Failed to fetch receipt" });
  }
};

export const createReceipt = async (req, res) => {
  try {
    const device_id = req.headers["x-device-id"];
    if (!device_id) return res.status(400).json({ error: "Missing device ID" });

    const parsed = receiptSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log("ZOD ERROR:", JSON.stringify(parsed.error.flatten(), null, 2));
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const {
      vendor_name, customer_name, receipt_number, status, date,
      subtotal, tax, total, notes, line_items,
    } = parsed.data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const receiptResult = await client.query(
        `INSERT INTO receipts (vendor_name, customer_name, receipt_number, status, date, subtotal, tax, total, notes, device_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [vendor_name, customer_name, receipt_number, status ?? "draft",
         date ?? new Date(), subtotal, tax, total, notes ?? null, device_id],
      );

      const receipt = receiptResult.rows[0];

      if (line_items?.length) {
        for (const item of line_items) {
          await client.query(
            `INSERT INTO line_items (receipt_id, description, quantity, unit_price, total)
             VALUES ($1,$2,$3,$4,$5)`,
            [receipt.id, item.description, item.quantity, item.unit_price, item.total],
          );
        }
      }

      await client.query("COMMIT");
      res.status(201).json(receipt);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("createReceipt:", err.message);
    res.status(500).json({ error: "Failed to create receipt" });
  }
};

export const updateReceipt = async (req, res) => {
  try {
    const device_id = req.headers["x-device-id"];
    const { id } = req.params;

    const parsed = receiptSchema.partial().safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.flatten() });

    const fields = Object.keys(parsed.data).filter((f) => f !== "line_items");
    if (!fields.length)
      return res.status(400).json({ error: "No fields to update" });

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const values = fields.map((f) => parsed.data[f]);

    const result = await pool.query(
      `UPDATE receipts SET ${setClauses} WHERE id = $${fields.length + 1} AND device_id = $${fields.length + 2} RETURNING *`,
      [...values, id, device_id],
    );

    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("updateReceipt:", err.message);
    res.status(500).json({ error: "Failed to update receipt" });
  }
};

export const deleteReceipt = async (req, res) => {
  try {
    const device_id = req.headers["x-device-id"];
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM receipts WHERE id = $1 AND device_id = $2 RETURNING *",
      [id, device_id],
    );

    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteReceipt:", err.message);
    res.status(500).json({ error: "Failed to delete receipt" });
  }
};
