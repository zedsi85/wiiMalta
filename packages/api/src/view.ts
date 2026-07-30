import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { mintQrToken, signOrderKey } from "@wii/core";
import { expireOrder } from "./orders";

/** Rendered QR tokens live this long; the page refreshes them on reload. */
const QR_RENDER_TTL_MS = 5 * 60 * 1000;

export interface OrderView {
  id: string;
  key: string;
  status: string;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  email: string;
  expiresAt: string | null;
  event: { slug: string; title: string; startAt: string; venue: string };
  lines: { tierName: string; qty: number; unitPriceCents: number; lineTotalCents: number }[];
  tickets: {
    id: string;
    serial: string;
    status: string;
    tierName: string;
    qrToken: string | null;
  }[];
}

export async function getOrderView(orderId: string): Promise<OrderView | null> {
  const d = db();
  let order = await d.query.orders.findFirst({ where: eq(s.orders.id, orderId) });
  if (!order) return null;

  // Lazy expiry (dev has no cron; production adds one, this stays as backstop)
  if (
    (order.status === "draft" || order.status === "pending_payment") &&
    order.expiresAt &&
    order.expiresAt < new Date()
  ) {
    await expireOrder(orderId);
    order = (await d.query.orders.findFirst({ where: eq(s.orders.id, orderId) }))!;
  }

  const [event, lines] = await Promise.all([
    d.query.events.findFirst({ where: eq(s.events.id, order.eventId) }),
    d.select().from(s.orderLines).where(eq(s.orderLines.orderId, order.id)),
  ]);
  const venue = event?.venueId
    ? await d.query.venues.findFirst({ where: eq(s.venues.id, event.venueId) })
    : undefined;
  const tiers = lines.length
    ? await d
        .select()
        .from(s.ticketTiers)
        .where(inArray(s.ticketTiers.id, lines.map((l) => l.tierId)))
    : [];
  const tierName = new Map(tiers.map((t) => [t.id, t.name]));

  const ticketRows = lines.length
    ? await d
        .select()
        .from(s.tickets)
        .where(inArray(s.tickets.orderLineId, lines.map((l) => l.id)))
        .orderBy(asc(s.tickets.serial))
    : [];

  const qrSecret = process.env.QR_SIGNING_SECRET;
  const tickets = ticketRows.map((t) => ({
    id: t.id,
    serial: t.serial,
    status: t.status,
    tierName: tierName.get(t.tierId) ?? "Ticket",
    qrToken:
      t.status === "active" && qrSecret
        ? mintQrToken(
            { ticketId: t.id, qrVersion: t.qrVersion, exp: Date.now() + QR_RENDER_TTL_MS },
            qrSecret
          )
        : null,
  }));

  return {
    id: order.id,
    key: signOrderKey(order.id, process.env.ORDER_LINK_SECRET!),
    status: order.status,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    totalCents: order.totalCents,
    email: order.email,
    expiresAt: order.expiresAt?.toISOString() ?? null,
    event: {
      slug: event?.slug ?? "",
      title: event?.title ?? "",
      startAt: event?.startAt.toISOString() ?? "",
      venue: venue ? `${venue.name} — ${venue.city}` : "TBA",
    },
    lines: lines.map((l) => ({
      tierName: tierName.get(l.tierId) ?? "Ticket",
      qty: l.qty,
      unitPriceCents: l.unitPriceCents,
      lineTotalCents: l.lineTotalCents,
    })),
    tickets,
  };
}
