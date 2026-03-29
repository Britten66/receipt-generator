import pool from "../db/pool.js";
import { z } from "zod";

const receiptSchema = z.object({
  vendor_name: z.string().min(1),
  customer_name: z.string().min(1),
  /*
    receipt_number is optional — the UI shows "Auto — REC-000001" as a placeholder
    meaning the user can leave it blank and let the server generate one.
    If they do provide one it must be a non-empty string.
  */
  receipt_number: z.string().min(1).optional(),
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
    const user_id = req.user.id;
    const result = await pool.query(
      "SELECT * FROM receipts WHERE user_id = $1 ORDER BY created_at DESC",
      [user_id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getReceipts:", err.message);
    res.status(500).json({ error: "Failed to fetch receipts" });
  }
};

export const getReceiptById = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    const receipt = await pool.query(
      "SELECT * FROM receipts WHERE id = $1 AND user_id = $2",
      [id, user_id],
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
    const user_id = req.user.id;

    /*
      Strip empty strings for optional fields before Zod sees them.
      The form sends receipt_number: "" when left blank — Zod's .optional()
      allows undefined but NOT empty string, so we convert it here rather
      than fighting the schema.
    */
    const body = { ...req.body };
    if (body.receipt_number === "") delete body.receipt_number;
    if (body.notes === "") delete body.notes;

    const parsed = receiptSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message).join(", ");
      return res.status(400).json({ error: messages || "Invalid receipt data" });
    }

    let {
      vendor_name, customer_name, receipt_number, status, date,
      subtotal, tax, total, notes, line_items,
    } = parsed.data;

    /*
      Auto-generate a receipt number if the user left the field blank.
      Count ALL receipts in the table (not just this user's) because the DB
      has a GLOBAL unique constraint on receipt_number — two users can't share one.
      We prefix with a short user hash to keep numbers readable and avoid clashes.
    */
    if (!receipt_number) {
      const countResult = await pool.query("SELECT COUNT(*) FROM receipts");
      const next = parseInt(countResult.rows[0].count, 10) + 1;
      receipt_number = `REC-${String(next).padStart(6, "0")}`;
    }

    /*
      Walk until we find a number that isn't taken anywhere in the table.
      The constraint is global so we check without filtering by user_id.
      This also covers the case where a user manually typed a number
      that someone else already has.
    */
    let finalNumber = receipt_number;
    let suffix = 1;
    while (true) {
      const exists = await pool.query(
        "SELECT id FROM receipts WHERE receipt_number = $1",
        [finalNumber]
      );
      if (!exists.rows.length) break;
      finalNumber = `${receipt_number}-${suffix}`;
      suffix++;
    }
    receipt_number = finalNumber;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const receiptResult = await client.query(
        `INSERT INTO receipts (vendor_name, customer_name, receipt_number, status, date, subtotal, tax, total, notes, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [vendor_name, customer_name, receipt_number, status ?? "draft",
         date ?? new Date(), subtotal, tax, total, notes ?? null, user_id],
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
      /*
        Postgres error 23505 = unique_violation.
        If the pre-check loop raced with another insert and lost,
        return a clear message instead of a raw DB error.
      */
      if (err.code === "23505") {
        return res.status(409).json({ error: "Receipt number already exists. Please use a different number." });
      }
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
    const user_id = req.user.id;
    const { id } = req.params;

    const parsed = receiptSchema.partial().safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });

    const fields = Object.keys(parsed.data).filter((f) => f !== "line_items");
    if (!fields.length)
      return res.status(400).json({ error: "No fields to update" });

    const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
    const values = fields.map((f) => parsed.data[f]);

    const result = await pool.query(
      `UPDATE receipts SET ${setClauses} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`,
      [...values, id, user_id],
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
    const user_id = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM receipts WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, user_id],
    );

    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteReceipt:", err.message);
    res.status(500).json({ error: "Failed to delete receipt" });
  }
};
