import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFamilyNetWorth } from "@/lib/netWorth";
import { getFamilyGoals } from "@/lib/goals";
import { ASSET_GROUPS, LIABILITY_GROUPS } from "@/lib/netWorthGroups";
import DashboardNav from "../DashboardNav";
import { formatShekel } from "../RiseCard";
import NetWorthItems from "./NetWorthItems";
import NetWorthChart from "./NetWorthChart";
import Goals from "./Goals";

const CARD = "rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]";

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function NetWorthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.familyMember.findUnique({
    where: { authUserId: user.id },
  });
  if (!member) redirect("/login");

  const [worth, goals] = await Promise.all([
    getFamilyNetWorth(member.familyId),
    getFamilyGoals(member.familyId),
  ]);

  const isEmpty = worth.assetGroups.length === 0 && worth.liabilityGroups.length === 0;
  const total = worth.assets + worth.liabilities;
  const assetShare = total > 0 ? (worth.assets / total) * 100 : 50;
  const chartData = worth.history.map((h) => ({
    label: h.month.toLocaleDateString("he-IL", { month: "short", year: "2-digit" }),
    net: h.net,
  }));

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-32 pt-6 text-ru-ink">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">שווי נקי ויעדים</h1>
        <p className="text-sm text-ru-muted">מה יש לנו, מה אנחנו חייבים, ולאן חוסכים</p>
        <DashboardNav />

        <div className={`mt-5 ${CARD}`}>
          <p className="text-sm text-ru-muted">השווי הנקי שלנו</p>
          <p className={`mt-1 text-4xl font-bold ${worth.net >= 0 ? "text-ru-ink" : "text-ru-pink"}`}>
            {worth.net < 0 ? "-" : ""}
            {formatShekel(Math.abs(worth.net))}
          </p>

          <div className="mt-4 flex h-3.5 w-full overflow-hidden rounded-full bg-ru-bg">
            {!isEmpty && (
              <>
                <div className="h-full bg-ru-green" style={{ width: `${assetShare}%` }} />
                <div className="h-full bg-ru-pink" style={{ width: `${100 - assetShare}%` }} />
              </>
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-ru-muted">נכסים</p>
              <p className="text-base font-bold text-ru-green">{formatShekel(worth.assets)}</p>
            </div>
            <div>
              <p className="text-xs text-ru-muted">התחייבויות</p>
              <p className="text-base font-bold text-ru-pink">{formatShekel(worth.liabilities)}</p>
            </div>
            <div>
              <p className="text-xs text-ru-muted">מתוכם השקעות</p>
              <p className="text-base font-bold text-ru-blue">{formatShekel(worth.investments)}</p>
            </div>
          </div>
        </div>

        {isEmpty && (
          <p className="mt-4 text-sm leading-relaxed text-ru-muted">
            מתחילים ברשימה פשוטה: כמה יש בעו״ש ובחסכונות, קרנות ופנסיה, דירה אם יש. ובצד השני,
            משכנתא, הלוואות ומינוס. מעדכנים פעם בחודש ורואים את השווי עולה.
          </p>
        )}

        {chartData.length >= 2 && (
          <div className={`mt-4 ${CARD}`}>
            <h2 className="mb-2 text-lg font-bold">איך השווי שלנו משתנה</h2>
            <NetWorthChart data={chartData} />
          </div>
        )}

        <Goals
          goals={goals.map((g) => ({
            ...g,
            targetDate: g.targetDate ? toDateInput(g.targetDate) : null,
          }))}
        />

        <NetWorthItems
          kind="asset"
          title="נכסים"
          total={worth.assets}
          groups={worth.assetGroups}
          groupOptions={ASSET_GROUPS}
        />
        <NetWorthItems
          kind="liability"
          title="התחייבויות"
          total={worth.liabilities}
          groups={worth.liabilityGroups}
          groupOptions={LIABILITY_GROUPS}
        />
      </div>
    </main>
  );
}
