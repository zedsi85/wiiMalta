import "server-only";
import { redirect } from "next/navigation";
import { eq, and, inArray } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { supabaseServer } from "./supabase";

export interface StaffContext {
  userId: string;
  email: string;
  displayName: string | null;
  isPlatformAdmin: boolean;
  /** Organizer ids where the user is owner/manager. */
  managedOrgIds: string[];
}

/**
 * Gate for every admin surface. Resolves the Supabase session to our `users`
 * row (linking auth_provider_id on first login by verified email match) and
 * requires platform_admin or an owner/manager organizer membership.
 * Roles are resolved per request from the DB — never from the JWT.
 */
export async function requireStaff(): Promise<StaffContext> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const d = db();
  let row = await d.query.users.findFirst({
    where: eq(s.users.authProviderId, user.id),
  });
  if (!row) {
    // First login: link the auth identity to the provisioned account.
    const byEmail = await d.query.users.findFirst({
      where: eq(s.users.email, user.email.toLowerCase()),
    });
    if (byEmail && !byEmail.authProviderId) {
      await d
        .update(s.users)
        .set({ authProviderId: user.id, emailVerifiedAt: new Date() })
        .where(eq(s.users.id, byEmail.id));
      row = { ...byEmail, authProviderId: user.id };
    }
  }
  if (!row) redirect("/login?error=denied");

  const memberships = await d
    .select({ organizerId: s.organizerMembers.organizerId })
    .from(s.organizerMembers)
    .where(
      and(
        eq(s.organizerMembers.userId, row.id),
        inArray(s.organizerMembers.role, ["owner", "manager"])
      )
    );

  const isPlatformAdmin = row.platformRole === "platform_admin";
  if (!isPlatformAdmin && memberships.length === 0) redirect("/login?error=denied");

  return {
    userId: row.id,
    email: row.email,
    displayName: row.displayName,
    isPlatformAdmin,
    managedOrgIds: memberships.map((m) => m.organizerId),
  };
}
