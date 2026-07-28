import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Runtime DB client (lazy singleton), node-postgres driver.
 *
 * Uses DATABASE_URL — on Supabase that's the TRANSACTION pooler (port 6543);
 * node-postgres works with it as long as we avoid prepared statements (drizzle
 * issues unnamed statements by default). Migrations/DDL use DIRECT_DATABASE_URL
 * via drizzle-kit (session pooler, port 5432).
 *
 * Driver note: postgres.js hangs inside Next.js static-generation build
 * workers (queries never resolve); pg does not. Do not swap back casually.
 */
let _db: ReturnType<typeof create> | null = null;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
  return drizzle(pool, { schema });
}

export function db() {
  return (_db ??= create());
}

export { schema };
