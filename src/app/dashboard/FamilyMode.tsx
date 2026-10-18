"use client";

import { createContext, useContext, type ReactNode } from "react";

// Whether this family only gets the budget app (no tasks, meetings, net worth).
const BudgetOnlyContext = createContext(false);

export function FamilyModeProvider({
  budgetOnly,
  children,
}: {
  budgetOnly: boolean;
  children: ReactNode;
}) {
  return <BudgetOnlyContext.Provider value={budgetOnly}>{children}</BudgetOnlyContext.Provider>;
}

export function useBudgetOnly(): boolean {
  return useContext(BudgetOnlyContext);
}
