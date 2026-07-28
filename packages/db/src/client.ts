import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Runtime DB client (lazy singleton).
 *
 * Uses DATABASE_URL — on Supabase that's the TRANSACTION pooler (port 6543),
 * which requires `prepare: false` (prepared statements don't survive
 * transaction-mode pooling). Migrations/DDL use DIRECT_DATABASE_URL via
 * drizzle-kit instead (session pooler, port 5432).
 */
let _db: ReturnType<typeof create> | null = null;

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
  });
  return drizzle(client, { schema });
}

export function db() {
  return (_db ??= create());
}

export { schema };
