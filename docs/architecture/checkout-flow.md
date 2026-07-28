# Wii Event OS — Checkout Flow (Phase 2 spec)

End-to-end definition of the money path: event page → paid order → tickets in
wallet. Builds on [db-schema.ts](./db-schema.ts) and
[state-machines.md](./state-machines.md). Transition numbers (O1, H2, …) refer
to the state-machine spec.

## Tunables

| Constant | Value | Rationale |
|---|---|---|
| `HOLD_TTL` | **10 min** | long enough to fill a form on a phone at 1am, short enough that on-sale stock recirculates |
| `PAYMENT_TTL` | **+15 min** from `beginPayment` | 3DS challenges + bank app round-trips are slow; extending at payment start means a slow bank never kills a committed buyer |
| Hold sweep cadence | every 60 s | index-only scan on `holds(status, expires_at)` |
| Countdown UI | shown from 5:00 remaining | urgency without panic; timer is *display only* — the server clock is truth |
| Max per order | tier `maxPerOrder` (default 8) | scalping friction |
| Guest checkout | **always allowed** | email-only; account is claimable after purchase |

## The happy path

```
 BUYER                    WEB/APP                ORDERS svc              STRIPE                 JOBS
   │  select tiers/qty       │                       │                     │                     │
   ├────────────────────────►│  create(idempKey)     │                     │                     │
   │                         ├──────────────────────►│ O1: txn ─ lock pools│                     │
   │                         │                       │  holds++, price lock│                     │
   │                         │   draft order + 10:00 │  order: draft       │                     │
   │   contact / login step  │◄──────────────────────┤                     │                     │
   ├────────────────────────►│  beginPayment(email)  │                     │                     │
   │                         ├──────────────────────►│ O2: PaymentIntent ──┼────────────────────►│
   │                         │                       │  (destination charge│                     │
   │                         │                       │   + application fee)│                     │
   │                         │  clientSecret, +15:00 │  order: pending_pay │                     │
   │   card / Apple Pay      │◄──────────────────────┤                     │                     │
   ├─────────────────────────┼───────────────────────┼────────────────────►│  confirm (3DS/SCA)  │
   │                         │                       │                     │                     │
   │                         │                       │◄── webhook: payment_intent.succeeded ─────┤
   │                         │                       │ O3 finalize txn:    │                     │
   │                         │                       │  holds→converted    │                     │
   │                         │                       │  sold++, mint tix   │                     │
   │                         │                       │  attribution+commiss│                     │
   │                         │                       │  order: paid ───────┼──────► enqueue ────►│ deliver email/push
   │  confirmation screen    │  poll/subscribe order │                     │                     │ wallet sync
   │◄────────────────────────┤◄──────────────────────┤                     │                     │ receipt
   │  tickets in wallet      │                       │                     │                     │ notify ambassador
```

### Step by step

**0. Entry.** Event page (ISR from the live content snapshot) shows tiers with
the *currently resolving* price phase. A `?ref=CODE` param is validated
server-side and stored client-side (cookie + localStorage, 7-day TTL, **last
click wins**) — but attribution is only *locked* at payment success (step 5).

**1. Selection → `orders.create` (O1).** Client sends `{eventId, lines:[{tierId,
qty}], idempotencyKey, refCode?}`. One transaction: row-lock the tier pools
**and** the event-wide pool (always in pool-id order → no deadlocks), verify
capacity, write holds, resolve + lock the price phase into `order_lines`
(unit prices in cents), compute totals server-side. Returns the draft order
with `expiresAt`. A retry with the same idempotency key returns the same order.
**Insufficient stock** returns per-tier availability so the UI can offer
"2 left in GA, or join the waitlist" instead of a dead end.

**2. Contact.** Logged-in users skip this. Guests give email only (name
optional). No password, no signup wall — the account is a shadow row claimed
later via magic link. Changing qty here = release+acquire holds (H3+H1); the
clock does **not** reset (anti-hoarding).

**3. `orders.beginPayment` (O2).** Guards holds alive, then creates the
PaymentIntent on the organizer's Connect account (destination charge,
`application_fee_amount` = platform fee), stamps `placedAt`, extends
holds+order to `now + PAYMENT_TTL`. Returns `clientSecret`. Payment methods:
card, Apple Pay, Google Pay (Payment Element / RN SDK — card data never touches
our servers).

**4. Confirmation on the client** is a *hint*, not truth. After
`stripe.confirmPayment` resolves, the client polls `orders.get` (or subscribes)
showing "confirming your order…". It never renders success from the Stripe SDK
result alone.

**5. Webhook → finalize (O3).** `payment_intent.succeeded` hits
`/api/webhooks/stripe`: verify signature → insert into `webhook_events`
(unique on provider event id — dupes exit here) → ack 200 → process in a job.
The **finalize transaction** (single DB txn):

1. Lock order row; assert `pending_payment` (see races below).
2. Holds → `converted`; pools `heldCount− / soldCount+`; phase `soldCount+`.
3. Mint one ticket per admission (`issued`, serial, qrVersion 1).
4. If the order has a valid ref code (code `active`, event matches, **buyer ≠
   ambassador**, payment fingerprint ≠ ambassador's): write
   `referral_attributions` + `commissions(pending, payableAt = event.endAt + 72h)`.
5. Order → `paid`; if guest, create/attach shadow user.

Then enqueued jobs: delivery email (tickets → `active` on completion), push +
mobile wallet sync, receipt, ambassador notification, tier `sold_out` flag
refresh.

**6. Confirmation screen.** Order summary + tickets, "add to wallet", claim-
account prompt for guests, share CTA. Reuses the existing `QRTicket` visual —
now rendering a real signed QR.

## Failure & edge paths

| Case | Behavior |
|---|---|
| **Payment fails / 3DS abandoned** (O4) | Order stays `pending_payment`, holds keep ticking. UI offers retry (new intent, same order). No stock is lost to the buyer until TTL. |
| **Holds expire mid-form** (O5) | Sweep flips order → `expired`, releases stock. UI (which saw `expiresAt`) shows "your reservation lapsed" with one-tap re-create — a *new* O1 that may hit a new price phase or sell-out honestly. |
| **Webhook lands after expiry + resale** | The O3/O5 race rule: finalize sees order `expired`, checks pool; if stock genuinely gone → auto-refund with reason `inventory_lost_at_payment`, apology email, waitlist priority flag. If stock is still available → re-acquire and finalize normally (buyer never knows). |
| **Double-click / double-submit** | Idempotency key on create; Stripe idempotency key on intent creation; webhook dedup on event id. All three layers are independent. |
| **Price phase rolls over mid-checkout** | Impossible by construction — price locked in `order_lines` at O1. Phase `allocation` is checked against `soldCount` at finalize; a phase can *oversell its allocation* by in-flight holds (acceptable: honors the shown price) but never oversell the pool. |
| **Sell-out during selection** | O1 fails per-tier with live availability; waitlist CTA (`waitlist_entries`). On any release/expiry/refund that frees stock in a sold-out tier, a job notifies the head of the waitlist with a 24h priority window. |
| **Webhook outage** | Orders sit `pending_payment` past TTL with money possibly taken. Reconciliation job (every 10 min) lists Stripe intents `succeeded` whose orders aren't `paid` and replays finalize. Stripe retries webhooks for days; this is belt-and-braces. |
| **`payment_intent.canceled` / expired intent** | Recorded on `payments`; order follows the normal TTL path. |
| **Refund after delivery** | O7/O8: Stripe refund, tickets revoked (`qrVersion++`, push notice), commission clawback, audit row with actor + reason. |

## On-sale surge (drop nights)

The flow above is surge-safe at the DB layer (row locks + check constraint =
worst case is failed transactions, never oversell). For hyped drops add a
**waiting-room token** in front of O1: Redis-issued queue position, O1 requires
a valid token. This throttles *entry to checkout*, keeping lock contention on
the pool rows bounded. Ship it as a per-event flag (`events` metadata), off by
default — Wii's current scale doesn't need it; the flag existing means the
first viral drop doesn't need an emergency deploy.

## What the current site already has vs. what changes

The existing UI flow (tier select → details → payment → QR confirmation in
[app/checkout/page.tsx](../../app/checkout/page.tsx)) survives almost
unchanged visually. What changes underneath: sessionStorage cart → server
draft order with countdown; `"€45"` strings → cents from `order_lines`;
decorative QR → signed QR; the confirmation screen becomes truth-driven by
order status instead of unconditional.
