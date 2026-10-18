// Kept out of SubTabs.tsx: that file is a client component, and server pages
// can't read plain values (like these arrays) exported from a client module.
export type SubTab = { path: string; label: string; keepsMonth?: boolean };

export const BUDGET_TABS: SubTab[] = [
  { path: "/dashboard", label: "החודש", keepsMonth: true },
  { path: "/dashboard/transactions", label: "יומן", keepsMonth: true },
  { path: "/dashboard/annual", label: "שנתי" },
  { path: "/dashboard/maaser", label: "מעשרות" },
];

// Budget-only clients have no tasks area, so reports live next to the budget.
export const BUDGET_ONLY_TABS: SubTab[] = [
  ...BUDGET_TABS,
  { path: "/dashboard/reports", label: "דוחות" },
];

export const TASKS_REPORTS_TABS: SubTab[] = [
  { path: "/dashboard/tasks", label: "משימות ופגישות" },
  { path: "/dashboard/reports", label: "דוחות" },
];
