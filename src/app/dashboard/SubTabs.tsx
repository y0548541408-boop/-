import Link from "next/link";

type SubTab = { path: string; label: string; keepsMonth?: boolean };

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
  return (
    <div className="mt-5 flex rounded-full bg-white p-1 shadow-[0_1px_6px_rgba(46,46,46,0.06)]">
      {items.map((item) => (
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

export const BUDGET_TABS: SubTab[] = [
  { path: "/dashboard", label: "החודש", keepsMonth: true },
  { path: "/dashboard/transactions", label: "תנועות", keepsMonth: true },
  { path: "/dashboard/annual", label: "שנתי" },
  { path: "/dashboard/maaser", label: "מעשרות" },
];

export const TASKS_REPORTS_TABS: SubTab[] = [
  { path: "/dashboard/tasks", label: "משימות ופגישות" },
  { path: "/dashboard/reports", label: "דוחות" },
];
