/**
 * Wii Event OS — canonical database schema (Drizzle ORM / Postgres).
 *
 * DESIGN DOC — lives in docs/ until Phase 0 creates packages/db, then this file
 * moves there verbatim and becomes the source of migrations.
 *
 * Ground rules encoded here (see docs/architecture/state-machines.md):
 *  1. Every domain table carries organizer_id — multi-tenant from migration 001.
 *  2. Money is integer cents + currency code. No floats, no "€95" strings.
 *  3. Orders/tickets/holds/commissions are state machines; status columns only
 *     change through service-layer transitions that also write audit rows.
 *  4. Inventory safety is DB-enforced (check constraint + row locks), not
 *     application-hoped.
 *  5. PII lives on `users` (erasable); transactional rows survive GDPR erasure.
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  smallint,
  uniqueIndex,
  index,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";

/* ================================================================== */
/* Enums                                                              */
/* ================================================================== */

export const platformRole = pgEnum("platform_role", ["user", "platform_admin"]);

export const orgMemberRole = pgEnum("org_member_role", [
  "owner", // full control incl. finance, members
  "manager", // event CRUD, refunds, comps, ambassador approval
  "scanner", // redeem only, scoped per event via scanner_assignments
]);

export const organizerStatus = pgEnum("organizer_status", [
  "active",
  "onboarding", // Stripe Connect not yet complete — cannot publish paid events
  "suspended",
]);

export const eventStatus = pgEnum("event_status", [
  "draft",
  "published",
  "cancelled",
  "completed", // set by job after end_at; gates commission payability
  "archived",
]);

export const tierStatus = pgEnum("tier_status", [
  "on_sale",
  "hidden", // exists but not purchasable (unreleased phase, secret tier)
  "paused", // temporarily pulled by organizer
  "sold_out", // derived, denormalized for listing queries
]);

export const orderStatus = pgEnum("order_status", [
  "draft", // cart with holds, no payment attempt yet
  "pending_payment", // PaymentIntent created / 3DS in flight
  "paid",
  "partially_refunded",
  "refunded",
  "cancelled", // user abandoned explicitly, or admin void (pre-payment)
  "expired", // holds lapsed before payment succeeded
]);

export const paymentStatus = pgEnum("payment_status", [
  "created",
  "requires_action", // 3DS / SCA challenge
  "processing",
  "succeeded",
  "failed",
]);

export const refundStatus = pgEnum("refund_status", [
  "pending",
  "succeeded",
  "failed",
]);

export const ticketStatus = pgEnum("ticket_status", [
  "issued", // minted inside the finalize txn, delivery not yet confirmed
  "active", // delivered & valid — the normal resting state
  "redeemed",
  "revoked", // refund, fraud, admin action — QR material invalidated
  "transferred", // terminal for this row; lineage points to successor ticket
]);

export const holdStatus = pgEnum("hold_status", [
  "active",
  "converted", // became sold inventory in the finalize txn
  "released", // user backed out / order cancelled
  "expired", // TTL sweep reclaimed it
]);

export const ambassadorStatus = pgEnum("ambassador_status", [
  "applied",
  "approved",
  "suspended",
  "rejected",
  "verified", // approved + identity/payment verified
]);

export const referralCodeStatus = pgEnum("referral_code_status", [
  "active",
  "paused",
  "retired",
]);

export const commissionStatus = pgEnum("commission_status", [
  "pending", // PENDING — order paid; inside refund window
  "payable", // LOCKED — matured (event end + grace); awaiting admin approval
  "paid", // PAID — included in a settled payout
  "clawed_back", // REFUNDED — source order refunded after accrual
  "void", // CANCELLED — fraud / manual invalidation
  "approved", // APPROVED — admin-approved for the next payout run
  "processing", // PROCESSING — payout run in flight
  "rejected", // REJECTED — admin declined
]);

export const paymentMethodKind = pgEnum("payment_method_kind", [
  "iban",
  "bank_transfer",
  "revolut",
  "paypal",
  "wise",
  "crypto", // future
]);

export const payoutStatus = pgEnum("payout_status", [
  "pending",
  "processing",
  "paid",
  "failed",
]);

export const devicePlatform = pgEnum("device_platform", ["ios", "android", "web"]);

export const webhookStatus = pgEnum("webhook_status", [
  "received",
  "processed",
  "failed",
  "skipped", // duplicate / irrelevant event type
]);

/* ================================================================== */
/* Identity                                                           */
/* ================================================================== */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Auth-provider subject (Supabase/Clerk uid). Null for guest shadow accounts. */
    authProviderId: text("auth_provider_id").unique(),
    email: text("email").notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    phone: text("phone"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    platformRole: platformRole("platform_role").notNull().default("user"),
    /** True until a guest checkout account is claimed via magic link. */
    isGuest: boolean("is_guest").notNull().default(false),
    marketingConsentAt: timestamp("marketing_consent_at", { withTimezone: true }),
    /** GDPR erasure: PII columns nulled + this stamped; row survives for FK integrity. */
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One live account per email (anonymized rows freed from the constraint).
    uniqueIndex("users_email_live_uq").on(t.email).where(sql`${t.anonymizedAt} IS NULL`),
  ]
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    platform: devicePlatform("platform").notNull(),
    /** Expo push token; null for web (web push handled separately if ever). */
    pushToken: text("push_token"),
    appVersion: text("app_version"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("devices_push_token_uq").on(t.pushToken), index("devices_user_idx").on(t.userId)]
);

/* ================================================================== */
/* Organizers & tenancy                                               */
/* ================================================================== */

export const organizers = pgTable("organizers", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  /** Stripe Connect account (acct_…). Null until onboarding completes. */
  stripeAccountId: text("stripe_account_id").unique(),
  status: organizerStatus("status").notNull().default("onboarding"),
  /** Platform application fee taken per ticket, basis points (e.g. 500 = 5%). */
  platformFeeBps: smallint("platform_fee_bps").notNull().default(500),
  /** Default ambassador commission unless overridden per profile/code. */
  defaultCommissionBps: smallint("default_commission_bps").notNull().default(1000),
  defaultCurrency: text("default_currency").notNull().default("EUR"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizerMembers = pgTable(
  "organizer_members",
  {
    organizerId: uuid("organizer_id").notNull().references(() => organizers.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: orgMemberRole("role").notNull(),
    invitedBy: uuid("invited_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizerId, t.userId] }), index("org_members_user_idx").on(t.userId)]
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city").notNull(),
    country: text("country").notNull().default("MT"),
    lat: text("lat"), // stored as text to avoid float drift; parsed at edge
    lng: text("lng"),
    maxCapacity: integer("max_capacity"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("venues_org_idx").on(t.organizerId)]
);

/* ================================================================== */
/* Catalog                                                            */
/* ================================================================== */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
    venueId: uuid("venue_id").references(() => venues.id),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    status: eventStatus("status").notNull().default("draft"),
    /** All times UTC; tz is the venue-local zone for display ("Europe/Malta"). */
    timezone: text("timezone").notNull().default("Europe/Malta"),
    doorsAt: timestamp("doors_at", { withTimezone: true }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    currency: text("currency").notNull().default("EUR"),
    ageRestriction: smallint("age_restriction"), // e.g. 17, 18, 21; null = none
    isUnlisted: boolean("is_unlisted").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("events_org_idx").on(t.organizerId),
    index("events_discovery_idx").on(t.status, t.startAt),
  ]
);

/**
 * Publishable content snapshot. Editing a draft bumps the working version;
 * `isLive` flips atomically on publish so paid customers always saw a coherent
 * page. Genres/lineup summary duplicated here for the listing card.
 */
export const eventContent = pgTable(
  "event_content",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    isLive: boolean("is_live").notNull().default(false),
    blurb: text("blurb"),
    description: text("description"),
    /** Editorial format label shown on cards ("Cave", "Fort", "Rooftop"…). */
    kind: text("kind"),
    /** Editorial availability badge override ("earlybird"); derived states (soldout/limited) come from inventory. */
    badge: text("badge"),
    genres: jsonb("genres").$type<string[]>().notNull().default([]),
    /** Poster/hero media object keys (R2/S3), tint fallback while art loads. */
    media: jsonb("media").$type<{ posterKey?: string; heroKey?: string; tint?: string }>(),
    info: jsonb("info").$type<[string, string][]>().notNull().default([]),
    faq: jsonb("faq").$type<[string, string][]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("event_content_version_uq").on(t.eventId, t.version),
    // exactly one live version per event
    uniqueIndex("event_content_live_uq").on(t.eventId).where(sql`${t.isLive} = true`),
  ]
);

export const eventLineup = pgTable(
  "event_lineup",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"), // "Headliner", "Resident", "Live"
    country: text("country"),
    setTime: text("set_time"), // display string, venue-local ("01:30 – 03:00")
    isHeadliner: boolean("is_headliner").notNull().default(false),
    sort: smallint("sort").notNull().default(0),
  },
  (t) => [index("lineup_event_idx").on(t.eventId)]
);

export const ticketTiers = pgTable(
  "ticket_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    organizerId: uuid("organizer_id").notNull().references(() => organizers.id), // denorm: tenancy guard
    name: text("name").notNull(), // "General Admission", "VIP Terrace"
    note: text("note"),
    perks: jsonb("perks").$type<string[]>().notNull().default([]),
    isVip: boolean("is_vip").notNull().default(false),
    status: tierStatus("status").notNull().default("hidden"),
    maxPerOrder: smallint("max_per_order").notNull().default(8),
    sort: smallint("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tiers_event_idx").on(t.eventId)]
);

/**
 * Pricing phases ("Early Bird — Phase 2 of 4"). A phase is current when
 * now ∈ [startsAt, endsAt) AND (allocation null OR soldCount < allocation).
 * Order lines lock the phase id + unit price at draft time — a phase rolling
 * over mid-checkout never changes what the buyer was shown.
 */
export const pricePhases = pgTable(
  "price_phases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tierId: uuid("tier_id").notNull().references(() => ticketTiers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** Optional quantity trigger: phase exhausts after N sold at this price. */
    allocation: integer("allocation"),
    soldCount: integer("sold_count").notNull().default(0),
    sort: smallint("sort").notNull().default(0),
  },
  (t) => [
    index("phases_tier_idx").on(t.tierId),
    check("phases_price_nonneg", sql`${t.priceCents} >= 0`),
  ]
);

/* ================================================================== */
/* Inventory — the oversell firewall                                  */
/* ================================================================== */

/**
 * One pool per tier (tierId set) plus optionally one event-wide pool
 * (tierId null) capping total venue admission across tiers. Counters are
 * mutated only inside SELECT … FOR UPDATE transactions; the check constraint
 * is the last line of defense — an oversell bug becomes a failed txn, not a
 * sold ticket.
 */
export const inventoryPools = pgTable(
  "inventory_pools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    tierId: uuid("tier_id").references(() => ticketTiers.id, { onDelete: "cascade" }),
    capacity: integer("capacity").notNull(),
    soldCount: integer("sold_count").notNull().default(0),
    heldCount: integer("held_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("pools_tier_uq").on(t.tierId),
    uniqueIndex("pools_event_wide_uq").on(t.eventId).where(sql`${t.tierId} IS NULL`),
    check("pools_no_oversell", sql`${t.soldCount} + ${t.heldCount} <= ${t.capacity}`),
    check("pools_counts_nonneg", sql`${t.soldCount} >= 0 AND ${t.heldCount} >= 0`),
  ]
);

export const holds = pgTable(
  "holds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    poolId: uuid("pool_id").notNull().references(() => inventoryPools.id),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    tierId: uuid("tier_id").notNull().references(() => ticketTiers.id),
    qty: smallint("qty").notNull(),
    status: holdStatus("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("holds_order_idx").on(t.orderId),
    // sweep job scans this: active holds past expiry
    index("holds_expiry_idx").on(t.status, t.expiresAt),
    check("holds_qty_pos", sql`${t.qty} > 0`),
  ]
);

/* ================================================================== */
/* Orders & payments                                                  */
/* ================================================================== */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
    eventId: uuid("event_id").notNull().references(() => events.id),
    /** Nullable: guest checkout creates the shadow user during finalize. */
    userId: uuid("user_id").references(() => users.id),
    /** Buyer email captured at checkout; survives account anonymization rules. */
    email: text("email").notNull(),
    status: orderStatus("status").notNull().default("draft"),
    currency: text("currency").notNull(),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    feesCents: integer("fees_cents").notNull().default(0), // booking fee shown to buyer
    totalCents: integer("total_cents").notNull().default(0),
    refundedCents: integer("refunded_cents").notNull().default(0),
    /** Client-generated; dedupes create-order retries. */
    idempotencyKey: text("idempotency_key").notNull(),
    /** Referral candidate captured from the wii_ref cookie at draft time;
     *  locked into referral_attributions only at payment success. */
    candidateReferralCodeId: uuid("candidate_referral_code_id"),
    /** Mirrors the holds' TTL while draft/pending; null once terminal. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    placedAt: timestamp("placed_at", { withTimezone: true }), // payment attempt started
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_idem_uq").on(t.idempotencyKey),
    index("orders_user_idx").on(t.userId, t.createdAt),
    index("orders_event_idx").on(t.eventId, t.status),
    index("orders_org_idx").on(t.organizerId, t.createdAt),
    check("orders_totals_nonneg", sql`${t.totalCents} >= 0 AND ${t.refundedCents} >= 0`),
  ]
);

export const orderLines = pgTable(
  "order_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    tierId: uuid("tier_id").notNull().references(() => ticketTiers.id),
    /** Price locked at draft time — the anti-"phase rolled over" guarantee. */
    pricePhaseId: uuid("price_phase_id").notNull().references(() => pricePhases.id),
    qty: smallint("qty").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    unitFeeCents: integer("unit_fee_cents").notNull().default(0),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [
    index("order_lines_order_idx").on(t.orderId),
    check("order_lines_qty_pos", sql`${t.qty} > 0`),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    /** "revolut" | "mock" (dev) | future rails. */
    provider: text("provider").notNull().default("revolut"),
    /** Provider-side order/intent id (Revolut order id). */
    providerOrderId: text("provider_order_id").notNull().unique(),
    /** Provider-side payment/charge id, once known. */
    providerPaymentId: text("provider_payment_id"),
    status: paymentStatus("status").notNull().default("created"),
    amountCents: integer("amount_cents").notNull(),
    /** Wii's cut on Connect destination charges. */
    applicationFeeCents: integer("application_fee_cents").notNull().default(0),
    lastErrorCode: text("last_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId)]
);

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    paymentId: uuid("payment_id").notNull().references(() => payments.id),
    providerRefundId: text("provider_refund_id").unique(),
    amountCents: integer("amount_cents").notNull(),
    reason: text("reason").notNull(), // required — this is a fraud surface
    status: refundStatus("status").notNull().default("pending"),
    initiatedBy: uuid("initiated_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("refunds_order_idx").on(t.orderId)]
);

/* ================================================================== */
/* Wallet — tickets                                                   */
/* ================================================================== */

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
    eventId: uuid("event_id").notNull().references(() => events.id),
    orderLineId: uuid("order_line_id").notNull().references(() => orderLines.id),
    ownerUserId: uuid("owner_user_id").notNull().references(() => users.id),
    tierId: uuid("tier_id").notNull().references(() => ticketTiers.id),
    /** Human-readable short code printed on the ticket ("WII-7K2M-9QF3"). */
    serial: text("serial").notNull().unique(),
    status: ticketStatus("status").notNull().default("issued"),
    /**
     * QR signing: tokens are HMAC(kid, ticketId · qrVersion · exp). Bumping
     * qrVersion (on transfer/revoke/re-delivery) invalidates everything
     * previously rendered, including screenshots.
     */
    qrVersion: integer("qr_version").notNull().default(1),
    transferredFromTicketId: uuid("transferred_from_ticket_id"),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    index("tickets_owner_idx").on(t.ownerUserId, t.status),
    index("tickets_event_idx").on(t.eventId, t.status),
    index("tickets_order_line_idx").on(t.orderLineId),
  ]
);

/** Append-only lifecycle log; the ticket's audit trail for door disputes. */
export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    ticketId: uuid("ticket_id").notNull().references(() => tickets.id),
    type: text("type").notNull(), // issued|delivered|qr_rotated|transfer_*|revoked|redeemed|unredeemed
    actorUserId: uuid("actor_user_id").references(() => users.id), // null = system/job
    data: jsonb("data"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ticket_events_ticket_idx").on(t.ticketId, t.createdAt)]
);

export const ticketTransfers = pgTable(
  "ticket_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id").notNull().references(() => tickets.id),
    fromUserId: uuid("from_user_id").notNull().references(() => users.id),
    /** Recipient may not have an account yet — invite by email. */
    toEmail: text("to_email").notNull(),
    toUserId: uuid("to_user_id").references(() => users.id),
    /** Ticket row minted for the recipient when accepted. */
    newTicketId: uuid("new_ticket_id").references(() => tickets.id),
    status: text("status").notNull().default("pending"), // pending|accepted|cancelled|expired
    claimToken: text("claim_token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("transfers_ticket_idx").on(t.ticketId)]
);

/* ================================================================== */
/* Check-in                                                           */
/* ================================================================== */

/** Per-event scanner scope: door staff hired for one night. */
export const scannerAssignments = pgTable(
  "scanner_assignments",
  {
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    gate: text("gate"), // optional fixed gate label
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })]
);

export const redemptions = pgTable(
  "redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id").notNull().references(() => tickets.id),
    eventId: uuid("event_id").notNull().references(() => events.id),
    scannerUserId: uuid("scanner_user_id").notNull().references(() => users.id),
    gate: text("gate"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull(), // device clock
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
    wasOffline: boolean("was_offline").notNull().default(false),
    /** Device-generated UUID — idempotency for offline replay. */
    clientScanId: uuid("client_scan_id").notNull().unique(),
    /** Scanner device descriptor (user agent short form). */
    device: text("device"),
    /** Optional geolocation "lat,lng" captured at scan time. */
    location: text("location"),
  },
  (t) => [
    // one successful redemption per ticket, ever
    uniqueIndex("redemptions_ticket_uq").on(t.ticketId),
    index("redemptions_event_idx").on(t.eventId, t.scannedAt),
  ]
);

/**
 * Door telemetry — every scan attempt (including rejects and duplicate
 * flags), powering guard/day statistics. Successful admissions ALSO write a
 * `redemptions` row (source of truth); this table is analytics-grade.
 */
export const scanAttempts = pgTable(
  "scan_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guardUserId: uuid("guard_user_id").notNull().references(() => users.id),
    eventId: uuid("event_id").references(() => events.id),
    ticketId: uuid("ticket_id"),
    /** admitted | duplicate | invalid | revoked | expired_qr | wrong_version | not_active | wrong_event | queued_sync */
    result: text("result").notNull(),
    device: text("device"),
    clientScanId: text("client_scan_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("scan_attempts_guard_idx").on(t.guardUserId, t.createdAt),
    index("scan_attempts_event_idx").on(t.eventId, t.createdAt),
  ]
);

/* ================================================================== */
/* Referrals — ambassador program                                     */
/* ================================================================== */

export const ambassadorProfiles = pgTable(
  "ambassador_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
    status: ambassadorStatus("status").notNull().default("applied"),
    /** Overrides organizer default; per-code override trumps both. */
    commissionBps: smallint("commission_bps"),
    /** Flat bonus added per attributed order at accrual time. */
    fixedBonusCents: integer("fixed_bonus_cents").notNull().default(0),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ambassador_user_org_uq").on(t.userId, t.organizerId)]
);

export const referralCodes = pgTable(
  "referral_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ambassadorId: uuid("ambassador_id").notNull().references(() => ambassadorProfiles.id),
    organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
    /** Human/short code used in links: wii.mt/e/slug?ref=SARA10 */
    code: text("code").notNull(),
    /** Null = valid for all of the organizer's events. */
    eventId: uuid("event_id").references(() => events.id),
    commissionBpsOverride: smallint("commission_bps_override"),
    status: referralCodeStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("referral_codes_code_uq").on(sql`lower(${t.code})`),
    index("referral_codes_ambassador_idx").on(t.ambassadorId),
  ]
);

/**
 * Written exactly once, inside the finalize txn of a paid order. Never
 * recomputed — commission disputes are settled by this row.
 */
export const referralAttributions = pgTable(
  "referral_attributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id).unique(),
    codeId: uuid("code_id").notNull().references(() => referralCodes.id),
    ambassadorId: uuid("ambassador_id").notNull().references(() => ambassadorProfiles.id),
    source: text("source").notNull().default("link"), // link|manual|app_share
    lockedAt: timestamp("locked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attributions_ambassador_idx").on(t.ambassadorId)]
);

export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attributionId: uuid("attribution_id").notNull().references(() => referralAttributions.id).unique(),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    ambassadorId: uuid("ambassador_id").notNull().references(() => ambassadorProfiles.id),
    organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
    /** Snapshot of the resolved bps at accrual time. */
    rateBps: smallint("rate_bps").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: commissionStatus("status").notNull().default("pending"),
    /** pending → payable eligible after this instant (event end + grace). */
    payableAt: timestamp("payable_at", { withTimezone: true }).notNull(),
    payoutId: uuid("payout_id").references(() => payouts.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("commissions_ambassador_idx").on(t.ambassadorId, t.status),
    index("commissions_payable_idx").on(t.status, t.payableAt),
  ]
);

export const payouts = pgTable(
  "payouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ambassadorId: uuid("ambassador_id").notNull().references(() => ambassadorProfiles.id),
    organizerId: uuid("organizer_id").notNull().references(() => organizers.id),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    method: text("method").notNull().default("sepa"), // sepa|revolut|manual
    reference: text("reference"),
    status: payoutStatus("status").notNull().default("pending"),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payouts_ambassador_idx").on(t.ambassadorId)]
);

/**
 * Ambassador payment details — encrypted at rest (AES-256-GCM via
 * PAYMENT_ENC_KEY; @wii/core encryptJson). Plaintext never touches the DB;
 * `displayHint` is the masked label shown in UIs. One active method per
 * ambassador (partial unique index).
 */
export const ambassadorPaymentMethods = pgTable(
  "ambassador_payment_methods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ambassadorId: uuid("ambassador_id").notNull().references(() => ambassadorProfiles.id),
    kind: paymentMethodKind("kind").notNull(),
    /** v1.<iv>.<ciphertext>.<tag> — AES-256-GCM envelope. */
    detailsEncrypted: text("details_encrypted").notNull(),
    /** Masked, safe-to-render label, e.g. "IBAN ····4402" or "PayPal s···@x.com". */
    displayHint: text("display_hint").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payment_methods_active_uq")
      .on(t.ambassadorId)
      .where(sql`${t.isActive} = true`),
    index("payment_methods_ambassador_idx").on(t.ambassadorId),
  ]
);

/** Referral link visits — the top of the conversion funnel (set by /api/ref). */
export const referralVisits = pgTable(
  "referral_visits",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    codeId: uuid("code_id").notNull().references(() => referralCodes.id),
    ambassadorId: uuid("ambassador_id").notNull().references(() => ambassadorProfiles.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("referral_visits_amb_idx").on(t.ambassadorId, t.createdAt)]
);

/** Saved/favorited events (mobile + web wishlists). */
export const savedEvents = pgTable(
  "saved_events",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.eventId] })]
);

/* ================================================================== */
/* Waitlist                                                           */
/* ================================================================== */

export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    tierId: uuid("tier_id").references(() => ticketTiers.id),
    email: text("email").notNull(),
    userId: uuid("user_id").references(() => users.id),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    convertedOrderId: uuid("converted_order_id").references(() => orders.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("waitlist_uq").on(t.eventId, t.email)]
);

/* ================================================================== */
/* Platform plumbing                                                  */
/* ================================================================== */

/** Inbound webhook dedup + processing ledger (Stripe first; extensible). */
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("stripe"),
    providerEventId: text("provider_event_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    status: webhookStatus("status").notNull().default("received"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("webhook_provider_event_uq").on(t.provider, t.providerEventId)]
);

/** QR signing key ring — rotate by adding a new kid; verify against any un-retired key. */
export const signingKeys = pgTable("signing_keys", {
  kid: text("kid").primaryKey(),
  /** Reference into the secrets vault — never the secret itself. */
  secretRef: text("secret_ref").notNull(),
  activeFrom: timestamp("active_from", { withTimezone: true }).notNull().defaultNow(),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
});

/** Append-only. No UPDATE/DELETE grants on this table for the app role. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    actorUserId: uuid("actor_user_id").references(() => users.id), // null = system
    organizerId: uuid("organizer_id").references(() => organizers.id),
    action: text("action").notNull(), // "order.refund", "ticket.revoke", "event.publish"…
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_actor_idx").on(t.actorUserId, t.createdAt),
    index("audit_entity_idx").on(t.entityType, t.entityId),
  ]
);
