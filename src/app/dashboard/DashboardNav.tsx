"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// Three main areas. Every inner screen (transactions, annual, maaser...) belongs
// to one of them, so the right tab stays lit wherever the client is.
const AREAS = [
  {
    href: "/dashboard",
    label: "תקציב",
    keepsMonth: true,
    prefixes: ["/dashboard/transactions", "/dashboard/annual", "/dashboard/maaser", "/dashboard/categories", "/dashboard/add"],
  },
  { href: "/dashboard/networth", label: "שווי נקי ויעדים", keepsMonth: false, prefixes: [] },
  {
    href: "/dashboard/tasks",
    label: "משימות ודוחות",
    keepsMonth: false,
    prefixes: ["/dashboard/reports"],
  },
];

function isActive(pathname: string, area: (typeof AREAS)[number]) {
  if (pathname === area.href) return true;
  if (area.href !== "/dashboard" && pathname.startsWith(`${area.href}/`)) return true;
  return area.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function DashboardNav() {
  const pathname = usePathname();
  const month = useSearchParams().get("month");
  const monthSuffix = month ? `?month=${month}` : "";

  return (
    <>
      <nav className="mt-4 grid grid-cols-3 gap-2 text-sm">
        {AREAS.map((area) => {
          const active = isActive(pathname, area);
          return (
            <Link
              key={area.href}
              href={`${area.href}${area.keepsMonth ? monthSuffix : ""}`}
              className={`rounded-full px-2 py-2.5 text-center font-semibold transition-colors ${
                active
                  ? "bg-ru-blue text-white shadow-[0_2px_10px_rgba(91,123,255,0.35)]"
                  : "bg-white text-ru-ink/70 shadow-[0_1px_6px_rgba(46,46,46,0.06)]"
              }`}
            >
              {area.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href={`/dashboard/add${monthSuffix}`}
        aria-label="הוספה"
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-ru-blue px-6 py-4 text-base font-bold text-white shadow-[0_6px_20px_rgba(91,123,255,0.45)] hover:brightness-105"
      >
        <span className="text-2xl leading-none">＋</span>
        הוספה
      </Link>
    </>
  );
}
