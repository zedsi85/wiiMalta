import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Ticketing primitives shared by web, admin and (later) mobile/scanner.
 * Pure functions — secrets come in as arguments, never from module state.
 * Spec: docs/architecture/checkout-flow.md + state-machines.md.
 */

/** Cart holds stock for 10 minutes… */
export const HOLD_TTL_MS = 10 * 60 * 1000;
/** …extended to +15 minutes once a payment attempt starts (3DS is slow). */
export const PAYMENT_TTL_MS = 15 * 60 * 1000;
/** Commission matures this long after the event ends. */
export const COMMISSION_GRACE_MS = 72 * 60 * 60 * 1000;

/* ---------------- Serials ---------------- */

/** Unambiguous alphabet (no 0/O/1/I/L). */
const SERIAL_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Human-readable admission serial: "WII-7K2M-9QF3". */
export function generateSerial(): string {
  const bytes = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += SERIAL_ALPHABET[bytes[i] % SERIAL_ALPHABET.length];
    if (i === 3) s += "-";
  }
  return `WII-${s}`;
}

/* ---------------- QR tokens ---------------- */

export interface QrPayload {
  ticketId: string;
  qrVersion: number;
  /** Unix ms expiry of this rendered code (not of the ticket). */
  exp: number;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function hmac(secret: string, data: string): string {
  return b64url(createHmac("sha256", secret).update(data).digest());
}

/**
 * Signed QR token: wt1.<payload-b64url>.<hmac>. Short-lived (`exp`) so
 * screenshots die on their own; bumping the ticket's qrVersion kills every
 * previously minted token instantly.
 */
export function mintQrToken(payload: QrPayload, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `wt1.${body}.${hmac(secret, `wt1.${body}`)}`;
}

export type QrVerifyResult =
  | { ok: true; payload: QrPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function verifyQrToken(token: string, secret: string): QrVerifyResult {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "wt1") return { ok: false, reason: "malformed" };
  const expected = hmac(secret, `wt1.${parts[1]}`);
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }
  let payload: QrPayload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, payload };
}

/* ---------------- Order access keys ---------------- */

/**
 * Tokenized order link (guest checkout has no session): the confirmation page
 * and ticket email carry ?key=<sig>. Not time-limited — it's the owner's link.
 */
export function signOrderKey(orderId: string, secret: string): string {
  return hmac(secret, `order.${orderId}`);
}

export function verifyOrderKey(orderId: string, key: string, secret: string): boolean {
  const expected = signOrderKey(orderId, secret);
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ---------------- Per-ticket access keys (transfers) ---------------- */

/** Recipient-facing single-ticket link key — scoped to ONE ticket, so a
 *  transferred ticket never exposes the original buyer's order. */
export function signTicketKey(ticketId: string, secret: string): string {
  return hmac(secret, `ticket.${ticketId}`);
}

export function verifyTicketKey(ticketId: string, key: string, secret: string): boolean {
  const expected = signTicketKey(ticketId, secret);
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ---------------- Buyer account session (web) ---------------- */

/** Signed email-session value: v1.<b64 payload>.<hmac>; payload {email, exp}. */
export function signAccountSession(email: string, secret: string, ttlMs = 30 * 24 * 3600_000): string {
  const body = b64url(Buffer.from(JSON.stringify({ email: email.toLowerCase(), exp: Date.now() + ttlMs })));
  return `v1.${body}.${hmac(secret, `acct.${body}`)}`;
}

export function verifyAccountSession(value: string, secret: string): string | null {
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const expected = hmac(secret, `acct.${parts[1]}`);
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as { email: string; exp: number };
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload.email;
  } catch {
    return null;
  }
}

/** Login challenge: HMAC binding email+code+expiry — stateless code verification. */
export function signLoginChallenge(email: string, code: string, secret: string, ttlMs = 15 * 60_000): string {
  const exp = Date.now() + ttlMs;
  return `${exp}.${hmac(secret, `chal.${email.toLowerCase()}.${code}.${exp}`)}`;
}

export function verifyLoginChallenge(
  email: string,
  code: string,
  challenge: string,
  secret: string
): boolean {
  const [expStr, sig] = challenge.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() || !sig) return false;
  const expected = hmac(secret, `chal.${email.toLowerCase()}.${code}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
