import type { ReactNode } from "react";
import { getCurrentFamilyMember } from "@/lib/currentMember";
import { FamilyModeProvider } from "./FamilyMode";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const member = await getCurrentFamilyMember();
  return (
    <FamilyModeProvider budgetOnly={member?.family.budgetOnly ?? false}>
      {children}
    </FamilyModeProvider>
  );
}
