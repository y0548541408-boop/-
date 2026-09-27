import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  getFamilyBudgetSummary,
  getFamilyRecurringExpenses,
  type CategorySummary,
} from "@/lib/budget";
import { getFamilyMeetingSummaries } from "@/lib/meetings";
import { signOut } from "@/app/login/actions";
import { removeRecurringExpense } from "./actions";
import ExpenseTools from "./ExpenseTools";

function BarColor(percentUsed: number) {
  if (percentUsed >= 100) return "bg-red-500";
  if (percentUsed >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

function CategoryCard({ category }: { category: CategorySummary }) {
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

  const summary = await getFamilyBudgetSummary(member.familyId);
  const recurringExpenses = await getFamilyRecurringExpenses(member.familyId);
  const meetingSummaries = await getFamilyMeetingSummaries(member.familyId);
  const latestMeeting = meetingSummaries[0];
  const fixed = summary.filter((c) => c.type === "fixed");
  const variable = summary.filter((c) => c.type === "variable");

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
                    <CategoryCard key={c.id} category={c} />
                  ))}
                </div>
              </div>
            )}

            {variable.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-2 text-sm font-semibold text-gray-700">הוצאות משתנות</h2>
                <div className="space-y-2">
                  {variable.map((c) => (
                    <CategoryCard key={c.id} category={c} />
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
      </div>
    </main>
  );
}
