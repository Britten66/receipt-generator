import pool from "../db/pool.js";

export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM profiles WHERE user_id = $1",
      [req.user.id]
    );
    res.json(result.rows[0] ?? {});
  } catch (err) {
    console.error("getProfile:", err.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const upsertProfile = async (req, res) => {
  try {
    const { business_name, address, email, phone } = req.body;
    const result = await pool.query(
      `INSERT INTO profiles (user_id, business_name, address, email, phone)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE
       SET business_name=$2, address=$3, email=$4, phone=$5
       RETURNING *`,
      [req.user.id, business_name ?? null, address ?? null, email ?? null, phone ?? null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("upsertProfile:", err.message);
    res.status(500).json({ error: "Failed to save profile" });
  }
};
