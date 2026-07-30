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

/* ---------------- Guard (security / door staff) ---------------- */

export interface GuardContext {
  userId: string;
  email: string;
  displayName: string | null;
  /** Managers/owners/platform admins scan without per-event assignments. */
  seesAllEvents: boolean;
}

/** Resolve the Supabase session to our users row (shared with requireStaff). */
async function resolveSessionUser() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const d = db();
  let row = await d.query.users.findFirst({ where: eq(s.users.authProviderId, user.id) });
  if (!row) {
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
  return row ?? null;
}

async function guardContextFor(rowId: string, platformRole: string, email: string, displayName: string | null): Promise<GuardContext | null> {
  const d = db();
  const memberships = await d
    .select({ role: s.organizerMembers.role })
    .from(s.organizerMembers)
    .where(eq(s.organizerMembers.userId, rowId));
  const roles = new Set(memberships.map((m) => m.role));
  const isStaff = platformRole === "platform_admin" || roles.has("owner") || roles.has("manager");

  if (!isStaff && !roles.has("scanner")) {
    // Assignment without membership row still counts (defensive)
    const assigned = await d
      .select({ eventId: s.scannerAssignments.eventId })
      .from(s.scannerAssignments)
      .where(eq(s.scannerAssignments.userId, rowId))
      .limit(1);
    if (assigned.length === 0) return null;
  }
  return { userId: rowId, email, displayName, seesAllEvents: isStaff };
}

/** Page gate: redirects to the guard login. */
export async function requireGuard(): Promise<GuardContext> {
  const row = await resolveSessionUser();
  if (!row) redirect("/guard/login");
  const ctx = await guardContextFor(row.id, row.platformRole, row.email, row.displayName);
  if (!ctx) redirect("/guard/login?error=denied");
  return ctx;
}

/** API gate: returns null instead of redirecting (routes answer 401 JSON). */
export async function guardFromSession(): Promise<GuardContext | null> {
  const row = await resolveSessionUser();
  if (!row) return null;
  return guardContextFor(row.id, row.platformRole, row.email, row.displayName);
}

/* ---------------- Ambassador (affiliate portal) ---------------- */

export interface AmbassadorContext {
  userId: string;
  profileId: string;
  status: string;
  email: string;
  displayName: string | null;
}

/** Page gate for /ambassador/*. Approved|verified → full access; applied →
 *  review screen; suspended/rejected/none → denied. Own data only: pages
 *  must query exclusively via ctx.profileId. */
export async function requireAmbassador(): Promise<AmbassadorContext> {
  const row = await resolveSessionUser();
  if (!row) redirect("/ambassador/login");
  const d = db();
  const profile = await d.query.ambassadorProfiles.findFirst({
    where: eq(s.ambassadorProfiles.userId, row.id),
  });
  if (!profile) redirect("/ambassador/login?error=denied");
  if (profile.status === "suspended" || profile.status === "rejected") {
    redirect("/ambassador/login?error=denied");
  }
  return {
    userId: row.id,
    profileId: profile.id,
    status: profile.status,
    email: row.email,
    displayName: row.displayName,
  };
}
