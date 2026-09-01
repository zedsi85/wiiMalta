/** Read-only platform state audit — stuck holds, counter drift, ops signals. */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as s from "./schema";

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("no DB url");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema: s });

async function main() {
  const q = async (label: string, query: ReturnType<typeof sql>) => {
    const r = await db.execute(query);
    console.log(`── ${label}`);
    console.table ? console.log(JSON.stringify(r.rows ?? r, null, 1)) : console.log(r);
  };

  await q("orders by status", sql`select status, count(*)::int n from orders group by 1 order by 2 desc`);
  await q("stale open orders (draft/pending past expiry)", sql`
    select id, status, expires_at, created_at from orders
    where status in ('draft','pending_payment') and expires_at < now() limit 10`);
  await q("active holds on expired orders", sql`
    select h.id, h.qty, h.status, o.status order_status, o.expires_at from holds h
    join orders o on o.id = h.order_id
    where h.status = 'active' and (o.expires_at < now() or o.status in ('expired','cancelled')) limit 10`);
  await q("pool counters vs live holds (drift)", sql`
    select p.id, p.tier_id is null as event_wide, p.capacity, p.sold_count, p.held_count,
      coalesce((select sum(h.qty)::int from holds h join orders o on o.id=h.order_id
        where h.status='active' and o.expires_at >= now()
          and (h.tier_id = p.tier_id or (p.tier_id is null and o.event_id = p.event_id))), 0) as live_hold_qty
    from inventory_pools p
    where p.held_count <> coalesce((select sum(h.qty)::int from holds h join orders o on o.id=h.order_id
        where h.status='active' and o.expires_at >= now()
          and (h.tier_id = p.tier_id or (p.tier_id is null and o.event_id = p.event_id))), 0)`);
  await q("sold_count vs actual tickets", sql`
    select p.id, p.tier_id, p.sold_count,
      (select count(*)::int from tickets t where t.tier_id = p.tier_id and t.status in ('issued','active','redeemed')) actual
    from inventory_pools p where p.tier_id is not null
      and p.sold_count <> (select count(*)::int from tickets t where t.tier_id = p.tier_id and t.status in ('issued','active','redeemed'))`);
  await q("commissions pending past payableAt (maturity not flipping?)", sql`
    select count(*)::int n from commissions where status='pending' and payable_at < now()`);
  await q("webhook events by status", sql`select provider, status, count(*)::int n from webhook_events group by 1,2`);
  await q("recent webhook errors", sql`select provider_event_id, type, error, received_at from webhook_events where status='failed' order by received_at desc limit 5`);
  await q("tickets by status", sql`select status, count(*)::int n from tickets group by 1`);
  await q("orders missing tickets_emailed flag (paid but maybe no email)", sql`
    select o.id, o.created_at from orders o where o.status='paid'
      and not exists (select 1 from audit_log a where a.entity_type='order' and a.entity_id=o.id::text and a.action like '%email%') limit 10`);
  await q("events sanity", sql`
    select slug, status, start_at, end_at, timezone from events order by start_at`);
  await q("users count / devices / saved", sql`
    select (select count(*)::int from users) users, (select count(*)::int from devices) devices,
           (select count(*)::int from saved_events) saved, (select count(*)::int from waitlist_entries) waitlist`);
  await client.end();
}
main().catch(async (e) => { console.error(e); await client.end(); process.exit(1); });
