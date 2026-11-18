import type { ReactNode } from "react";
import { getCurrentFamilyMember } from "@/lib/currentMember";
import { FamilyModeProvider } from "./FamilyMode";
import InstallPopup from "./InstallPopup";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const member = await getCurrentFamilyMember();
  return (
    <FamilyModeProvider budgetOnly={member?.family.budgetOnly ?? false}>
      <div className="client-app">{children}</div>
      <InstallPopup />
    </FamilyModeProvider>
  );
}
