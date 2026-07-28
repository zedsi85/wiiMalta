# Wii Event OS — State Machines

Companion to [db-schema.ts](./db-schema.ts). These are the **only** legal status
transitions. Each transition is a named service method that, in one DB
transaction: (1) checks the guard, (2) flips the status, (3) applies side
effects marked ⚡ inline, and (4) writes the audit/lifecycle row. Anything not
listed here is a bug. Raw `UPDATE … SET status` outside these methods is
forbidden by convention and, for `audit_log`/`ticket_events`, by DB grants.

Legend — **Actor**: `buyer` (customer), `system` (webhook/job), `staff`
(manager/owner), `admin` (platform admin). ⚡ = synchronous, same txn.
⏩ = enqueued job (durable, retried).

---

## 1. Order

```
                       ┌───────────┐
        create ──────► │   draft   │ ─── expire/abandon ──► expired / cancelled
                       └─────┬─────┘
                 begin_payment│
                       ┌─────▼──────────┐
                       │ pending_payment│ ── payment_failed ──► (stays; retry)
                       └─────┬──────────┘ ── expire ─────────► expired
                payment_succeeded (webhook only)
                       ┌─────▼─────┐
                       │   paid    │
                       └─────┬─────┘
              refund(partial)│        refund(full)
              ┌──────────────▼───┐   ┌───────────┐
              │partially_refunded│ ─►│ refunded  │
              └──────────────────┘   └───────────┘
```

| # | From → To | Trigger / method | Actor | Guards | Side effects |
|---|---|---|---|---|---|
| O1 | ∅ → `draft` | `orders.create` | buyer | event `published`; tiers `on_sale`; qty ≤ `maxPerOrder`; inventory available | ⚡ acquire holds (row-lock pools, `heldCount += qty`); ⚡ lock price phase into lines; set `expiresAt = now + HOLD_TTL` |
| O2 | `draft` → `pending_payment` | `orders.beginPayment` | buyer | holds still `active`; email present | ⚡ create Stripe PaymentIntent (destination charge + application fee); stamp `placedAt`; **extend holds & `expiresAt` to `now + PAYMENT_TTL`** |
| O3 | `pending_payment` → `paid` | `payments.onSucceeded` | **system (Stripe webhook only)** | webhook signature valid; event id unseen; amount == `totalCents` | ⚡ **finalize txn**: holds `active→converted`, pools `heldCount−`, `soldCount+`, phase `soldCount+`; mint tickets (`issued`); write referral attribution + commission (`pending`); stamp `paidAt`, clear `expiresAt`; ⏩ deliver tickets (email + push + wallet sync → tickets `issued→active`); ⏩ receipt; ⏩ notify ambassador |
| O4 | `pending_payment` → `pending_payment` | `payments.onFailed` | system | — | record failure on `payments`; buyer may retry with a new intent while holds live |
| O5 | `draft`\|`pending_payment` → `expired` | `orders.expire` | system (sweep job) | `expiresAt < now`; **no `succeeded` payment exists** (re-check inside txn — see race note) | ⚡ holds → `expired`, pools `heldCount−`; cancel PaymentIntent if present; ⏩ waitlist promotion check |
| O6 | `draft` → `cancelled` | `orders.cancel` | buyer | — | ⚡ holds → `released`, pools `heldCount−` |
| O7 | `paid` → `partially_refunded` | `refunds.create` | staff | reason required; amount ≤ remaining | ⚡ Stripe refund; `refundedCents+`; revoke the refunded tickets (T5); adjust/claw back commission (C4); audit |
| O8 | `paid`\|`partially_refunded` → `refunded` | `refunds.create` (full) | staff | as O7, amount = remaining | as O7 for all tickets; commission → `clawed_back`; ⏩ waitlist promotion check |

**The O3/O5 race** (webhook arrives after expiry started, or vice-versa): both
methods open by locking the order row `FOR UPDATE`. Expire re-checks payment
status after acquiring the lock; onSucceeded re-checks order status. If payment
succeeded but holds already expired and inventory was resold → **auto-refund
path**: mark payment succeeded, immediately create a full refund with reason
`inventory_lost_at_payment`, notify buyer with an apology + waitlist priority.
This case is rare (requires payment landing after PAYMENT_TTL) but must be
handled, not hoped away.

**Terminal states**: `expired`, `cancelled`, `refunded`. `paid` and
`partially_refunded` are resting states.

---

## 2. Ticket

```
   mint ──► issued ── deliver ──► active ──┬─ redeem ───► redeemed ─ un-redeem ─► active
                                           ├─ revoke ───► revoked
                                           └─ transfer ─► transferred ··(mints new ticket: issued)
```

| # | From → To | Trigger / method | Actor | Guards | Side effects |
|---|---|---|---|---|---|
| T1 | ∅ → `issued` | `wallet.mint` | system (inside O3 finalize txn) | one per admission, per order line qty | serial generated; `ticket_events: issued` |
| T2 | `issued` → `active` | `wallet.markDelivered` | system (delivery job) | email accepted or wallet sync confirmed | `ticket_events: delivered` |
| T3 | `active` → `redeemed` | `checkin.redeem` | staff (scanner) | QR signature valid (any un-retired kid); `qrVersion` matches; scanner assigned to event; event day window | ⚡ atomic: lock row, flip, insert `redemptions` (unique per ticket); `ticket_events: redeemed`. Duplicate scan → **not an error**: return "already redeemed at {time}, gate {gate}" |
| T4 | `redeemed` → `active` | `checkin.unredeem` | staff (manager+) | within event window; reason required | delete-marker on redemption? **No** — insert `ticket_events: unredeemed` + remove `redemptions` row in same txn; audit. (Door mistake path: scanned the wrong person's phone) |
| T5 | `active`\|`issued` → `revoked` | `wallet.revoke` | staff / system (refund O7-O8, fraud) | reason required | `qrVersion++` (kills rendered QRs); ⏩ push "ticket revoked" to owner's devices; `ticket_events: revoked` |
| T6 | `active` → `transferred` | `wallet.transferAccept` | buyer (recipient accepts) | transfer `pending`, not expired; ticket still `active` (re-check under lock) | ⚡ same txn: old ticket → `transferred` + `qrVersion++`; new ticket minted `issued→active` for recipient with fresh serial; `ticket_events` on both; ⏩ notify both parties |
| —  | (transfer offered) | `wallet.transferCreate` | buyer (owner) | ticket `active`; no pending transfer; event not started | `ticket_transfers: pending` + claim email. Not a ticket-status change — the ticket stays `active` and scannable until acceptance |

**QR note**: the QR is never stored — it's derived: `HMAC(kid, ticketId · qrVersion · exp)`
minted on demand with `exp ≈ 60s` (app rotates it). `qrVersion` bump = global
invalidation of every previously rendered/screenshotted code. Static email QR
uses a longer exp but dies the same way on version bump.

**Terminal states**: `revoked`, `transferred`. `redeemed` is *soft-terminal*
(T4 exists for door mistakes, manager-gated).

---

## 3. Hold (inventory reservation)

```
   acquire ──► active ──┬─ convert ──► converted    (order paid — became soldCount)
                        ├─ release ──► released     (buyer backed out / cancel)
                        └─ expire  ──► expired      (TTL sweep)
```

| # | From → To | Trigger | Actor | Guards | Pool effect (same txn, pool row-locked) |
|---|---|---|---|---|---|
| H1 | ∅ → `active` | O1 create / cart update | buyer | `soldCount + heldCount + qty ≤ capacity` for **tier pool AND event-wide pool** | `heldCount += qty` |
| H2 | `active` → `converted` | O3 finalize | system | order → paid | `heldCount −= qty`, `soldCount += qty` |
| H3 | `active` → `released` | O6 cancel / qty decrease | buyer | — | `heldCount −= qty` |
| H4 | `active` → `expired` | sweep job (runs every minute over `holds_expiry_idx`) | system | `expiresAt < now` and parent order not `paid` | `heldCount −= qty`; ⏩ waitlist check if tier was sold out |

Holds are the *only* thing allowed to sit between "available" and "sold".
Quantity changes in the cart are modeled as release+acquire, never in-place
mutation — keeps every pool movement a signed, auditable delta.

---

## 4. Commission

```
   accrue ──► pending ──┬─ mature ───► payable ── settle ──► paid
                        ├─ clawback ─► clawed_back  (source order refunded)
                        └─ void ─────► void         (fraud / manual)
```

| # | From → To | Trigger | Actor | Guards | Side effects |
|---|---|---|---|---|---|
| C1 | ∅ → `pending` | O3 finalize | system | attribution row written in same txn; rate resolved (code override ▸ profile ▸ organizer default) & snapshotted | `amountCents = subtotal × rateBps` (booking fees excluded) |
| C2 | `pending` → `payable` | maturity job (daily) | system | `payableAt < now` (= event `endAt` + 72h grace) **and** event not cancelled **and** source order still `paid` | ⏩ notify ambassador |
| C3 | `payable` → `paid` | `payouts.settle` | staff (owner) | included in a `paid` payout | `payoutId` stamped |
| C4 | `pending`\|`payable` → `clawed_back` | O7/O8 refund | system | source order refunded (pro-rata on partial) | ⏩ notify ambassador; if already `paid` → **negative balance carried into next payout**, never silently ignored |
| C5 | any pre-`paid` → `void` | `commissions.void` | staff | reason required | audit; counts toward ambassador fraud score |

---

## 5. Event (operational, abbreviated)

`draft → published` (guards: live content version exists, ≥1 tier `on_sale`
with pool, venue set, organizer `active` with Stripe account) ·
`published → cancelled` (⏩ mass refund every `paid` order, revoke all tickets,
notify everyone — this is the single most expensive button in the system;
requires owner + typed confirmation) · `published → completed` (job, after
`endAt`; starts commission maturity clock) · `completed → archived` (cosmetic).

---

## Invariants to assert in CI (property tests over the service layer)

1. `Σ pool movements` per pool = `soldCount/heldCount` (ledger consistency).
2. `count(tickets WHERE status NOT IN (revoked, transferred))` per tier ≤ pool `soldCount`.
3. An order `paid` ⟹ exactly one `succeeded` payment with `amount == totalCents`.
4. A ticket `redeemed` ⟺ exactly one `redemptions` row.
5. Replaying any webhook or offline scan batch is a no-op (idempotency).
6. No commission `paid` without a `paid` payout; no attribution without a `paid` order.
