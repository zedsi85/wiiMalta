"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { setPaymentMethod, type PaymentDetailsInput } from "@wii/api";
import { requireAmbassador } from "@/lib/auth";

/** Ambassador self-service actions — always scoped to the session profile. */

export async function savePaymentMethodAction(formData: FormData) {
  const ctx = await requireAmbassador();
  const kind = String(formData.get("kind") ?? "");
  const f = (k: string) => String(formData.get(k) ?? "").trim();

  let input: PaymentDetailsInput;
  switch (kind) {
    case "iban":
      input = { kind, holder: f("holder"), iban: f("iban") };
      break;
    case "bank_transfer":
      input = { kind, holder: f("holder"), bankName: f("bankName"), accountNumber: f("accountNumber"), swift: f("swift") || undefined };
      break;
    case "revolut":
      input = { kind, username: f("username") };
      break;
    case "paypal":
      input = { kind, email: f("email") };
      break;
    case "wise":
      input = { kind, email: f("email") };
      break;
    default:
      throw new Error("unsupported payment method");
  }

  const { hint } = await setPaymentMethod(ctx.profileId, input);
  await db().insert(s.auditLog).values({
    actorUserId: ctx.userId,
    action: "ambassador.payment_method.update",
    entityType: "ambassador_profile",
    entityId: ctx.profileId,
    before: null,
    after: { kind, hint }, // masked hint only — never raw details
  });
  revalidatePath("/ambassador/payment");
}

export async function updateSettingsAction(formData: FormData) {
  const ctx = await requireAmbassador();
  const name = String(formData.get("displayName") ?? "").trim();
  if (name) {
    await db().update(s.users).set({ displayName: name, updatedAt: new Date() }).where(eq(s.users.id, ctx.userId));
  }
  revalidatePath("/ambassador/settings");
  revalidatePath("/ambassador");
}
