import "server-only";

/**
 * Payment-provider abstraction. Two implementations:
 *  - "revolut": Revolut Merchant API (sandbox or prod, by REVOLUT_API_BASE)
 *  - "mock":    local development — no network; /api/dev/mock-pay simulates
 *               the provider's ORDER_COMPLETED webhook.
 * Selected by PAYMENT_PROVIDER (defaults to mock unless a Revolut key exists).
 */

export interface ProviderOrder {
  providerOrderId: string;
  /** Public token consumed by the client widget (Revolut) — mock uses order id. */
  clientToken: string;
  checkoutUrl?: string;
}

export interface PaymentProvider {
  name: "mock" | "revolut";
  createOrder(args: {
    amountCents: number;
    currency: string;
    description: string;
    /** Our order id — round-tripped via provider metadata for webhook matching. */
    orderId: string;
    email?: string;
  }): Promise<ProviderOrder>;
  refund(args: {
    providerOrderId: string;
    amountCents: number;
    currency: string;
    reason: string;
  }): Promise<{ providerRefundId: string }>;
}

/* ---------------- Revolut ---------------- */

const REVOLUT_API_BASE = process.env.REVOLUT_API_BASE ?? "https://sandbox-merchant.revolut.com";
const REVOLUT_API_VERSION = process.env.REVOLUT_API_VERSION ?? "2024-09-01";

async function revolutFetch(path: string, body: unknown): Promise<Record<string, unknown>> {
  const key = process.env.REVOLUT_SECRET_KEY;
  if (!key) throw new Error("REVOLUT_SECRET_KEY not configured");
  const res = await fetch(`${REVOLUT_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Revolut-Api-Version": REVOLUT_API_VERSION,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Revolut ${path} failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

const revolut: PaymentProvider = {
  name: "revolut",
  async createOrder({ amountCents, currency, description, orderId, email }) {
    const json = await revolutFetch("/api/orders", {
      amount: amountCents, // minor units
      currency,
      description,
      merchant_order_data: { reference: orderId },
      metadata: { wii_order_id: orderId },
      ...(email ? { customer: { email } } : {}),
    });
    return {
      providerOrderId: json.id as string,
      clientToken: (json.token ?? json.public_id) as string,
      checkoutUrl: json.checkout_url as string | undefined,
    };
  },
  async refund({ providerOrderId, amountCents, currency, reason }) {
    const json = await revolutFetch(`/api/orders/${providerOrderId}/refund`, {
      amount: amountCents,
      currency,
      description: reason,
    });
    return { providerRefundId: (json.id ?? `rf_${providerOrderId}`) as string };
  },
};

/* ---------------- Mock ---------------- */

const mock: PaymentProvider = {
  name: "mock",
  async createOrder({ orderId }) {
    return { providerOrderId: `mock_${orderId}`, clientToken: `mocktok_${orderId}` };
  },
  async refund({ providerOrderId }) {
    return { providerRefundId: `mockrf_${providerOrderId}` };
  },
};

export function paymentProvider(): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER;
  if (configured === "revolut") return revolut;
  if (configured === "mock") return mock;
  return process.env.REVOLUT_SECRET_KEY ? revolut : mock;
}
