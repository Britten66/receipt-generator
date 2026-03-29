import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function authenticate(req, res) {
  const token = req.headers.authorization?.slice(7);
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return null; }
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) { res.status(401).json({ error: "Unauthorized" }); return null; }
    return user;
  } catch (err) {
    console.error("authenticate:", err.message);
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
}
