import Link from "next/link";
import { requireStaff } from "@/lib/auth";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate bg-charcoal p-4">
        <div className="mb-8">
          <div className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ember">
            Wii Event OS
          </div>
          <div className="text-lg font-bold">Admin</div>
        </div>
        <nav className="grid gap-1 text-sm">
          <Link className="rounded-md px-3 py-2 hover:bg-graphite" href="/">
            Dashboard
          </Link>
          <Link className="rounded-md px-3 py-2 hover:bg-graphite" href="/events">
            Events
          </Link>
          <Link className="rounded-md px-3 py-2 hover:bg-graphite" href="/ambassadors">
            Ambassadors
          </Link>
        </nav>
        <div className="mt-auto grid gap-3 pt-8">
          <div className="text-xs text-fog">
            {staff.displayName ?? staff.email}
            {staff.isPlatformAdmin && <span className="pill ml-2 text-gold">admin</span>}
          </div>
          <form action="/logout" method="post">
            <button className="btn-admin w-full justify-center">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
