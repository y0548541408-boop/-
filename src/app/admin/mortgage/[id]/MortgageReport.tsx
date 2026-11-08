import Link from "next/link";
import { ShermanLogo } from "@/components/ShermanLogo";
import { SECTIONS, YES, INCOME_DROP, filledRows, formatMoney, summarize, type MortgageResponses } from "@/lib/mortgageQuestionnaire";
import { QUESTIONNAIRES } from "@/lib/questionnaires";
import PrintButton from "./PrintButton";
import { InsightsPanel, Kpi, Meter, Quote, SectionDetail, StackBar } from "./ReportParts";

const flaggedMortgage = (key: string, value: string) => (value === YES && ["medical", "citizenship"].includes(key)) || value === INCOME_DROP;

export default function MortgageReport({ clientName, submittedAt, r }: { clientName: string; submittedAt: Date | null; r: MortgageResponses }) {
  const s = summarize(r);
  const v = r.values;
  const names = [v["b1.fullName"], r.borrowers === 2 ? v["b2.fullName"] : null].filter(Boolean).join(" ו");
  const remaining = s.totalIncome - s.expenses - s.loansMonthly - s.maxRepayment;

  return (
    <main className="min-h-screen bg-sh-cream px-4 py-8 text-sh-ink print:bg-white print:py-0">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="no-print flex items-center justify-between">
          <Link href="/admin/mortgage" className="text-sm text-sh-ink/75 underline">
            ← כל השאלונים
          </Link>
          <PrintButton />
        </div>

        {/* Header */}
        <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-sh-accent-ink">שאלון לפני לקיחת משכנתא · דוח מפורט</div>
            <h1 className="mt-1 text-2xl font-semibold text-sh-green sm:text-3xl">{names || clientName}</h1>
            <div className="mt-1 text-sm text-sh-ink/75">
              {submittedAt && `מולא ב-${submittedAt.toLocaleDateString("he-IL")}`}
              {v.purpose && ` · ${v.purpose}`}
              {v.purchaseType && ` · ${v.purchaseType}`}
              {v.apartmentStatus && ` · ${v.apartmentStatus}`}
            </div>
          </div>
          <ShermanLogo markSize={40} />
        </header>

        {/* Deal KPIs */}
        <div>
          <h2 className="mb-2.5 px-1 text-sm font-semibold text-sh-ink/70">העסקה במספרים</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="שווי הדירה" value={s.propertyValue ? formatMoney(s.propertyValue) : "—"} />
            <Kpi label="הון עצמי" value={s.equity ? formatMoney(s.equity) : "—"} sub={s.propertyValue ? `${((s.equity / s.propertyValue) * 100).toFixed(0)}% מהשווי` : undefined} />
            <Kpi label="משכנתא מבוקשת" value={s.mortgageNeeded ? formatMoney(s.mortgageNeeded) : "—"} />
            <Kpi
              label="אחוז מימון"
              value={s.ltv !== null ? `${s.ltv.toFixed(1)}%` : "—"}
              sub={`מקסימום ${s.ltvLimit}%`}
              accent={s.ltv !== null && s.ltv > s.ltvLimit}
            />
          </div>
        </div>

        {/* Monthly KPIs */}
        <div>
          <h2 className="mb-2.5 px-1 text-sm font-semibold text-sh-ink/70">התמונה החודשית</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="הכנסה נטו כוללת" value={formatMoney(s.totalIncome)} sub={s.extraIncome ? `כולל ${formatMoney(s.extraIncome)} הכנסה נוספת` : s.grossIncome ? `ברוטו ${formatMoney(s.grossIncome)}` : undefined} />
            <Kpi label="הוצאות משק הבית" value={s.expenses ? formatMoney(s.expenses) : "—"} />
            <Kpi label="החזרי הלוואות קיימות" value={formatMoney(s.loansMonthly)} sub={s.loansBalance ? `יתרה ${formatMoney(s.loansBalance)}` : undefined} />
            <Kpi label="החזר משכנתא מקסימלי" value={s.maxRepayment ? formatMoney(s.maxRepayment) : "—"} sub={s.startRepayment ? `רוצים להתחיל ב-${formatMoney(s.startRepayment)}` : undefined} />
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-sh-green">מדדי הבנק</h3>
            {s.ltv !== null ? <Meter label="אחוז מימון" value={s.ltv} limit={s.ltvLimit} /> : <p className="text-sm text-sh-ink/75">חסר שווי הדירה.</p>}
            {s.repaymentRatio !== null ? (
              <Meter label="יחס החזר להכנסה (כולל הלוואות)" value={s.repaymentRatio} limit={40} />
            ) : (
              <p className="text-sm text-sh-ink/75">חסרים נתוני הכנסה או החזר.</p>
            )}
          </div>
          <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-sh-green">מימון הרכישה</h3>
            <StackBar
              parts={[
                { label: "הון עצמי", value: s.equity, className: "bg-sh-accent" },
                { label: "משכנתא", value: s.mortgageNeeded, className: "bg-sh-green" },
              ]}
            />
            <h3 className="pt-1 font-semibold text-sh-green">לאן הולכת ההכנסה</h3>
            <StackBar
              parts={[
                { label: "הוצאות", value: s.expenses, className: "bg-sh-cream-dark ring-1 ring-inset ring-sh-ink/10" },
                { label: "הלוואות", value: s.loansMonthly, className: "bg-sh-accent" },
                { label: "משכנתא (מקס')", value: s.maxRepayment, className: "bg-sh-green" },
                { label: "נשאר", value: Math.max(0, remaining), className: "bg-sh-mint" },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi label="חסכונות" value={formatMoney(s.assetsTotal)} sub={`${filledRows(r.tables.assets).length} חסכונות`} />
          <Kpi label="נשאר בחודש אחרי הכל" value={formatMoney(remaining)} accent={remaining < 0} sub="הכנסה פחות הוצאות, הלוואות ומשכנתא" />
          <Kpi label="ילדים מתחת ל-18" value={v.kidsUnder18 || "0"} sub={v.kidsAges ? `גילאים: ${v.kidsAges}` : undefined} />
        </div>

        <InsightsPanel insights={s.insights} />

        <Quote title="הציפיות של הלקוח מהתהליך" text={v.expectations} />

        {/* Full answers */}
        <h2 className="print-break px-1 pt-3 text-xl font-semibold text-sh-green">כל התשובות</h2>
        <div className="space-y-4">
          {SECTIONS.map((sec) =>
            sec.id === "expectations" ? null : (
              <SectionDetail key={sec.id} section={sec} r={r} personLabels={QUESTIONNAIRES.mortgage.personLabels} flagged={flaggedMortgage} />
            )
          )}
        </div>

        <p className="pb-4 text-center font-wordmark text-sh-accent-ink">חותמים בראש שקט.</p>
      </div>
    </main>
  );
}
