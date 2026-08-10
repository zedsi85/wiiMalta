import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@wii/db/client";
import { sendActionEmail } from "@wii/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public ambassador application → profile status 'applied' (admin approves). */
const recent = new Map<string, number>();

export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; instagram?: string; motivation?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim().slice(0, 80) ?? "";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name) {
    return NextResponse.json({ ok: false, error: "name and valid email required" }, { status: 400 });
  }
  const last = recent.get(email) ?? 0;
  if (Date.now() - last < 60_000) return NextResponse.json({ ok: true });
  recent.set(email, Date.now());

  const d = db();
  const org = await d.query.organizers.findFirst({ where: eq(s.organizers.slug, "wii-malta") });
  if (!org) return NextResponse.json({ ok: false }, { status: 500 });

  let user = await d.query.users.findFirst({ where: eq(s.users.email, email) });
  if (!user) {
    [user] = await d.insert(s.users).values({ email, displayName: name }).returning();
  } else if (!user.displayName && name) {
    await d.update(s.users).set({ displayName: name }).where(eq(s.users.id, user.id));
  }

  const [profile] = await d
    .insert(s.ambassadorProfiles)
    .values({ userId: user.id, organizerId: org.id, status: "applied" })
    .onConflictDoNothing()
    .returning();

  if (profile) {
    await d.insert(s.auditLog).values({
      actorUserId: user.id,
      action: "ambassador.apply",
      entityType: "ambassador_profile",
      entityId: profile.id,
      before: null,
      after: { email, name, instagram: body.instagram?.slice(0, 80), motivation: body.motivation?.slice(0, 500) },
    });
    await sendActionEmail({
      to: email,
      subject: "Application received — Wii Ambassadors",
      heading: "You're on the list.",
      body: `Thanks ${name} — your ambassador application is in. The Wii team reviews every application personally; you'll get an email the moment you're approved.`,
    }).catch(() => {});
    await sendActionEmail({
      to: process.env.EMAIL_FROM ?? "zedsi85@gmail.com",
      subject: `New ambassador application: ${name}`,
      heading: "New application",
      body: `<b>${name}</b> (${email})${body.instagram ? ` · IG: ${body.instagram}` : ""}<br><br>${(body.motivation ?? "").slice(0, 500) || "No motivation text."}<br><br>Approve or reject in Admin → Ambassadors.`,
      ctaLabel: "Open ambassadors",
      ctaUrl: "https://admin.wiievent.com/ambassadors",
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
