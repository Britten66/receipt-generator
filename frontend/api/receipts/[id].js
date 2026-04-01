import { pool, authenticate } from "../_lib.js";

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const receipt = await pool.query(
        "SELECT * FROM receipts WHERE id = $1 AND user_id = $2",
        [id, user.id]
      );
      if (!receipt.rows.length) return res.status(404).json({ error: "Not found" });
      const items = await pool.query("SELECT * FROM line_items WHERE receipt_id = $1", [id]);
      return res.json({ ...receipt.rows[0], line_items: items.rows });
    } catch (err) {
      console.error("getReceiptById:", err.message);
      return res.status(500).json({ error: "Failed to fetch receipt" });
    }
  }

  if (req.method === "PATCH") {
    try {
      const body = req.body;
      const ALLOWED_FIELDS = ["vendor_name", "customer_name", "status", "date", "subtotal", "tax", "total", "notes", "currency", "receipt_number"];
      const fields = Object.keys(body).filter((f) => ALLOWED_FIELDS.includes(f));
      if (!fields.length) return res.status(400).json({ error: "No fields to update" });
      const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
      const values = fields.map((f) => body[f]);
      const result = await pool.query(
        `UPDATE receipts SET ${setClauses} WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2} RETURNING *`,
        [...values, id, user.id]
      );
      if (!result.rows.length) return res.status(404).json({ error: "Not found" });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error("updateReceipt:", err.message);
      return res.status(500).json({ error: "Failed to update receipt" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const result = await pool.query(
        "DELETE FROM receipts WHERE id = $1 AND user_id = $2 RETURNING *",
        [id, user.id]
      );
      if (!result.rows.length) return res.status(404).json({ error: "Not found" });
      return res.json({ message: "Deleted" });
    } catch (err) {
      console.error("deleteReceipt:", err.message);
      return res.status(500).json({ error: "Failed to delete receipt" });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
