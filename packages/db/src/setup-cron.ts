/**
 * Installs the in-database hold-expiry sweep via pg_cron (Supabase). This is
 * the authoritative expiry mechanism: it releases held inventory from orders
 * that were never paid, every 2 minutes, with no dependency on any external
 * scheduler. Mirrors expireOrder() in packages/api/src/orders.ts exactly
 * (skips orders with a succeeded payment; decrements held_count with a floor;
 * marks holds + order expired). Idempotent — safe to re-run.
 *
 * Run with the DIRECT (session, 5432) connection:
 *   set -a; source ../../apps/web/.env.local; set +a; npx tsx src/setup-cron.ts
 */
import postgres from "postgres";

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("no DB url");
const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  await sql.unsafe(`create extension if not exists pg_cron`);

  await sql.unsafe(`
    create or replace function wii_sweep_expired_orders() returns int
    language plpgsql as $fn$
    declare o record; h record; n int := 0;
    begin
      for o in
        select id from orders
        where status in ('draft','pending_payment') and expires_at < now()
        for update skip locked
      loop
        if exists (select 1 from payments where order_id = o.id and status = 'succeeded') then
          continue;
        end if;
        for h in select id, pool_id, qty from holds where order_id = o.id and status = 'active' loop
          update inventory_pools set held_count = greatest(held_count - h.qty, 0), updated_at = now()
            where id = h.pool_id;
          update holds set status = 'expired' where id = h.id;
        end loop;
        update orders set status = 'expired', expires_at = null, updated_at = now() where id = o.id;
        n := n + 1;
      end loop;
      return n;
    end;
    $fn$;
  `);

  // (Re)schedule every 2 minutes. Unschedule any prior job of the same name first.
  await sql.unsafe(`
    do $do$
    begin
      perform cron.unschedule(jobid) from cron.job where jobname = 'wii-hold-sweep';
    exception when others then null;
    end;
    $do$;
  `);
  await sql.unsafe(`select cron.schedule('wii-hold-sweep', '*/2 * * * *', 'select wii_sweep_expired_orders()')`);

  // Commission maturity: pending → payable once past payable_at (event end +
  // grace). Not time-critical (first maturity is days after each event), so
  // daily at 03:00 UTC is ample. pending→payable is a valid state transition.
  await sql.unsafe(`
    create or replace function wii_mature_commissions() returns int
    language plpgsql as $fn$
    declare n int;
    begin
      update commissions set status = 'payable', updated_at = now()
        where status = 'pending' and payable_at <= now();
      get diagnostics n = row_count;
      return n;
    end;
    $fn$;
  `);
  await sql.unsafe(`
    do $do$
    begin
      perform cron.unschedule(jobid) from cron.job where jobname = 'wii-commission-maturity';
    exception when others then null;
    end;
    $do$;
  `);
  await sql.unsafe(`select cron.schedule('wii-commission-maturity', '0 3 * * *', 'select wii_mature_commissions()')`);

  const jobs = await sql`select jobname, schedule, active from cron.job where jobname like 'wii-%' order by jobname`;
  console.log("scheduled:", JSON.stringify(jobs, null, 1));

  // Immediate one-off run to clear the current backlog of leaked holds.
  const [{ wii_sweep_expired_orders: cleared }] = await sql`select wii_sweep_expired_orders()`;
  console.log(`immediate sweep expired ${cleared} stale orders`);
  await sql.end();
}
main().catch(async (e) => { console.error(e); await sql.end(); process.exit(1); });
