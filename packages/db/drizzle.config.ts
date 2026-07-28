import { defineConfig } from "drizzle-kit";

/**
 * Migration generation starts in Phase 1 when a Postgres instance exists.
 * DATABASE_URL comes from the environment — never committed.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/wii_dev",
  },
});
