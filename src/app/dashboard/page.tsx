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
import { getFamilyTasks } from "@/lib/tasks";
import { signOut } from "@/app/login/actions";
import { removeRecurringExpense } from "./actions";
import DashboardNav from "./DashboardNav";
import MonthSwitcher from "./MonthSwitcher";
import InstallHint from "./InstallHint";
import PlannedAmountEditor from "./PlannedAmountEditor";
import { formatShekel } from "./RiseCard";
import SubTabs from "./SubTabs";
import { BUDGET_TABS } from "./subTabItems";
import { parseMonthParam, shiftMonth } from "@/lib/month";
import { ensureDefaultCategories, familyHasNoCategories } from "@/lib/defaultCategories";
import { Logo } from "@/components/Logo";

function greeting(): string {
  const hour = Number(
    new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Jerusalem" })
  );
  if (hour >= 5 && hour < 12) return "בוקר טוב";
  if (hour >= 12 && hour < 17) return "צהריים טובים";
  if (hour >= 17 && hour < 22) return "ערב טוב";
  return "לילה טוב";
}

// One budget line: how much went out of how much was planned, and what is left.
function CategoryRow({ category, previousSpent }: { category: CategorySummary; previousSpent?: number }) {
  const planned = category.effectivePlanned;
  const over = category.remaining < 0;
  const percent = planned > 0 ? (category.spent / planned) * 100 : category.spent > 0 ? 100 : 0;
  const tight = !over && planned > 0 && percent >= 85;
  const bar = over ? "bg-ru-pink" : tight ? "bg-brand-mand" : "bg-ru-blue";
  const delta = previousSpent !== undefined ? category.spent - previousSpent : 0;

  return (
    <div className="rounded-2xl bg-white px-4 py-3.5 shadow-[0_2px_12px_rgba(11,95,88,0.06)]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-bold">{category.name}</span>
        <span className="flex shrink-0 items-baseline gap-1 text-base">
          <span className="font-num font-bold">{formatShekel(category.spent)}</span>
          <span className="text-ru-muted">/</span>
          <PlannedAmountEditor
            kind="expense"
            categoryId={category.id}
            displayAmount={planned}
            baseAmount={category.plannedAmount}
          />
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ru-blue-soft">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }} />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span className={over ? "font-bold text-ru-pink" : tight ? "font-bold text-brand-mand" : "text-ru-muted"}>
          {planned === 0 && category.spent === 0
            ? "עוד לא תוכנן"
            : over
              ? `חריגה של ${formatShekel(-category.remaining)}`
              : `נשארו ${formatShekel(category.remaining)}${tight ? ", שימו לב" : ""}`}
        </span>
        {previousSpent !== undefined && Math.abs(delta) >= 1 && (
          <span className="text-ru-muted">
            {delta > 0 ? "▲" : "▼"} {formatShekel(Math.abs(delta))} מחודש שעבר
          </span>
        )}
      </div>
      {category.recurringSpent > 0 && (
        <p className="text-sm text-ru-muted">מתוכם {formatShekel(category.recurringSpent)} קבועות</p>
      )}
    </div>
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
        <p className="text-base text-ru-muted">
          עדיין לא שייכנו אתכם למשפחה במערכת. זה קורה, תנו ליועץ שלכם שנייה לסדר את זה.
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

  const [summary, previousSummary, recurringExpenses, incomeSummary, tasks] = await Promise.all([
    getFamilyBudgetSummary(member.familyId, month),
    getFamilyBudgetSummary(member.familyId, previousMonth),
    getFamilyRecurringExpenses(member.familyId),
    getFamilyIncomeSummary(member.familyId, month),
    member.family.budgetOnly ? Promise.resolve([]) : getFamilyTasks(member.familyId),
  ]);
  const nextTask = tasks.find((t) => t.status !== "done");
  const fixed = summary.filter((c) => c.type === "fixed");
  const variable = summary.filter((c) => c.type === "variable");
  const previousSpentByCategory = new Map(previousSummary.map((c) => [c.id, c.spent]));

  const totalPlanned = summary.reduce((sum, c) => sum + c.effectivePlanned, 0);
  const totalSpent = summary.reduce((sum, c) => sum + c.spent, 0);
  const totalPercent = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : totalSpent > 0 ? 100 : 0;

  const totalIncome = incomeSummary.reduce((sum, c) => sum + c.received, 0);
  const totalIncomePlanned = incomeSummary.reduce((sum, c) => sum + c.plannedAmount, 0);
  const net = totalIncome - totalSpent;
  const leftThisMonth = totalPlanned - totalSpent;
  const hasPlan = totalPlanned > 0;

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-44 pt-5 lg:ps-64 lg:pb-12 text-ru-ink">
      <div className="mx-auto max-w-md lg:max-w-5xl">
        <div className="flex items-center justify-between">
          <Logo size={16} markSize={30} />
          <form action={signOut}>
            <button type="submit" className="min-h-11 px-2 text-sm text-ru-muted underline">
              יציאה
            </button>
          </form>
        </div>

        <p className="mt-5 text-base text-ru-muted">
          {greeting()}, {member.fullName}
        </p>
        <h1 className="text-3xl text-ru-blue">החודש שלכם</h1>

        <SubTabs items={BUDGET_TABS} active="/dashboard" month={monthParam} />
        <MonthSwitcher month={month} basePath="/dashboard" />

        {hasPlan ? (
          <div className="mt-4 rounded-3xl bg-ru-blue p-5 text-white shadow-[0_8px_24px_rgba(11,95,88,0.3)]">
            <p className="text-base text-white/80">{leftThisMonth < 0 ? "יצא יותר מהתכנון" : "נשאר לכם החודש"}</p>
            <p className="font-num text-5xl font-bold leading-tight">{formatShekel(Math.abs(leftThisMonth))}</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20">
              <div
                className={`h-full rounded-full ${leftThisMonth < 0 ? "bg-white" : "bg-brand-mand"}`}
                style={{ width: `${Math.max(0, Math.min(totalPercent, 100))}%` }}
              />
            </div>
            <p className="mt-2 text-base text-white/85">
              הוצאתם <span className="font-num font-bold">{formatShekel(totalSpent)}</span> מתוך{" "}
              <span className="font-num font-bold">{formatShekel(totalPlanned)}</span> שתכננתם
            </p>
          </div>
        ) : (
          <Link
            href="/dashboard/mapping"
            className="mt-4 block rounded-3xl bg-ru-blue p-5 text-white shadow-[0_8px_24px_rgba(11,95,88,0.3)]"
          >
            <p className="font-display text-2xl">בואו נבנה את התקציב</p>
            <p className="mt-1 text-base text-white/85">
              מתחילים מהמיפוי: מעלים את הפירוט מהבנק ורואים לאן הלך הכסף. משם קובעים כמה מוציאים מעכשיו.
            </p>
            <span className="mt-3 inline-flex min-h-12 items-center rounded-2xl bg-brand-mand px-5 font-bold">
              להתחיל במיפוי ←
            </span>
          </Link>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(11,95,88,0.06)]">
            <p className="text-sm text-ru-muted">נכנס החודש</p>
            <p className="font-num text-2xl font-bold text-ru-green">{formatShekel(totalIncome)}</p>
            {totalIncomePlanned > 0 && (
              <p className="text-sm text-ru-muted">מתוך {formatShekel(totalIncomePlanned)} צפוי</p>
            )}
          </div>
          <div className={`rounded-2xl p-4 ${net < 0 ? "bg-ru-pink-soft" : "bg-ru-green-soft"}`}>
            <p className="text-sm text-ru-ink/70">{net < 0 ? "עוד לא נסגר" : "עודף עד עכשיו"}</p>
            <p className={`font-num text-2xl font-bold ${net < 0 ? "text-ru-pink" : "text-ru-green"}`}>
              {net < 0 ? "-" : "+"}
              {formatShekel(Math.abs(net))}
            </p>
            <p className="text-sm text-ru-ink/70">נכנס פחות יצא</p>
          </div>
        </div>

        {nextTask && (
          <Link
            href="/dashboard/tasks"
            className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(11,95,88,0.06)]"
          >
            <span className="h-6 w-6 shrink-0 rounded-full border-[2.5px] border-brand-mand" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-ru-muted">
                {nextTask.isOverdue ? "משימה שעבר הזמן שלה" : "המשימה הבאה שלכם"}
              </span>
              <span className="block truncate font-bold">{nextTask.title}</span>
            </span>
            <span className="text-ru-blue" aria-hidden>
              ←
            </span>
          </Link>
        )}

        <InstallHint />

        {fixed.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-2xl text-ru-blue">הוצאות קבועות</h2>
            <div className="space-y-2.5">
              {fixed.map((c) => (
                <CategoryRow key={c.id} category={c} previousSpent={previousSpentByCategory.get(c.id)} />
              ))}
            </div>
          </section>
        )}

        {variable.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-2xl text-ru-blue">הוצאות משתנות</h2>
            <div className="space-y-2.5">
              {variable.map((c) => (
                <CategoryRow key={c.id} category={c} previousSpent={previousSpentByCategory.get(c.id)} />
              ))}
            </div>
          </section>
        )}

        {recurringExpenses.length > 0 && (
          <section className="mt-8 rounded-3xl bg-white p-5 shadow-[0_2px_12px_rgba(11,95,88,0.06)]">
            <h2 className="mb-2 text-xl text-ru-blue">הוראות קבע שנכנסות לבד</h2>
            <div className="divide-y divide-ru-line">
              {recurringExpenses.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-base">
                  <span>
                    {item.name} <span className="text-ru-muted">· {item.categoryName}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-num font-bold">{formatShekel(item.amount)}</span>
                    <form action={removeRecurringExpense}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        className="min-h-11 px-2 text-sm text-ru-muted hover:text-ru-pink"
                        aria-label={`הסרת ${item.name}`}
                      >
                        הסרה
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {incomeSummary.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-2xl text-ru-blue">הכנסות</h2>
            <div className="space-y-2.5">
              {incomeSummary.map((c) => {
                const pct = c.plannedAmount > 0 ? (c.received / c.plannedAmount) * 100 : c.received > 0 ? 100 : 0;
                return (
                  <div key={c.id} className="rounded-2xl bg-white px-4 py-3.5 shadow-[0_2px_12px_rgba(11,95,88,0.06)]">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-lg font-bold">{c.name}</span>
                      <span className="flex shrink-0 items-baseline gap-1 text-base">
                        <span className="font-num font-bold text-ru-green">{formatShekel(c.received)}</span>
                        <span className="text-ru-muted">/</span>
                        <PlannedAmountEditor
                          kind="income"
                          categoryId={c.id}
                          displayAmount={c.plannedAmount}
                          baseAmount={c.plannedAmount}
                        />
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ru-green-soft">
                      <div className="h-full rounded-full bg-ru-green" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="mt-1.5 text-sm text-ru-muted">
                      {c.plannedAmount === 0 && c.received === 0
                        ? "עוד לא תוכנן"
                        : c.remaining > 0
                          ? `עוד ${formatShekel(c.remaining)} צפוי להיכנס`
                          : "התקבל במלואו"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <Link
          href="/dashboard/categories"
          className="mt-8 flex min-h-14 items-center justify-center rounded-2xl bg-white px-5 text-base font-bold text-ru-blue shadow-[0_2px_12px_rgba(11,95,88,0.06)]"
        >
          ניהול הקטגוריות שלי
        </Link>
        <DashboardNav />
      </div>
    </main>
  );
}
