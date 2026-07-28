/**
 * Wii Event Malta — lightweight cart hand-off.
 *
 * The event-detail purchase panel writes the selection to sessionStorage, then
 * the checkout screen reads it. This is intentionally simple scaffolding — swap
 * for a real cart/ticketing service (Stripe, custom inventory) later.
 */
export interface CartLine {
  tierId: string;
  name: string;
  price: string;
  vip?: boolean;
  qty: number;
}

export interface Cart {
  slug: string;
  eventTitle: string;
  date: string;
  venue: string;
  lines: CartLine[];
}

const KEY = "wii_cart";

export function setCart(cart: Cart) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(cart));
}

export function getCart(): Cart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Cart) : null;
  } catch {
    return null;
  }
}

export function clearCart() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

/** Parse a "€95" style price string to a number. */
export function priceValue(price: string): number {
  const n = parseFloat(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatEuro(n: number): string {
  return "€" + n.toFixed(2);
}
