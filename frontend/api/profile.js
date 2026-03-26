import { pool, authenticate } from "./_lib.js";

export default async function handler(req, res) {
  const user = await authenticate(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const result = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [user.id]);
    return res.json(result.rows[0] ?? {});
  }

  if (req.method === "PUT") {
    const { business_name, address, email, phone } = req.body;
    const result = await pool.query(
      `INSERT INTO profiles (user_id, business_name, address, email, phone)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET business_name=$2, address=$3, email=$4, phone=$5
       RETURNING *`,
      [user.id, business_name ?? null, address ?? null, email ?? null, phone ?? null]
    );
    return res.json(result.rows[0]);
  }

  res.status(405).json({ error: "Method not allowed" });
}
