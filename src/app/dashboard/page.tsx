import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  getFamilyBudgetSummary,
  getFamilyRecurringExpenses,
  type CategorySummary,
} from "@/lib/budget";
import { getFamilyMeetingSummaries } from "@/lib/meetings";
import { getFamilyTasks, getFamilyTaskProgress, getFamilySavingsProgress } from "@/lib/tasks";
import { getFamilyDocuments } from "@/lib/documents";
import { getFamilyIncomeSummary } from "@/lib/income";
import { signOut } from "@/app/login/actions";
import { removeRecurringExpense, completeTask } from "./actions";
import DocumentRow from "./DocumentRow";
import DashboardNav from "./DashboardNav";
import MonthSwitcher from "./MonthSwitcher";
import InstallHint from "./InstallHint";
import PlannedAmountEditor from "./PlannedAmountEditor";
import RiseCard, { formatShekel } from "./RiseCard";
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
      footer={
        <>
          {over ? (
            <span className="font-semibold text-ru-pink">
              חריגה של {formatShekel(Math.abs(category.remaining))}
            </span>
          ) : (
            <span>נותרו {formatShekel(category.remaining)}</span>
          )}
          {category.recurringSpent > 0 && ` · מתוכם ${formatShekel(category.recurringSpent)} קבועות`}
          {previousSpent !== undefined && (
            <SpentTrend current={category.spent} previous={previousSpent} />
          )}
        </>
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

  // A brand-new client has no categories yet: start from Israel's Excel template.
  if (await familyHasNoCategories(member.familyId)) {
    await ensureDefaultCategories(member.familyId);
  }

  const previousMonth = shiftMonth(month, -1);

  const [
    summary,
    previousSummary,
    recurringExpenses,
    meetingSummaries,
    tasks,
    taskProgress,
    savingsProgress,
    documents,
    incomeSummary,
  ] = await Promise.all([
    getFamilyBudgetSummary(member.familyId, month),
    getFamilyBudgetSummary(member.familyId, previousMonth),
    getFamilyRecurringExpenses(member.familyId),
    getFamilyMeetingSummaries(member.familyId),
    getFamilyTasks(member.familyId),
    getFamilyTaskProgress(member.familyId),
    getFamilySavingsProgress(member.familyId),
    getFamilyDocuments(member.familyId),
    getFamilyIncomeSummary(member.familyId, month),
  ]);
  const openTasks = tasks.filter((t) => t.status !== "done");
  const latestMeeting = meetingSummaries[0];
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
          />
          <div
            className={`flex items-center justify-between rounded-3xl px-5 py-4 ${
              net < 0 ? "bg-ru-pink-soft" : "bg-ru-green-soft"
            }`}
          >
            <span className="text-sm font-semibold text-ru-ink">
              {net < 0 ? "גירעון החודש" : "עודף החודש"}
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

        {(taskProgress.total > 0 || savingsProgress) && (
          <div className="mt-8 space-y-3">
            <h2 className="text-lg font-bold">היעדים שלנו</h2>
            {taskProgress.total > 0 && (
              <div className="rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold">התקדמות במשימות</h3>
                  <span className="text-sm font-semibold text-ru-blue">
                    {taskProgress.completed} מתוך {taskProgress.total}
                  </span>
                </div>
                <div className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-ru-blue-soft">
                  <div
                    className="h-full rounded-full bg-ru-blue"
                    style={{ width: `${Math.min(taskProgress.percent, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {savingsProgress && (
              <RiseCard
                title="יעד החיסכון שלנו"
                actualLabel="הושג"
                actual={savingsProgress.achieved}
                expectedLabel="יעד"
                expected={formatShekel(savingsProgress.target)}
                percent={savingsProgress.percent}
                tone="green"
              />
            )}
          </div>
        )}

        {latestMeeting?.nextFocus && (
          <div className="mt-6 rounded-3xl bg-ru-blue p-5 text-white shadow-[0_6px_20px_rgba(91,123,255,0.35)]">
            <p className="text-xs font-semibold text-white/80">על מה נתמקד בפגישה הבאה</p>
            <p className="mt-1 text-base font-medium leading-relaxed">{latestMeeting.nextFocus}</p>
          </div>
        )}

        {meetingSummaries.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-bold">סיכומי הפגישות שלנו</h2>
            <div className="space-y-3">
              {meetingSummaries.map((meeting) => (
                <div
                  key={meeting.id}
                  className="rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold">{meeting.title}</span>
                    <span className="text-xs text-ru-muted">
                      {meeting.meetingDate.toLocaleDateString("he-IL")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ru-ink/70">{meeting.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {openTasks.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-bold">המשימות שלי</h2>
            <div className="space-y-3">
              {openTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-bold">{task.title}</span>
                    <span
                      className={`shrink-0 text-xs ${
                        task.isOverdue ? "font-semibold text-ru-pink" : "text-ru-muted"
                      }`}
                    >
                      {task.isOverdue ? "באיחור · " : ""}
                      {task.deadline.toLocaleDateString("he-IL")}
                    </span>
                  </div>
                  {task.description && (
                    <p className="mt-1 text-sm text-ru-ink/70">{task.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {task.toolboxLink && (
                      <a
                        href={task.toolboxLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-ru-blue underline"
                      >
                        כלי
                      </a>
                    )}
                    {task.videoUrl && (
                      <a
                        href={task.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-ru-blue underline"
                      >
                        סרטון
                      </a>
                    )}
                  </div>
                  <form action={completeTask} className="mt-3">
                    <input type="hidden" name="id" value={task.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-ru-blue px-4 py-2 text-xs font-bold text-white"
                    >
                      סמן כהושלם
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {documents.length > 0 && (
          <div className="mt-8 rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]">
            <h2 className="text-lg font-bold">המסמכים וההקלטות שלנו</h2>
            <div className="mt-2">
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  storagePath={doc.storagePath}
                  filename={doc.filename}
                  tag={doc.tag}
                  date={doc.createdAt.toLocaleDateString("he-IL")}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
