import Link from "next/link";
import { requireStaff } from "@/lib/auth";

const NAV = [
  ["/", "Dashboard"],
  ["/events", "Events"],
  ["/orders", "Orders"],
  ["/tickets", "Tickets"],
  ["/scan", "Scan"],
  ["/guards", "Door crew"],
  ["/ambassadors", "Ambassadors"],
  ["/payouts", "Payouts"],
  ["/reports", "Reports"],
] as const;

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate bg-charcoal p-4 md:flex">
        <div className="mb-8">
          <div className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ember">
            Wii Event OS
          </div>
          <div className="text-lg font-bold">Admin</div>
        </div>
        <nav className="grid gap-1 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} className="rounded-md px-3 py-2 hover:bg-graphite" href={href}>
              {label}
            </Link>
          ))}
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

      {/* Phone: sticky top bar + horizontally scrollable nav */}
      <header className="sticky top-0 z-40 border-b border-slate bg-charcoal/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <div>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ember">
              Wii Event OS
            </span>
            <span className="ml-2 text-sm font-bold">Admin</span>
          </div>
          <form action="/logout" method="post">
            <button className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fog">
              Sign out
            </button>
          </form>
        </div>
        <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 py-2">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              className="whitespace-nowrap rounded-pill border border-slate px-3 py-1.5 text-[0.8125rem] text-sand active:bg-graphite"
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1 p-4 pb-12 md:p-8">{children}</main>
    </div>
  );
}
