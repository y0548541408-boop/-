import type { ReactNode } from "react";
import { getCurrentFamilyMember, getViewAsFamilyId } from "@/lib/currentMember";
import { FamilyModeProvider } from "./FamilyMode";
import InstallPopup from "./InstallPopup";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const member = await getCurrentFamilyMember();
  const viewingAs = await getViewAsFamilyId();
  return (
    <FamilyModeProvider budgetOnly={member?.family.budgetOnly ?? false}>
      {viewingAs && (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-brand-teal px-4 py-2 text-sm text-white">
          <span>
            את/ה רואה את האזור כמו הלקוח: <strong>{member?.family.displayName}</strong>
          </span>
          <a href="/admin/view-as-exit" className="rounded-full bg-white px-3 py-1 font-bold text-brand-teal">
            חזרה לאזור המנהל
          </a>
        </div>
      )}
      <div className="client-app">{children}</div>
      <InstallPopup />
    </FamilyModeProvider>
  );
}
