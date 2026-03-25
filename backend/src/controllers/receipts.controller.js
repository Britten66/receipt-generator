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
});

export const getReceipts = async (req, res) => {
  const device_id = req.headers["x-device-id"];
  if (!device_id) return res.status(400).json({ error: "Missing device ID" });

  const result = await pool.query(
    "SELECT * FROM receipts WHERE device_id = $1 ORDER BY created_at DESC",
    [device_id],
  );
  res.json(result.rows);
};

export const getReceiptById = async (req, res) => {
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
};

export const createReceipt = async (req, res) => {
  const device_id = req.headers["x-device-id"];
  if (!device_id) return res.status(400).json({ error: "Missing device ID" });

  const parsed = receiptSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const {
    vendor_name,
    customer_name,
    receipt_number,
    status,
    date,
    subtotal,
    tax,
    total,
    notes,
  } = parsed.data;

  const result = await pool.query(
    `INSERT INTO receipts (vendor_name, customer_name, receipt_number, status, date, subtotal, tax, total, notes, device_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      vendor_name,
      customer_name,
      receipt_number,
      status ?? "draft",
      date ?? new Date(),
      subtotal,
      tax,
      total,
      notes ?? null,
      device_id,
    ],
  );

  res.status(201).json(result.rows[0]);
};

export const updateReceipt = async (req, res) => {
  const device_id = req.headers["x-device-id"];
  const { id } = req.params;

  const parsed = receiptSchema.partial().safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const fields = Object.keys(parsed.data);
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
};

export const deleteReceipt = async (req, res) => {
  const device_id = req.headers["x-device-id"];
  const { id } = req.params;

  const result = await pool.query(
    "DELETE FROM receipts WHERE id = $1 AND device_id = $2 RETURNING *",
    [id, device_id],
  );

  if (!result.rows.length) return res.status(404).json({ error: "Not found" });
  res.json({ message: "Deleted" });
};
