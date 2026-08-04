import * as SecureStore from "expo-secure-store";

/**
 * API client — the Wii Event OS backend is the single source of truth; this
 * file is transport only. Session = the same signed account value the web
 * cookie carries, stored in SecureStore, sent as a Bearer header.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://wii-malta-web.vercel.app";

const TOKEN_KEY = "wii_session";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
export async function setToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string
  ) {
    super(`${status} ${code}`);
  }
}

export async function api<T>(
  path: string,
  init?: RequestInit & { auth?: boolean }
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (init?.auth !== false) {
    const token = await getToken();
    if (token) headers.authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new ApiError(res.status, json.error ?? "request_failed");
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- Typed surface (mirrors the web JSON contract) ---------------- */

export interface TicketTier {
  id: string;
  name: string;
  price: string;
  note?: string;
  status: string;
  vip?: boolean;
  perks: string[];
}

export interface WiiEvent {
  slug: string;
  title: string;
  date: string;
  dateLong: string;
  dateShort: string;
  iso: string;
  venue: string;
  city: string;
  genres: string[];
  lineup: string[];
  priceFrom: string;
  status: string;
  type: string;
  tint: string;
  blurb: string;
  artists: { name: string; role: string; setTime?: string; country?: string; headliner?: boolean }[];
  tiers: TicketTier[];
  info: [string, string][];
  faq: [string, string][];
}

export interface WalletTicket {
  id: string;
  serial: string;
  status: string;
  orderId: string | null;
  eventTitle: string;
  eventStartAt: string | null;
  eventStarted: boolean;
  tierName: string;
  pendingTransferTo: string | null;
  ticketKey: string;
  orderKey: string | null;
}

export const Api = {
  events: () => api<{ events: WiiEvent[] }>("/api/events", { auth: false }),
  event: (slug: string) => api<{ event: WiiEvent; similar: WiiEvent[] }>(`/api/events/${slug}`, { auth: false }),
  requestCode: (email: string) =>
    api<{ ok: boolean }>("/api/account/request-code", { method: "POST", body: JSON.stringify({ email }), auth: false }),
  verifyCode: (email: string, code: string) =>
    api<{ ok: boolean; token: string; email: string }>("/api/account/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
      auth: false,
    }),
  me: () => api<{ email: string }>("/api/account/me"),
  tickets: () => api<{ tickets: WalletTicket[] }>("/api/account/tickets"),
  orders: () =>
    api<{ orders: { id: string; status: string; totalCents: number; eventTitle: string | null; key: string }[] }>(
      "/api/account/orders"
    ),
  ticketQr: (id: string, k: string) =>
    api<{ serial: string; status: string; tierName: string; eventTitle: string; eventStartAt: string | null; venue: string; qrToken: string | null; exp: number }>(
      `/api/tickets/${id}/qr?k=${encodeURIComponent(k)}`
    ),
  saved: () => api<{ eventIds: string[] }>("/api/account/saved"),
  setSaved: (eventId: string, save: boolean) =>
    api<{ ok: boolean }>("/api/account/saved", { method: "POST", body: JSON.stringify({ eventId, save }) }),
  ambassador: () => api<{ status: string; dashboard?: AmbassadorDashboard }>("/api/account/ambassador"),
  registerDevice: (pushToken: string, platform: "ios" | "android", appVersion?: string) =>
    api<{ ok: boolean }>("/api/account/devices", {
      method: "POST",
      body: JSON.stringify({ pushToken, platform, appVersion }),
    }),
  createOrder: (slug: string, lines: { tierId: string; qty: number }[], idempotencyKey: string, refCode?: string) =>
    api<{ orderId: string; key: string; totalCents: number; currency: string; expiresAt: string | null }>(
      "/api/orders",
      {
        method: "POST",
        body: JSON.stringify({ slug, lines, idempotencyKey }),
        auth: false,
        headers: refCode ? { cookie: `wii_ref=${refCode}` } : undefined,
      }
    ),
  beginPayment: (orderId: string, key: string, email: string) =>
    api<{ provider: string; clientToken: string; checkoutUrl?: string; expiresAt: string }>(
      `/api/orders/${orderId}/pay?key=${key}`,
      { method: "POST", body: JSON.stringify({ email }), auth: false }
    ),
  orderStatus: (orderId: string, key: string) =>
    api<{ status: string; tickets: { id: string; serial: string; status: string }[]; event: { title: string } }>(
      `/api/orders/${orderId}?key=${key}`,
      { auth: false }
    ),
  mockPay: (orderId: string, key: string) =>
    api<{ outcome: string }>("/api/dev/mock-pay", {
      method: "POST",
      body: JSON.stringify({ orderId, key }),
      auth: false,
    }),
  validateRef: (code: string) =>
    api<{ ok: boolean }>("/api/ref", { method: "POST", body: JSON.stringify({ code }), auth: false }),
};

export interface AmbassadorDashboard {
  profile: { code: string | null; commissionBps: number; fixedBonusCents: number };
  ticketsSold: number;
  revenueNetCents: number;
  commission: {
    earnedCents: number;
    pendingCents: number;
    lockedCents: number;
    approvedCents: number;
    paidCents: number;
    cancelledCents: number;
  };
  visitors: number;
  conversionRatePct: number;
  monthlyEarnings: { label: string; value: number }[];
  leaderboard: { position: number; of: number };
  topEvent: { title: string; revenueNetCents: number } | null;
}
