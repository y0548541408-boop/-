import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFamilyMonthlyTrend, getFamilyCategoryBreakdown } from "@/lib/reports";
import DashboardNav from "../DashboardNav";
import { formatShekel } from "../RiseCard";
import TrendChart from "./TrendChart";

const CARD = "rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]";

function Breakdown({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: { name: string; amount: number }[];
  tone: "blue" | "green";
}) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  const bar = tone === "blue" ? "bg-ru-blue" : "bg-ru-green";
  const track = tone === "blue" ? "bg-ru-blue-soft" : "bg-ru-green-soft";

  return (
    <div className={`mt-4 ${CARD}`}>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ru-muted">אין נתונים לחודש זה</p>
      ) : (
        <div className="space-y-4">
          {rows.map((c) => (
            <div key={c.name}>
              <div className="flex justify-between text-sm">
                <span>{c.name}</span>
                <span className="font-bold">{formatShekel(c.amount)}</span>
              </div>
              <div className={`mt-1.5 h-2.5 w-full overflow-hidden rounded-full ${track}`}>
                <div
                  className={`h-full rounded-full ${bar}`}
                  style={{ width: `${(c.amount / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const net = thisMonth?.net ?? 0;

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-32 pt-6 text-ru-ink">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">דוחות</h1>
        <p className="text-sm text-ru-muted">מגמות והתפלגות לפי קטגוריה</p>
        <DashboardNav />

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className={`${CARD} !p-3 text-center`}>
            <p className="text-xs text-ru-muted">הכנסות</p>
            <p className="mt-1 text-base font-bold text-ru-green">
              {formatShekel(thisMonth?.income ?? 0)}
            </p>
          </div>
          <div className={`${CARD} !p-3 text-center`}>
            <p className="text-xs text-ru-muted">הוצאות</p>
            <p className="mt-1 text-base font-bold text-ru-pink">
              {formatShekel(thisMonth?.expense ?? 0)}
            </p>
          </div>
          <div className={`${CARD} !p-3 text-center`}>
            <p className="text-xs text-ru-muted">נטו</p>
            <p className={`mt-1 text-base font-bold ${net >= 0 ? "text-ru-green" : "text-ru-pink"}`}>
              {net < 0 ? "-" : ""}
              {formatShekel(Math.abs(net))}
            </p>
          </div>
        </div>

        <div className={`mt-4 ${CARD}`}>
          <h2 className="mb-2 text-lg font-bold">מגמת 6 חודשים אחרונים</h2>
          <TrendChart data={trend} />
        </div>

        <Breakdown title="הוצאות לפי קטגוריה (החודש)" rows={breakdown.expenses} tone="blue" />
        <Breakdown title="הכנסות לפי קטגוריה (החודש)" rows={breakdown.incomes} tone="green" />
      </div>
    </main>
  );
}
