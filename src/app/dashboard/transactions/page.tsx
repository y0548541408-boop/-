import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFamilyTransactionLog } from "@/lib/transactions";
import { parseMonthParam, shiftMonth } from "@/lib/month";
import DashboardNav from "../DashboardNav";
import MonthSwitcher from "../MonthSwitcher";
import SubTabs, { BUDGET_TABS } from "../SubTabs";
import TransactionRow from "./TransactionRow";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = parseMonthParam(monthParam);

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

  const entries = await getFamilyTransactionLog(member.familyId, {
    from: month,
    to: shiftMonth(month, 1),
    limit: 300,
  });

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-32 pt-6 text-ru-ink">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">יומן תנועות</h1>
        <p className="text-sm text-ru-muted">כל ההכנסות וההוצאות של החודש, מהחדש לישן</p>
        <DashboardNav />
        <SubTabs items={BUDGET_TABS} active="/dashboard/transactions" month={monthParam} />
        <MonthSwitcher month={month} basePath="/dashboard/transactions" />

        <div className="mt-4 space-y-2">
          {entries.length === 0 && (
            <p className="mt-8 text-center text-sm text-ru-muted">
              אין תנועות בחודש הזה. כפתור ההוספה בפינה יעשה את זה בשנייה.
            </p>
          )}
          {entries.map((e) => (
            <TransactionRow key={`${e.kind}-${e.id}`} entry={e} />
          ))}
        </div>
      </div>
    </main>
  );
}
