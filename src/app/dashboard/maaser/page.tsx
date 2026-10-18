import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFamilyMaaserSummary } from "@/lib/maaser";
import DashboardNav from "../DashboardNav";
import SubTabs, { BUDGET_TABS } from "../SubTabs";
import MaaserTools from "./MaaserTools";

export default async function MaaserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.familyMember.findUnique({
    where: { authUserId: user.id },
    include: { family: true },
  });
  if (!member) redirect("/login");

  const summary = await getFamilyMaaserSummary(member.familyId);
  const monthLabel = new Date().toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-32 pt-6 text-ru-ink">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">מעשרות</h1>
        <p className="text-sm text-ru-muted">מעקב אחר חובת מעשר לפי הכנסה — {monthLabel}</p>
        <DashboardNav />
        <SubTabs items={BUDGET_TABS} active="/dashboard/maaser" />

        <MaaserTools summary={summary} />
      </div>
    </main>
  );
}
