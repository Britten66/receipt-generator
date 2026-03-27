import { pool, authenticate } from "../_lib.js";

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const result = await pool.query(
      "SELECT * FROM receipts WHERE user_id = $1 ORDER BY created_at DESC",
      [user.id]
    );
    return res.json(result.rows);
  }

  if (req.method === "POST") {
    const { vendor_name, customer_name, status, date, subtotal, tax, total, notes, line_items } = req.body;
    const client = await pool.connect();
    try {
      let receipt = null;
      let attempts = 0;
      while (!receipt && attempts < 5) {
        try {
          await client.query("BEGIN");
          const numRes = await client.query(
            `SELECT COALESCE(MAX(
              CASE WHEN receipt_number ~ '^REC-[0-9]+$'
              THEN CAST(SUBSTRING(receipt_number FROM 5) AS INTEGER)
              ELSE 0 END
            ), 0) + 1 AS next_num FROM receipts WHERE user_id = $1`,
            [user.id]
          );
          const receipt_number = `REC-${String(numRes.rows[0].next_num).padStart(3, "0")}`;
          const r = await client.query(
            `INSERT INTO receipts (vendor_name, customer_name, receipt_number, status, date, subtotal, tax, total, notes, user_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [vendor_name, customer_name, receipt_number, status ?? "draft", date ?? new Date(), subtotal, tax, total, notes ?? null, user.id]
          );
          receipt = r.rows[0];
          if (line_items?.length) {
            for (const item of line_items) {
              await client.query(
                `INSERT INTO line_items (receipt_id, description, quantity, unit_price, total) VALUES ($1,$2,$3,$4,$5)`,
                [receipt.id, item.description, item.quantity, item.unit_price, item.total]
              );
            }
          }
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK").catch(() => {});
          if (err.code === "23505" && attempts < 4) { attempts++; continue; }
          throw err;
        }
      }
      return res.status(201).json(receipt);
    } catch (err) {
      console.error("createReceipt:", err.message);
      return res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
