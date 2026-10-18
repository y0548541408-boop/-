"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "סקירה", keepsMonth: true },
  { href: "/dashboard/transactions", label: "תנועות", keepsMonth: true },
  { href: "/dashboard/reports", label: "דוחות", keepsMonth: false },
  { href: "/dashboard/annual", label: "תקציב שנתי", keepsMonth: false },
  { href: "/dashboard/maaser", label: "מעשרות", keepsMonth: false },
  { href: "/dashboard/coaching", label: "פגישות ומשימות", keepsMonth: false },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const month = useSearchParams().get("month");
  const monthSuffix = month ? `?month=${month}` : "";

  return (
    <>
      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={`${item.href}${item.keepsMonth ? monthSuffix : ""}`}
              className={`shrink-0 rounded-full px-4 py-2 font-semibold transition-colors ${
                active
                  ? "bg-ru-blue text-white shadow-[0_2px_10px_rgba(91,123,255,0.35)]"
                  : "bg-white text-ru-ink/70 shadow-[0_1px_6px_rgba(46,46,46,0.06)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href={`/dashboard/add${monthSuffix}`}
        aria-label="הוספת תנועה"
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-ru-blue px-6 py-4 text-base font-bold text-white shadow-[0_6px_20px_rgba(91,123,255,0.45)] hover:brightness-105"
      >
        <span className="text-2xl leading-none">＋</span>
        הוספת תנועה
      </Link>
    </>
  );
}
