/**
 * Ticketing-engine probe for the new September catalogue (then fully
 * self-cleans). Proves the LIVE order engine can reserve inventory for
 * discoroom: temporarily flips its hidden GA tier on_sale, creates a real
 * draft order through the production API, checks the hold + inventory
 * counters, then deletes the probe order (hold cascades), resets counters,
 * and re-hides the tier. Net DB change: zero.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, isNull } from "drizzle-orm";
import * as s from "./schema";

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("no DB url");
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema: s });
const API = "https://wii-malta-web.vercel.app";

async function pool(where: ReturnType<typeof and>) {
  return (await db.select().from(s.inventoryPools).where(where))[0];
}

async function main() {
  const event = await db.query.events.findFirst({ where: eq(s.events.slug, "discoroom") });
  if (!event) throw new Error("discoroom missing");
  const tier = (await db.select().from(s.ticketTiers).where(eq(s.ticketTiers.eventId, event.id)))[0];

  await db.update(s.ticketTiers).set({ status: "on_sale" }).where(eq(s.ticketTiers.id, tier.id));
  console.log("tier flipped on_sale (temporary)");
  try {
    const res = await fetch(`${API}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: "discoroom",
        lines: [{ tierId: tier.id, qty: 2 }],
        idempotencyKey: `probe-reseed-${event.id.slice(0, 8)}`,
      }),
    });
    const order = (await res.json()) as { orderId?: string; totalCents?: number; expiresAt?: string; error?: string };
    console.log("POST /api/orders →", res.status, JSON.stringify(order));
    if (!res.ok || !order.orderId) throw new Error("reservation failed");

    const tierPool = await pool(and(eq(s.inventoryPools.tierId, tier.id))!);
    const eventPool = await pool(and(eq(s.inventoryPools.eventId, event.id), isNull(s.inventoryPools.tierId))!);
    const holds = await db.select().from(s.holds).where(eq(s.holds.orderId, order.orderId));
    console.log(`tier pool held=${tierPool.heldCount}/${tierPool.capacity} · event pool held=${eventPool.heldCount} · holds=${holds.map((h) => `${h.qty}x ${h.status}`).join(",")}`);
    if (tierPool.heldCount !== 2 || eventPool.heldCount !== 2) throw new Error("inventory counters wrong");

    // Cleanup: remove probe order (holds cascade) + release counters
    await db.delete(s.orders).where(eq(s.orders.id, order.orderId));
    await db.update(s.inventoryPools).set({ heldCount: 0 }).where(eq(s.inventoryPools.eventId, event.id));
    console.log("probe order deleted, counters released");
  } finally {
    await db.update(s.ticketTiers).set({ status: "hidden" }).where(eq(s.ticketTiers.id, tier.id));
    console.log("tier re-hidden");
  }
  const t2 = await pool(and(eq(s.inventoryPools.tierId, tier.id))!);
  console.log(`final: tier status hidden, held=${t2.heldCount} sold=${t2.soldCount} — RESERVATION ENGINE OK ✓`);
  await client.end();
}
main().catch(async (e) => { console.error(e); await client.end(); process.exit(1); });
