"use client";

import Link from "next/link";
import { useBudgetOnly } from "./FamilyMode";
import { BUDGET_ONLY_TABS, type SubTab } from "./subTabItems";

// Segmented control for switching between screens inside one main area.
export default function SubTabs({
  items,
  active,
  month,
}: {
  items: SubTab[];
  active: string;
  month?: string;
}) {
  const budgetOnly = useBudgetOnly();
  const tabs = budgetOnly ? BUDGET_ONLY_TABS : items;

  return (
    <div className="mt-5 flex rounded-full bg-white p-1 shadow-[0_1px_6px_rgba(46,46,46,0.06)]">
      {tabs.map((item) => (
        <Link
          key={item.path}
          href={`${item.path}${item.keepsMonth && month ? `?month=${month}` : ""}`}
          className={`flex-1 rounded-full px-2 py-2 text-center text-sm font-semibold transition-colors ${
            item.path === active ? "bg-ru-blue-soft text-ru-blue" : "text-ru-ink/60"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
