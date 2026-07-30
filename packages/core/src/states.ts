/**
 * Wii Event OS — domain state machines (types + transition tables).
 *
 * Mirrors docs/architecture/state-machines.md — that document is the spec;
 * this module is its executable shape. Services must consult `canTransition`
 * before flipping any status column, so illegal transitions fail loudly in
 * every client of @wii/core rather than by convention alone.
 */

/* ---------------- Order ---------------- */

export const ORDER_STATUSES = [
  "draft",
  "pending_payment",
  "paid",
  "partially_refunded",
  "refunded",
  "cancelled",
  "expired",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["pending_payment", "cancelled", "expired"],
  pending_payment: ["paid", "expired"],
  paid: ["partially_refunded", "refunded"],
  partially_refunded: ["refunded"],
  refunded: [],
  cancelled: [],
  expired: [],
};

/* ---------------- Ticket ---------------- */

export const TICKET_STATUSES = [
  "issued",
  "active",
  "redeemed",
  "revoked",
  "transferred",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

const TICKET_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  issued: ["active", "revoked"],
  active: ["redeemed", "revoked", "transferred"],
  // "un-redeem": manager-gated door-mistake correction (T4 in the spec)
  redeemed: ["active"],
  revoked: [],
  transferred: [],
};

/* ---------------- Hold ---------------- */

export const HOLD_STATUSES = ["active", "converted", "released", "expired"] as const;
export type HoldStatus = (typeof HOLD_STATUSES)[number];

const HOLD_TRANSITIONS: Record<HoldStatus, readonly HoldStatus[]> = {
  active: ["converted", "released", "expired"],
  converted: [],
  released: [],
  expired: [],
};

/* ---------------- Commission ---------------- */

export const COMMISSION_STATUSES = [
  "pending", // PENDING
  "payable", // LOCKED (matured, awaiting approval)
  "approved", // APPROVED (queued for payout)
  "processing", // PROCESSING (payout run in flight)
  "paid", // PAID
  "rejected", // REJECTED (admin declined)
  "clawed_back", // REFUNDED (source order refunded)
  "void", // CANCELLED (fraud / manual)
] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

/** Display labels for the affiliate-facing lifecycle names. */
export const COMMISSION_LABELS: Record<CommissionStatus, string> = {
  pending: "pending",
  payable: "locked",
  approved: "approved",
  processing: "processing",
  paid: "paid",
  rejected: "rejected",
  clawed_back: "refunded",
  void: "cancelled",
};

const COMMISSION_TRANSITIONS: Record<CommissionStatus, readonly CommissionStatus[]> = {
  pending: ["payable", "clawed_back", "void"],
  payable: ["approved", "rejected", "clawed_back", "void"],
  approved: ["processing", "paid", "rejected", "clawed_back"],
  processing: ["paid", "approved"], // back to approved = run rollback
  paid: ["clawed_back"], // post-payout clawback carries a negative balance forward
  rejected: [],
  clawed_back: [],
  void: [],
};

/* ---------------- Event ---------------- */

export const EVENT_STATUSES = [
  "draft",
  "published",
  "cancelled",
  "completed",
  "archived",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

const EVENT_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  draft: ["published"],
  published: ["cancelled", "completed"],
  completed: ["archived"],
  cancelled: [],
  archived: [],
};

/* ---------------- Generic guard ---------------- */

const TABLES = {
  order: ORDER_TRANSITIONS,
  ticket: TICKET_TRANSITIONS,
  hold: HOLD_TRANSITIONS,
  commission: COMMISSION_TRANSITIONS,
  event: EVENT_TRANSITIONS,
} as const;

export type Machine = keyof typeof TABLES;

export function canTransition<M extends Machine>(
  machine: M,
  from: string,
  to: string
): boolean {
  const table = TABLES[machine] as Record<string, readonly string[]>;
  return table[from]?.includes(to) ?? false;
}

/** Throwing variant for service-layer use. */
export function assertTransition<M extends Machine>(
  machine: M,
  from: string,
  to: string
): void {
  if (!canTransition(machine, from, to)) {
    throw new Error(`illegal ${machine} transition: ${from} → ${to}`);
  }
}
