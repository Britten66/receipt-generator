import { pool, authenticate } from "../_lib.js";

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  if (req.method === "GET") {
    try {
      const result = await pool.query(
        "SELECT * FROM receipts WHERE user_id = $1 ORDER BY created_at DESC",
        [user.id]
      );
      return res.json(result.rows);
    } catch (err) {
      console.error("getReceipts:", err.message);
      return res.status(500).json({ error: "Failed to fetch receipts" });
    }
  }

  if (req.method === "POST") {
    const { vendor_name, customer_name, status, date, subtotal, tax, total, notes, line_items } = req.body;

    if (!vendor_name || !customer_name) {
      return res.status(400).json({ error: "Vendor name and customer name are required" });
    }

    const client = await pool.connect();
    try {
      /*
        Find the highest existing REC-XXXXXX number in the whole table
        (constraint is global, not per user) and increment from there.
      */
      const existing = await client.query("SELECT receipt_number FROM receipts");
      const maxNum = existing.rows.reduce((max, row) => {
        const m = row.receipt_number?.match(/^REC-0*(\d+)$/);
        return m ? Math.max(max, parseInt(m[1], 10)) : max;
      }, 0);

      let receipt = null;
      let attempts = 0;
      while (!receipt && attempts < 10) {
        try {
          await client.query("BEGIN");
          const receipt_number = `REC-${String(maxNum + 1 + attempts).padStart(6, "0")}`;
          const r = await client.query(
            `INSERT INTO receipts (vendor_name, customer_name, receipt_number, status, date, subtotal, tax, total, notes, user_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [vendor_name, customer_name, receipt_number, status ?? "draft", date ?? new Date(), subtotal ?? 0, tax ?? 0, total ?? 0, notes ?? null, user.id]
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
          /* 23505 = unique_violation — number taken, try the next increment */
          if (err.code === "23505" && attempts < 9) { attempts++; continue; }
          throw err;
        }
      }
      return res.status(201).json(receipt);
    } catch (err) {
      console.error("createReceipt:", err.message);
      return res.status(500).json({ error: "Failed to create receipt" });
    } finally {
      client.release();
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
