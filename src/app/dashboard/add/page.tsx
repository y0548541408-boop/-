import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFamilyBudgetSummary } from "@/lib/budget";
import { getFamilyIncomeSummary } from "@/lib/income";
import { defaultEntryDate, formatMonthParam, parseMonthParam } from "@/lib/month";
import { ensureDefaultCategories, familyHasNoCategories } from "@/lib/defaultCategories";
import AddTabs from "./AddTabs";

export default async function AddTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.familyMember.findUnique({
    where: { authUserId: user.id },
  });
  if (!member) redirect("/login");

  if (await familyHasNoCategories(member.familyId)) {
    await ensureDefaultCategories(member.familyId);
  }

  const { month: monthParam } = await searchParams;
  const month = parseMonthParam(monthParam);

  const [expenseSummary, incomeSummary] = await Promise.all([
    getFamilyBudgetSummary(member.familyId, month),
    getFamilyIncomeSummary(member.familyId, month),
  ]);

  const backHref = `/dashboard?month=${formatMonthParam(month)}`;

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-10 pt-6 text-ru-ink">
      <div className="mx-auto max-w-md">
        <Link href={backHref} className="text-sm font-medium text-ru-blue">
          ← חזרה לסקירה
        </Link>
        <h1 className="mt-2 text-2xl font-bold">הוספת תנועה</h1>
        <p className="text-sm text-ru-muted">הכנסה או הוצאה — מתעדכן מיד בתקציב</p>

        <AddTabs
          expenseCategories={expenseSummary.filter((c) => c.isActive).map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            remaining: c.remaining,
          }))}
          incomeCategories={incomeSummary.filter((c) => c.isActive).map((c) => ({ id: c.id, name: c.name }))}
          defaultDate={defaultEntryDate(month)}
        />
      </div>
    </main>
  );
}
