import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@wii/db/client";

/**
 * Shared DB-backed rate limiter. Atomically bumps a per-key counter within a
 * rolling window and reports whether the caller is still under the limit.
 * Used to bound OTP guessing and code-request/email bombing across all
 * serverless instances (in-memory limits don't compose on serverless).
 *
 * Returns { allowed }. Call it BEFORE doing the sensitive work; when it returns
 * allowed:false, reject with 429.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<{ allowed: boolean; count: number }> {
  const windowSec = Math.ceil(windowMs / 1000);
  // Single atomic upsert: reset the window if it's stale, else increment.
  const rows = await db().execute(sql`
    insert into auth_throttle (key, count, window_start)
    values (${key}, 1, now())
    on conflict (key) do update set
      count = case when auth_throttle.window_start < now() - (${windowSec} || ' seconds')::interval
                   then 1 else auth_throttle.count + 1 end,
      window_start = case when auth_throttle.window_start < now() - (${windowSec} || ' seconds')::interval
                   then now() else auth_throttle.window_start end
    returning count
  `);
  const count = Number((rows.rows?.[0] ?? (rows as unknown as { count: number }[])[0])?.count ?? max + 1);
  return { allowed: count <= max, count };
}
