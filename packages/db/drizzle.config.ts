import { defineConfig } from "drizzle-kit";

/**
 * Migrations use the DIRECT (non-pooled) connection — Supabase's transaction
 * pooler cannot run DDL reliably. Runtime queries use DATABASE_URL (pooled).
 * Both come from the environment — never committed.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url:
      process.env.DIRECT_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgres://localhost:5432/wii_dev",
  },
});
