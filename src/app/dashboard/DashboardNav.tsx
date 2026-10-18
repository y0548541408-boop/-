"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "סקירה", keepsMonth: true },
  { href: "/dashboard/transactions", label: "יומן תנועות", keepsMonth: true },
  { href: "/dashboard/reports", label: "דוחות", keepsMonth: false },
  { href: "/dashboard/annual", label: "תקציב שנתי", keepsMonth: false },
  { href: "/dashboard/maaser", label: "מעשרות", keepsMonth: false },
];

export default function DashboardNav() {
  const pathname = usePathname();
  const month = useSearchParams().get("month");
  const monthSuffix = month ? `?month=${month}` : "";

  return (
    <>
      <nav className="mt-3 flex gap-1 overflow-x-auto rounded-xl border border-brand-teal/10 bg-white p-1 text-xs shadow-sm">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={`${item.href}${item.keepsMonth ? monthSuffix : ""}`}
              className={`shrink-0 rounded-lg px-3 py-2 font-medium transition-colors ${
                active ? "bg-brand-teal text-white" : "text-gray-600 hover:bg-gray-50"
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
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 rounded-full bg-brand-teal px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-teal/30 hover:brightness-110"
      >
        <span className="text-xl leading-none">＋</span>
        הוספת תנועה
      </Link>
    </>
  );
}
