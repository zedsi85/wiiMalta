import { NextResponse, type NextRequest } from "next/server";
import { eq, inArray, and } from "drizzle-orm";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { db, schema as s } from "@wii/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Role router — lands freshly authenticated users in the right portal when
 * the login destination is unknown (e.g. magic link opened on another
 * device): staff → admin, guard → scanner, ambassador → affiliate portal.
 */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (_list: { name: string; value: string; options: CookieOptions }[]) => {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.redirect(`${origin}/login`);

  const d = db();
  const row =
    (await d.query.users.findFirst({ where: eq(s.users.authProviderId, user.id) })) ??
    (await d.query.users.findFirst({ where: eq(s.users.email, user.email.toLowerCase()) }));
  if (!row) return NextResponse.redirect(`${origin}/login?error=denied`);

  if (row.platformRole === "platform_admin") return NextResponse.redirect(`${origin}/`);
  const staff = await d
    .select({ role: s.organizerMembers.role })
    .from(s.organizerMembers)
    .where(
      and(eq(s.organizerMembers.userId, row.id), inArray(s.organizerMembers.role, ["owner", "manager"]))
    )
    .limit(1);
  if (staff.length) return NextResponse.redirect(`${origin}/`);

  const guard = await d
    .select({ role: s.organizerMembers.role })
    .from(s.organizerMembers)
    .where(and(eq(s.organizerMembers.userId, row.id), eq(s.organizerMembers.role, "scanner")))
    .limit(1);
  if (guard.length) return NextResponse.redirect(`${origin}/guard/events`);

  const ambassador = await d.query.ambassadorProfiles.findFirst({
    where: eq(s.ambassadorProfiles.userId, row.id),
  });
  if (ambassador) return NextResponse.redirect(`${origin}/ambassador`);

  return NextResponse.redirect(`${origin}/login?error=denied`);
}
