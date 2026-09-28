import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFamilyMonthlyTrend, getFamilyCategoryBreakdown } from "@/lib/reports";
import DashboardNav from "../DashboardNav";
import TrendChart from "./TrendChart";

export default async function ReportsPage() {
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

  const [trend, breakdown] = await Promise.all([
    getFamilyMonthlyTrend(member.familyId, 6),
    getFamilyCategoryBreakdown(member.familyId),
  ]);

  const thisMonth = trend[trend.length - 1];

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-semibold text-brand-navy">דוחות</h1>
        <p className="text-sm text-gray-500">מגמות והתפלגות לפי קטגוריה</p>
        <DashboardNav />

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-brand-navy/10 bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-gray-500">הכנסות</p>
            <p className="mt-1 font-semibold text-emerald-600">{thisMonth?.income.toFixed(0) ?? 0} ₪</p>
          </div>
          <div className="rounded-xl border border-brand-navy/10 bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-gray-500">הוצאות</p>
            <p className="mt-1 font-semibold text-red-600">{thisMonth?.expense.toFixed(0) ?? 0} ₪</p>
          </div>
          <div className="rounded-xl border border-brand-navy/10 bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-gray-500">נטו</p>
            <p className={`mt-1 font-semibold ${(thisMonth?.net ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {thisMonth?.net.toFixed(0) ?? 0} ₪
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-brand-navy/10 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">מגמת 6 חודשים אחרונים</h2>
          <TrendChart data={trend} />
        </div>

        <div className="mt-4 rounded-xl border border-brand-navy/10 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">הוצאות לפי קטגוריה (החודש)</h2>
          {breakdown.expenses.length === 0 ? (
            <p className="text-sm text-gray-400">אין נתונים לחודש זה</p>
          ) : (
            <div className="space-y-2">
              {breakdown.expenses.map((c) => (
                <div key={c.name} className="flex justify-between border-b border-gray-100 py-1.5 text-sm">
                  <span className="text-gray-700">{c.name}</span>
                  <span className="font-medium text-gray-900">{c.amount.toFixed(0)} ₪</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-brand-navy/10 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">הכנסות לפי קטגוריה (החודש)</h2>
          {breakdown.incomes.length === 0 ? (
            <p className="text-sm text-gray-400">אין נתונים לחודש זה</p>
          ) : (
            <div className="space-y-2">
              {breakdown.incomes.map((c) => (
                <div key={c.name} className="flex justify-between border-b border-gray-100 py-1.5 text-sm">
                  <span className="text-gray-700">{c.name}</span>
                  <span className="font-medium text-gray-900">{c.amount.toFixed(0)} ₪</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
