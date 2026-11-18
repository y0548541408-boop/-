"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useBudgetOnly } from "./FamilyMode";
import { Logo } from "@/components/Logo";

// The app's bottom tab bar: four areas, where the thumb reaches. Every inner
// screen belongs to one area, so the right tab stays lit wherever you are.
type Area = {
  href: string;
  label: string;
  keepsMonth: boolean;
  prefixes: string[];
  icon: React.ReactNode;
  personal?: boolean;
};

const ICON = "h-6 w-6";
const AREAS: Area[] = [
  {
    href: "/dashboard",
    label: "החודש",
    keepsMonth: true,
    prefixes: ["/dashboard/transactions", "/dashboard/annual", "/dashboard/maaser", "/dashboard/categories", "/dashboard/add"],
    icon: (
      <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="4.5" width="18" height="16.5" rx="3.5" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/plan",
    label: "תכנון",
    keepsMonth: false,
    prefixes: [],
    icon: (
      <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M4 20V11M10 20V5M16 20v-6M21 20H3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/mapping",
    label: "מיפוי",
    keepsMonth: false,
    prefixes: [],
    icon: (
      <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M5 4h10l4 4v12H5z" strokeLinejoin="round" />
        <path d="M14 4v5h5M8.5 13h7M8.5 16.5h5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/dashboard/tasks",
    label: "אזור אישי",
    keepsMonth: false,
    prefixes: ["/dashboard/reports", "/dashboard/networth"],
    personal: true,
    icon: (
      <svg viewBox="0 0 24 24" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.2 3.6-6.5 8-6.5s8 2.3 8 6.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

function isActive(pathname: string, area: Area) {
  if (pathname === area.href) return true;
  if (area.href !== "/dashboard" && pathname.startsWith(`${area.href}/`)) return true;
  return area.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function DashboardNav() {
  const pathname = usePathname();
  const budgetOnly = useBudgetOnly();
  const month = useSearchParams().get("month");
  const monthSuffix = month ? `?month=${month}` : "";
  const areas = AREAS.filter((a) => !(budgetOnly && a.personal));
  // The floating "add" button would sit on top of the amount fields in the
  // mapping and plan screens, which are all about typing numbers.
  const showAdd = !["/dashboard/add", "/dashboard/mapping", "/dashboard/plan"].some((p) =>
    pathname.startsWith(p)
  );

  return (
    <>
      {showAdd && (
        <Link
          href={`/dashboard/add${monthSuffix}`}
          aria-label="הוספת הוצאה או הכנסה"
          className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-4 z-40 flex min-h-14 lg:bottom-8 lg:left-8 items-center gap-2 rounded-full bg-brand-mand px-5 text-lg font-bold text-white shadow-[0_8px_22px_rgba(255,106,43,0.45)] active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          הוספה
        </Link>
      )}

      <nav
        aria-label="ניווט ראשי"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ru-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:inset-x-auto lg:inset-y-0 lg:right-0 lg:w-60 lg:border-l lg:border-t-0 lg:bg-white lg:px-3 lg:pb-6 lg:pt-6"
      >
        <div className="mb-6 hidden px-2 lg:block">
          <Logo size={17} markSize={34} />
        </div>
        <div className="mx-auto flex max-w-md lg:max-w-none lg:flex-col lg:gap-1">
          {areas.map((area) => {
            const active = isActive(pathname, area);
            return (
              <Link
                key={area.href}
                href={`${area.href}${area.keepsMonth ? monthSuffix : ""}`}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-sm font-bold transition-colors lg:min-h-14 lg:flex-none lg:flex-row lg:justify-start lg:gap-3 lg:rounded-2xl lg:px-3 lg:text-lg ${
                  active ? "text-ru-blue lg:bg-ru-blue-soft" : "text-ru-muted lg:hover:bg-ru-bg"
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors lg:w-8 ${
                    active ? "bg-ru-blue-soft lg:bg-transparent" : ""
                  }`}
                >
                  {area.icon}
                </span>
                {area.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
