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
import { signOut } from "@/app/login/actions";
import { removeRecurringExpense, completeTask } from "./actions";
import ExpenseTools from "./ExpenseTools";
import DocumentRow from "./DocumentRow";

function BarColor(percentUsed: number) {
  if (percentUsed >= 100) return "bg-red-500";
  if (percentUsed >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

function SpentTrend({ current, previous }: { current: number; previous: number }) {
  const delta = current - previous;
  if (Math.abs(delta) < 1) {
    return <span className="text-gray-400"> · כמו חודש שעבר</span>;
  }
  const isUp = delta > 0;
  return (
    <span className={isUp ? "text-red-500" : "text-emerald-600"}>
      {" "}
      · {isUp ? "▲" : "▼"} {Math.abs(delta).toFixed(0)} ₪ לעומת חודש שעבר
    </span>
  );
}

function CategoryCard({
  category,
  previousSpent,
}: {
  category: CategorySummary;
  previousSpent?: number;
}) {
  const percent = Math.min(category.percentUsed, 100);
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-900">{category.name}</span>
        <span className="text-xs text-gray-500">
          {category.spent.toFixed(0)} / {category.effectivePlanned.toFixed(0)} ₪
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full ${BarColor(category.percentUsed)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p
        className={`mt-1 text-xs ${
          category.remaining < 0 ? "text-red-600" : "text-gray-500"
        }`}
      >
        {category.remaining < 0
          ? `חריגה של ${Math.abs(category.remaining).toFixed(0)} ₪`
          : `נותרו ${category.remaining.toFixed(0)} ₪`}
        {category.recurringSpent > 0 &&
          ` · מתוכם ${category.recurringSpent.toFixed(0)} ₪ קבועות`}
        {previousSpent !== undefined && (
          <SpentTrend current={category.spent} previous={previousSpent} />
        )}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
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
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <p className="text-gray-600">
          המשתמש מאומת אך לא משויך לאף משפחה במערכת. פנה ליועץ שלך.
        </p>
      </main>
    );
  }

  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const summary = await getFamilyBudgetSummary(member.familyId);
  const previousSummary = await getFamilyBudgetSummary(member.familyId, previousMonth);
  const recurringExpenses = await getFamilyRecurringExpenses(member.familyId);
  const meetingSummaries = await getFamilyMeetingSummaries(member.familyId);
  const tasks = await getFamilyTasks(member.familyId);
  const taskProgress = await getFamilyTaskProgress(member.familyId);
  const savingsProgress = await getFamilySavingsProgress(member.familyId);
  const documents = await getFamilyDocuments(member.familyId);
  const openTasks = tasks.filter((t) => t.status !== "done");
  const latestMeeting = meetingSummaries[0];
  const fixed = summary.filter((c) => c.type === "fixed");
  const variable = summary.filter((c) => c.type === "variable");
  const previousSpentByCategory = new Map(previousSummary.map((c) => [c.id, c.spent]));

  const totalPlanned = summary.reduce((sum, c) => sum + c.effectivePlanned, 0);
  const totalSpent = summary.reduce((sum, c) => sum + c.spent, 0);
  const totalPercent = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;

  const monthLabel = new Date().toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-brand-navy">
              שלום, {member.fullName}
            </h1>
            <p className="text-sm text-gray-500">
              משפחת {member.family.displayName} · {monthLabel}
            </p>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-xs text-gray-400 underline">
              התנתקות
            </button>
          </form>
        </div>

        <div className="mt-4 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm shadow-brand-navy/5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-gray-700">התקציב החודשי</span>
            <span className="text-sm text-gray-500">
              {totalSpent.toFixed(0)} / {totalPlanned.toFixed(0)} ₪
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full ${BarColor(totalPercent)}`}
              style={{ width: `${Math.min(totalPercent, 100)}%` }}
            />
          </div>
        </div>

        {taskProgress.total > 0 && (
          <div className="mt-3 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm shadow-brand-navy/5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-gray-700">
                התקדמות במשימות
              </span>
              <span className="text-sm text-gray-500">
                {taskProgress.completed} מתוך {taskProgress.total} (
                {taskProgress.percent.toFixed(0)}%)
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-brand-gold"
                style={{ width: `${Math.min(taskProgress.percent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {savingsProgress && (
          <div className="mt-3 rounded-2xl border border-brand-gold/30 bg-white p-4 shadow-sm shadow-brand-navy/5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-gray-700">
                יעד החיסכון שלנו
              </span>
              <span className="text-sm text-gray-500">
                {savingsProgress.achieved.toFixed(0)} מתוך{" "}
                {savingsProgress.target.toFixed(0)} ₪ (
                {savingsProgress.percent.toFixed(0)}%)
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-brand-gold"
                style={{ width: `${Math.min(savingsProgress.percent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {latestMeeting?.nextFocus && (
          <div className="mt-4 rounded-2xl bg-brand-navy p-4 text-white shadow-sm">
            <p className="text-xs font-medium text-brand-gold">
              על מה נתמקד בפגישה הבאה
            </p>
            <p className="mt-1 text-sm leading-relaxed">{latestMeeting.nextFocus}</p>
          </div>
        )}

        {summary.length === 0 ? (
          <p className="mt-6 text-center text-sm text-gray-400">
            עדיין לא הוגדרו קטגוריות תקציב למשפחה הזו.
          </p>
        ) : (
          <>
            {fixed.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-2 text-sm font-semibold text-gray-700">הוצאות קבועות</h2>
                <div className="space-y-2">
                  {fixed.map((c) => (
                    <CategoryCard
                      key={c.id}
                      category={c}
                      previousSpent={previousSpentByCategory.get(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {variable.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-2 text-sm font-semibold text-gray-700">הוצאות משתנות</h2>
                <div className="space-y-2">
                  {variable.map((c) => (
                    <CategoryCard
                      key={c.id}
                      category={c}
                      previousSpent={previousSpentByCategory.get(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {recurringExpenses.length > 0 && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold text-gray-700">
                  הוצאות קבועות מוגדרות
                </h2>
                <div className="space-y-1">
                  {recurringExpenses.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-700">
                        {item.name}{" "}
                        <span className="text-gray-400">· {item.categoryName}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{item.amount.toFixed(0)} ₪</span>
                        <form action={removeRecurringExpense}>
                          <input type="hidden" name="id" value={item.id} />
                          <button
                            type="submit"
                            className="text-xs text-gray-400 hover:text-red-600"
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

            <ExpenseTools
              categories={summary.map((c) => ({
                id: c.id,
                name: c.name,
                type: c.type,
                remaining: c.remaining,
              }))}
            />
          </>
        )}

        {meetingSummaries.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-brand-navy">
              סיכומי הפגישות שלנו
            </h2>
            <div className="space-y-3">
              {meetingSummaries.map((meeting) => (
                <div
                  key={meeting.id}
                  className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm shadow-brand-navy/5"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-brand-navy">
                      {meeting.title}
                    </span>
                    <span className="text-xs text-gray-400">
                      {meeting.meetingDate.toLocaleDateString("he-IL")}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                    {meeting.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {openTasks.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-brand-navy">המשימות שלי</h2>
            <div className="space-y-2">
              {openTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm shadow-brand-navy/5"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-gray-800">
                      {task.title}
                    </span>
                    <span
                      className={`text-xs ${
                        task.isOverdue ? "font-medium text-red-600" : "text-gray-400"
                      }`}
                    >
                      {task.isOverdue ? "באיחור · " : ""}
                      {task.deadline.toLocaleDateString("he-IL")}
                    </span>
                  </div>
                  {task.description && (
                    <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {task.toolboxLink && (
                      <a
                        href={task.toolboxLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-navy underline"
                      >
                        כלי
                      </a>
                    )}
                    {task.videoUrl && (
                      <a
                        href={task.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-navy underline"
                      >
                        סרטון
                      </a>
                    )}
                  </div>
                  <form action={completeTask} className="mt-2">
                    <input type="hidden" name="id" value={task.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-navy-dark"
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
          <div className="mt-6 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm shadow-brand-navy/5">
            <h2 className="mb-1 text-sm font-semibold text-brand-navy">
              המסמכים וההקלטות שלנו
            </h2>
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
