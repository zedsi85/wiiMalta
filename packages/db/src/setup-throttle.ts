/**
 * Creates the auth_throttle table — a shared, DB-backed rate-limit counter for
 * OTP verify and code-request endpoints. Serverless instances don't share
 * memory, so the previous in-memory Map throttles were per-lambda and bypassable
 * under concurrency; this bounds attempts globally per key/window.
 * Deny-all RLS (the app reaches it via the service-role pg driver, which
 * bypasses RLS — matching every other table). Idempotent.
 */
import postgres from "postgres";

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("no DB url");
const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  await sql.unsafe(`
    create table if not exists auth_throttle (
      key text primary key,
      count int not null default 0,
      window_start timestamptz not null default now()
    );
  `);
  await sql.unsafe(`alter table auth_throttle enable row level security`);
  await sql.unsafe(`
    do $do$ begin
      if not exists (select 1 from pg_policies where tablename='auth_throttle' and policyname='deny_all') then
        create policy deny_all on auth_throttle for all using (false) with check (false);
      end if;
    end $do$;
  `);
  console.log("auth_throttle ready");
  await sql.end();
}
main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
