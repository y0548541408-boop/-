import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  getFamilyBudgetSummary,
  getFamilyRecurringExpenses,
  type CategorySummary,
} from "@/lib/budget";
import { getFamilyIncomeSummary } from "@/lib/income";
import { signOut } from "@/app/login/actions";
import { removeRecurringExpense } from "./actions";
import DashboardNav from "./DashboardNav";
import MonthSwitcher from "./MonthSwitcher";
import InstallHint from "./InstallHint";
import PlannedAmountEditor from "./PlannedAmountEditor";
import RiseCard, { formatShekel } from "./RiseCard";
import SubTabs from "./SubTabs";
import { BUDGET_TABS } from "./subTabItems";
import { parseMonthParam, shiftMonth } from "@/lib/month";
import { ensureDefaultCategories, familyHasNoCategories } from "@/lib/defaultCategories";
import { Logo } from "@/components/Logo";

function SpentTrend({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous;
  if (Math.abs(delta) < 1) return <span> · כמו חודש שעבר</span>;
  const isUp = delta > 0;
  return (
    <span className={isUp ? "text-ru-pink" : "text-ru-green"}>
      {" "}
      · {isUp ? "▲" : "▼"} {formatShekel(Math.abs(delta))} לעומת חודש שעבר
    </span>
  );
}

function ExpenseCategoryCard({
  category,
  previousSpent,
}: {
  category: CategorySummary;
  previousSpent?: number;
}) {
  const over = category.remaining < 0;
  return (
    <RiseCard
      title={category.name}
      actualLabel="יצא"
      actual={category.spent}
      expectedLabel="צפוי לצאת"
      expected={
        <PlannedAmountEditor
          kind="expense"
          categoryId={category.id}
          displayAmount={category.effectivePlanned}
          baseAmount={category.plannedAmount}
        />
      }
      percent={category.percentUsed}
      tone={over ? "pink" : "blue"}
      remaining={category.remaining}
      footer={
        category.recurringSpent > 0 || previousSpent !== undefined ? (
          <>
            {category.recurringSpent > 0 && `מתוכם ${formatShekel(category.recurringSpent)} קבועות`}
            {previousSpent !== undefined && (
              <SpentTrend current={category.spent} previous={previousSpent} />
            )}
          </>
        ) : undefined
      }
    />
  );
}

export default async function DashboardPage({
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

  if (!member) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ru-bg px-4 text-center">
        <p className="text-gray-600">
          עדיין לא שייכנו אתכם למשפחה במערכת. זה קורה — תנו ליועץ שלכם שנייה לסדר את זה.
        </p>
      </main>
    );
  }

  // First visit: walk the client through setting up their budget.
  if (!member.family.welcomedAt) redirect("/dashboard/welcome");

  // A brand-new client has no categories yet: start from Israel's Excel template.
  if (await familyHasNoCategories(member.familyId)) {
    await ensureDefaultCategories(member.familyId);
  }

  const previousMonth = shiftMonth(month, -1);

  const [summary, previousSummary, recurringExpenses, incomeSummary] = await Promise.all([
    getFamilyBudgetSummary(member.familyId, month),
    getFamilyBudgetSummary(member.familyId, previousMonth),
    getFamilyRecurringExpenses(member.familyId),
    getFamilyIncomeSummary(member.familyId, month),
  ]);
  const fixed = summary.filter((c) => c.type === "fixed");
  const variable = summary.filter((c) => c.type === "variable");
  const previousSpentByCategory = new Map(previousSummary.map((c) => [c.id, c.spent]));

  const totalPlanned = summary.reduce((sum, c) => sum + c.effectivePlanned, 0);
  const totalSpent = summary.reduce((sum, c) => sum + c.spent, 0);
  const totalPercent = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : totalSpent > 0 ? 100 : 0;

  const totalIncome = incomeSummary.reduce((sum, c) => sum + c.received, 0);
  const totalIncomePlanned = incomeSummary.reduce((sum, c) => sum + c.plannedAmount, 0);
  const totalIncomePercent =
    totalIncomePlanned > 0 ? (totalIncome / totalIncomePlanned) * 100 : totalIncome > 0 ? 100 : 0;
  const net = totalIncome - totalSpent;

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-32 pt-6 text-ru-ink">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <Logo size={15} markSize={22} />
          <form action={signOut}>
            <button type="submit" className="text-xs text-ru-muted underline">
              התנתקות
            </button>
          </form>
        </div>

        <h1 className="mt-5 text-2xl font-bold">שלום, {member.fullName}</h1>
        <p className="text-sm text-ru-muted">משפחת {member.family.displayName}</p>

        <DashboardNav />
        <SubTabs items={BUDGET_TABS} active="/dashboard" month={monthParam} />
        <MonthSwitcher month={month} basePath="/dashboard" />
        <InstallHint />

        <div className="mt-5 space-y-3">
          <RiseCard
            size="lg"
            title="הכנסות"
            actualLabel="נכנס"
            actual={totalIncome}
            expectedLabel="צפוי להיכנס"
            expected={formatShekel(totalIncomePlanned)}
            percent={totalIncomePercent}
            tone="green"
          />
          <RiseCard
            size="lg"
            title="הוצאות"
            actualLabel="יצא"
            actual={totalSpent}
            expectedLabel="צפוי לצאת"
            expected={formatShekel(totalPlanned)}
            percent={totalPercent}
            tone="pink"
            remaining={totalPlanned - totalSpent}
          />
          <div
            className={`flex items-center justify-between rounded-3xl px-5 py-4 ${
              net < 0 ? "bg-ru-pink-soft" : "bg-ru-green-soft"
            }`}
          >
            <span className="text-sm font-semibold text-ru-ink">
              {net < 0 ? "החודש עוד לא נסגר" : "עודף החודש"}
            </span>
            <span
              className={`text-2xl font-bold ${net < 0 ? "text-ru-pink" : "text-ru-green"}`}
            >
              {net < 0 ? "▼ -" : "▲ +"}
              {formatShekel(Math.abs(net))}
            </span>
          </div>
        </div>

        {summary.length === 0 ? (
          <p className="mt-6 text-center text-sm text-ru-muted">
            התקציב שלכם עוד לא נבנה. זה קורה יחד, בפגישה הראשונה.
          </p>
        ) : (
          <>
            {fixed.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 text-lg font-bold">הוצאות קבועות</h2>
                <div className="space-y-3">
                  {fixed.map((c) => (
                    <ExpenseCategoryCard
                      key={c.id}
                      category={c}
                      previousSpent={previousSpentByCategory.get(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {variable.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 text-lg font-bold">הוצאות משתנות</h2>
                <div className="space-y-3">
                  {variable.map((c) => (
                    <ExpenseCategoryCard
                      key={c.id}
                      category={c}
                      previousSpent={previousSpentByCategory.get(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {recurringExpenses.length > 0 && (
              <div className="mt-8 rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]">
                <h2 className="mb-3 text-lg font-bold">הוצאות קבועות מוגדרות</h2>
                <div className="space-y-2">
                  {recurringExpenses.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span>
                        {item.name} <span className="text-ru-muted">· {item.categoryName}</span>
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{formatShekel(item.amount)}</span>
                        <form action={removeRecurringExpense}>
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            type="submit"
                            className="text-xs text-ru-muted hover:text-ru-pink"
                            aria-label="הסרת הוצאה קבועה"
                          >
                            הסר
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {incomeSummary.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-bold">הכנסות</h2>
            <div className="space-y-3">
              {incomeSummary.map((c) => (
                <RiseCard
                  key={c.id}
                  title={c.name}
                  actualLabel="נכנס"
                  actual={c.received}
                  expectedLabel="צפוי להיכנס"
                  expected={
                    <PlannedAmountEditor
                      kind="income"
                      categoryId={c.id}
                      displayAmount={c.plannedAmount}
                      baseAmount={c.plannedAmount}
                    />
                  }
                  percent={
                    c.plannedAmount > 0 ? (c.received / c.plannedAmount) * 100 : c.received > 0 ? 100 : 0
                  }
                  tone="green"
                  footer={
                    c.remaining > 0 ? `עוד ${formatShekel(c.remaining)} לצפי` : "התקבל במלואו"
                  }
                />
              ))}
            </div>
          </div>
        )}

        <Link
          href="/dashboard/categories"
          className="mt-8 block rounded-full bg-white px-5 py-4 text-center text-base font-bold text-ru-blue shadow-[0_2px_14px_rgba(46,46,46,0.07)]"
        >
          ניהול הקטגוריות שלי
        </Link>
      </div>
    </main>
  );
}
