import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  host: "aws-1-ca-central-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.qajcynqmjtlzofoyklyp",
  password: process.env.DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

export default pool;
