/**
 * Door E2E probe against the REAL engine (no HTTP, no guard session needed):
 * comp ticket → signed QR → inspect → redeem (admit) → redeem again (duplicate)
 * → wrong-event scoping → unredeem → cleanup. Run with the react-server
 * condition so `server-only` resolves to its empty build:
 *   NODE_OPTIONS=--conditions=react-server npx tsx src/probe-door.ts
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { mintQrToken } from "@wii/core";
import { issueCompTickets } from "./comp";
import { inspectTicket, redeemTicket, unredeemTicket } from "./redeem";

const EMAIL = "door-probe@example.com";
async function main() {
  const d = db();
  const event = (await d.select().from(s.events).where(eq(s.events.slug, "halloween-prison-room")))[0];
  const other = (await d.select().from(s.events).where(eq(s.events.slug, "discoroom")))[0];
  const tier = (await d.select().from(s.ticketTiers).where(eq(s.ticketTiers.eventId, event.id)))[0];
  const owner = (await d.select().from(s.users).where(eq(s.users.email, "zedsi85@gmail.com")))[0];
  const before = (await d.select().from(s.inventoryPools).where(eq(s.inventoryPools.eventId, event.id))).map((p) => p.soldCount);

  await issueCompTickets({ eventId: event.id, tierId: tier.id, email: EMAIL, qty: 1, actorUserId: owner.id });
  const user = (await d.select().from(s.users).where(eq(s.users.email, EMAIL)))[0];
  const ticket = (await d.select().from(s.tickets).where(eq(s.tickets.ownerUserId, user.id)))[0];
  console.log("1 comp ticket minted:", ticket.serial, ticket.status);

  const token = mintQrToken({ ticketId: ticket.id, qrVersion: ticket.qrVersion, exp: Date.now() + 5 * 60_000 }, process.env.QR_SIGNING_SECRET!);
  console.log("2 inspect (scoped to event):", JSON.stringify(await inspectTicket({ tokenOrSerial: token, restrictToEventIds: [event.id] })));
  console.log("3 wrong-event scope:", JSON.stringify(await inspectTicket({ tokenOrSerial: token, restrictToEventIds: [other.id] })));
  const r1 = await redeemTicket({ tokenOrSerial: token, scannerUserId: owner.id, gate: "Main gate", clientScanId: randomUUID(), device: "probe" });
  console.log("4 redeem:", JSON.stringify(r1));
  const r2 = await redeemTicket({ tokenOrSerial: token, scannerUserId: owner.id, gate: "Main gate", clientScanId: randomUUID(), device: "probe" });
  console.log("5 redeem again:", JSON.stringify(r2));
  const replayId = randomUUID();
  await redeemTicket({ tokenOrSerial: token, scannerUserId: owner.id, clientScanId: replayId });
  const r3 = await redeemTicket({ tokenOrSerial: token, scannerUserId: owner.id, clientScanId: replayId });
  console.log("6 offline replay (same clientScanId) idempotent:", JSON.stringify(r3));
  const expired = mintQrToken({ ticketId: ticket.id, qrVersion: ticket.qrVersion, exp: Date.now() - 1000 }, process.env.QR_SIGNING_SECRET!);
  console.log("7 expired token online:", JSON.stringify(await inspectTicket({ tokenOrSerial: expired })));
  const forged = token.slice(0, -4) + "AAAA";
  console.log("8 tampered token:", JSON.stringify(await inspectTicket({ tokenOrSerial: forged })));
  console.log("9 by serial:", JSON.stringify(await inspectTicket({ tokenOrSerial: ticket.serial })));

  await unredeemTicket({ ticketId: ticket.id, actorUserId: owner.id, reason: "probe cleanup" });

  // Cleanup: remove the probe order/ticket entirely and give the comp admission back to inventory
  const order = (await d.select().from(s.orders).where(eq(s.orders.email, EMAIL)))[0];
  await d.delete(s.scanAttempts).where(eq(s.scanAttempts.guardUserId, owner.id)); // probe scans only ran under this actor now
  await d.delete(s.redemptions).where(eq(s.redemptions.ticketId, ticket.id));
  await d.delete(s.ticketEvents).where(eq(s.ticketEvents.ticketId, ticket.id));
  await d.delete(s.tickets).where(eq(s.tickets.id, ticket.id));
  if (order) {
    await d.delete(s.orderLines).where(eq(s.orderLines.orderId, order.id));
    await d.delete(s.orders).where(eq(s.orders.id, order.id));
  }
  for (const p of await d.select().from(s.inventoryPools).where(eq(s.inventoryPools.eventId, event.id))) {
    await d.update(s.inventoryPools).set({ soldCount: Math.max(0, p.soldCount - 1) }).where(eq(s.inventoryPools.id, p.id));
  }
  await d.delete(s.users).where(eq(s.users.id, user.id));
  const after = (await d.select().from(s.inventoryPools).where(eq(s.inventoryPools.eventId, event.id))).map((p) => p.soldCount);
  console.log("10 cleanup: sold_count before", before, "after", after, "(must match)");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
