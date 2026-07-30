"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: [string, string][] = [
  ["/ambassador", "Dashboard"],
  ["/ambassador/events", "My Events"],
  ["/ambassador/sales", "My Sales"],
  ["/ambassador/commissions", "Commissions"],
  ["/ambassador/payment", "Payment"],
  ["/ambassador/payouts", "Payouts"],
  ["/ambassador/assets", "Assets"],
  ["/ambassador/settings", "Settings"],
];

export function AmbassadorNav({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 border-b border-slate bg-ink/95 px-4 pt-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-ember">
            Wii Ambassadors
          </div>
          <div className="text-lg font-bold">{name}</div>
        </div>
        <form action="/logout" method="post">
          <button className="btn-admin text-xs">Sign out</button>
        </form>
      </div>
      <nav className="scrollbar-none -mx-1 mt-3 flex gap-1 overflow-x-auto pb-2">
        {TABS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-xs ${
              pathname === href ? "bg-ember font-semibold text-void" : "text-fog hover:bg-graphite"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
