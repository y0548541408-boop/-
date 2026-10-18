import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFamilyAnnualBudget, type AnnualCategoryRow } from "@/lib/annualBudget";
import DashboardNav from "../DashboardNav";

const MONTH_LABELS = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];

function cellClass(actual: number, planned: number) {
  if (planned <= 0) return "text-ru-muted";
  const pct = (actual / planned) * 100;
  if (pct > 100) return "text-ru-pink font-bold";
  if (pct >= 80) return "text-amber-600";
  return "text-ru-ink";
}

function CategoryTable({ title, rows, planned }: { title: string; rows: AnnualCategoryRow[]; planned: "expense" | "income" }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-4">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="overflow-x-auto rounded-3xl bg-white shadow-[0_2px_14px_rgba(46,46,46,0.07)]">
        <table className="w-full min-w-[720px] text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-ru-muted">
              <th className="p-2 text-right">קטגוריה</th>
              <th className="p-2 text-right">מתוכנן/חודש</th>
              {MONTH_LABELS.map((m) => (
                <th key={m} className="p-2 text-center">
                  {m}
                </th>
              ))}
              <th className="p-2 text-center">שנתי</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-50">
                <td className="p-2 font-medium text-ru-ink">{row.name}</td>
                <td className="p-2 text-ru-muted">{row.planned.toFixed(0)} ₪</td>
                {row.actualByMonth.map((v, i) => (
                  <td key={i} className={`p-2 text-center ${planned === "expense" ? cellClass(v, row.planned) : "text-ru-ink"}`}>
                    {v > 0 ? v.toFixed(0) : "—"}
                  </td>
                ))}
                <td className="p-2 text-center font-semibold text-ru-ink">{row.yearActual.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AnnualPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
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

  const params = await searchParams;
  const year = params.year ? Number(params.year) : new Date().getFullYear();
  const table = await getFamilyAnnualBudget(member.familyId, year);

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-32 pt-6 text-ru-ink">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">תקציב שנתי {year}</h1>
            <p className="text-sm text-ru-muted">תכנון מול בפועל, לפי קטגוריה וחודש</p>
          </div>
          <div className="flex gap-2 text-sm">
            <a href={`/dashboard/annual?year=${year - 1}`} className="rounded-full bg-white px-4 py-2 font-semibold text-ru-blue shadow-[0_1px_6px_rgba(46,46,46,0.08)]">
              {year - 1}
            </a>
            <a href={`/dashboard/annual?year=${year + 1}`} className="rounded-full bg-white px-4 py-2 font-semibold text-ru-blue shadow-[0_1px_6px_rgba(46,46,46,0.08)]">
              {year + 1}
            </a>
          </div>
        </div>
        <DashboardNav />

        <CategoryTable title="הכנסות" rows={table.incomeRows} planned="income" />
        <CategoryTable title="הוצאות" rows={table.expenseRows} planned="expense" />

        <div className="mt-4 overflow-x-auto rounded-3xl bg-white p-3 shadow-[0_2px_14px_rgba(46,46,46,0.07)]">
          <table className="w-full min-w-[720px] text-xs">
            <tbody>
              <tr>
                <td className="p-2 font-semibold text-ru-green">סה&quot;כ הכנסות</td>
                {table.incomeTotalByMonth.map((v, i) => (
                  <td key={i} className="p-2 text-center">
                    {v > 0 ? v.toFixed(0) : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2 font-semibold text-ru-pink">סה&quot;כ הוצאות</td>
                {table.expenseTotalByMonth.map((v, i) => (
                  <td key={i} className="p-2 text-center">
                    {v > 0 ? v.toFixed(0) : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2 font-semibold text-ru-blue">נטו</td>
                {table.netByMonth.map((v, i) => (
                  <td key={i} className={`p-2 text-center font-medium ${v >= 0 ? "text-ru-green" : "text-ru-pink"}`}>
                    {v !== 0 ? v.toFixed(0) : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
