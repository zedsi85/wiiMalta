/**
 * Wii Event OS — money.
 *
 * All monetary amounts in the system are integer minor units ("cents") plus an
 * ISO-4217 currency code. No floats, no formatted strings in domain logic.
 * Formatting happens at the presentation edge via Intl; parsing of legacy
 * "€95"-style strings exists only to migrate old mock data.
 */

export interface Money {
  /** Integer minor units (cents). May be negative for clawbacks/adjustments. */
  cents: number;
  /** ISO-4217, uppercase. The platform default is EUR. */
  currency: string;
}

export const EUR = "EUR";

function assertInt(n: number, label: string): void {
  if (!Number.isSafeInteger(n)) {
    throw new TypeError(`${label} must be a safe integer (got ${n})`);
  }
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function money(cents: number, currency: string = EUR): Money {
  assertInt(cents, "cents");
  return { cents, currency };
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.cents + b.cents, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.cents - b.cents, a.currency);
}

export function multiply(a: Money, qty: number): Money {
  assertInt(qty, "qty");
  return money(a.cents * qty, a.currency);
}

/**
 * Basis-point share (e.g. commissions, platform fees), rounded half-up.
 * 10_000 bps = 100%.
 */
export function bpsShare(a: Money, bps: number): Money {
  assertInt(bps, "bps");
  return money(Math.round((a.cents * bps) / 10_000), a.currency);
}

export function isZero(a: Money): boolean {
  return a.cents === 0;
}

export function isNegative(a: Money): boolean {
  return a.cents < 0;
}

/** Presentation-edge formatting only. Defaults to the en-MT locale. */
export function format(a: Money, locale: string = "en-MT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: a.currency,
  }).format(a.cents / 100);
}

/**
 * MIGRATION ONLY: parse legacy display strings ("€95", "€45.50") from the old
 * mock data into cents. Throws on anything it does not fully understand — a
 * silent 0 in a price pipeline is worse than a crash.
 */
export function centsFromLegacyString(price: string): number {
  const cleaned = price.replace(/[€\s,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`unparseable legacy price: "${price}"`);
  }
  const [whole, frac = ""] = cleaned.split(".");
  return parseInt(whole, 10) * 100 + parseInt(frac.padEnd(2, "0") || "0", 10);
}
