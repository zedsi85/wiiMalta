import "server-only";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";

/**
 * Account deletion — App Store Guideline 5.1.1(v) / Play data-deletion policy.
 *
 * Erases the account's personal footprint: saved events, registered push
 * devices, and profile PII on the user row. Order/ticket rows are retained
 * as financial transaction records (legal retention obligation); they carry
 * only the purchase email, which remains the lookup key if the person buys
 * again. Stateless sessions (30-day HMAC) cannot be revoked server-side —
 * the client discards its token on success.
 */
export async function deleteAccountData(email: string): Promise<{ ok: true }> {
  const d = db();
  const user = await d.query.users.findFirst({ where: eq(s.users.email, email.toLowerCase()) });
  if (user) {
    await d.delete(s.savedEvents).where(eq(s.savedEvents.userId, user.id));
    await d.delete(s.devices).where(eq(s.devices.userId, user.id));
    await d
      .update(s.users)
      .set({ displayName: null, phone: null, avatarUrl: null, marketingConsentAt: null })
      .where(eq(s.users.id, user.id));
    await d.insert(s.auditLog).values({
      actorUserId: user.id,
      action: "account.delete",
      entityType: "user",
      entityId: user.id,
      after: { source: "self-service" },
    });
  }
  return { ok: true };
}
