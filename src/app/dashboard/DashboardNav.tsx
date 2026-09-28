"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "סקירה" },
  { href: "/dashboard/transactions", label: "יומן תנועות" },
  { href: "/dashboard/reports", label: "דוחות" },
  { href: "/dashboard/annual", label: "תקציב שנתי" },
  { href: "/dashboard/maaser", label: "מעשרות" },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-3 flex gap-1 overflow-x-auto rounded-xl border border-brand-navy/10 bg-white p-1 text-xs shadow-sm">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-lg px-3 py-2 font-medium transition-colors ${
              active ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
