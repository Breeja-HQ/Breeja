import { Pool } from "pg";
import { requireEnv } from "../env.js";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
  }
  return pool;
}
