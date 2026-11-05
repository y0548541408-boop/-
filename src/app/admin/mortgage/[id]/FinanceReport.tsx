import Link from "next/link";
import { ShermanLogo } from "@/components/ShermanLogo";
import { FINANCE_SECTIONS, HOUSING, summarizeFinance } from "@/lib/financeQuestionnaire";
import { NO, YES, filledRows, formatMoney, splitMulti, toNumber, type QuestionnaireResponses } from "@/lib/questionnaire/core";
import { QUESTIONNAIRES } from "@/lib/questionnaires";
import PrintButton from "./PrintButton";
import { InsightsPanel, Kpi, Meter, Quote, SectionDetail, StackBar } from "./ReportParts";

const flaggedFinance = (key: string, value: string) => (key === "pension" && value === NO) || (key === "incomeDips" && value === YES);

export default function FinanceReport({ clientName, submittedAt, r }: { clientName: string; submittedAt: Date | null; r: QuestionnaireResponses }) {
  const s = summarizeFinance(r);
  const v = r.values;
  const def = QUESTIONNAIRES.finance;
  const names = [v["b1.fullName"], r.borrowers === 2 ? v["b2.fullName"] : null].filter(Boolean).join(" ו");
  const kids = toNumber(v.childrenCount);
  const afterLoans = s.balance - s.loansMonthly;

  return (
    <main className="min-h-screen bg-sh-cream px-4 py-8 text-sh-ink print:bg-white print:py-0">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="no-print flex items-center justify-between">
          <Link href="/admin/mortgage" className="text-sm text-sh-ink/75 underline">
            ← כל השאלונים
          </Link>
          <PrintButton />
        </div>

        <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-sh-accent-ink">{def.title} · דוח מפורט</div>
            <h1 className="mt-1 text-2xl font-semibold text-sh-green sm:text-3xl">{names || clientName}</h1>
            <div className="mt-1 text-sm text-sh-ink/75">
              {submittedAt && `מולא ב-${submittedAt.toLocaleDateString("he-IL")}`}
              {kids > 0 && ` · ${kids} ילדים`}
              {v.address && ` · ${v.address}`}
              {v.housing && ` · דירה ${v.housing}`}
            </div>
          </div>
          <ShermanLogo markSize={40} />
        </header>

        <div>
          <h2 className="mb-2.5 px-1 text-sm font-semibold text-sh-ink/75">התמונה החודשית</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi
              label="הכנסות בחודש"
              value={s.income ? formatMoney(s.income) : "—"}
              sub={s.incomeFromSalaries && s.incomeFromSalaries !== s.income ? `לפי המשכורות: ${formatMoney(s.incomeFromSalaries)}` : undefined}
            />
            <Kpi label="הוצאות בחודש" value={s.expenses ? formatMoney(s.expenses) : "—"} />
            <Kpi label="נשאר בחודש" value={s.income && s.expenses ? formatMoney(s.balance) : "—"} accent={s.balance < 0} sub="הכנסות פחות הוצאות" />
            <Kpi label="החזרי הלוואות" value={formatMoney(s.loansMonthly)} sub={s.loansCount ? `${s.loansCount} הלוואות` : "לא פורטו הלוואות"} />
          </div>
        </div>

        <div>
          <h2 className="mb-2.5 px-1 text-sm font-semibold text-sh-ink/75">חובות, חסכונות ודיור</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="יתרת חובות" value={formatMoney(s.loansBalance)} accent={s.loansBalance > 0 && s.loansBalance > s.savingsTotal} sub={s.maxRate ? `ריבית גבוהה ביותר: ${s.maxRate}%` : undefined} />
            <Kpi label="חסכונות" value={formatMoney(s.savingsTotal)} sub={`${filledRows(r.tables.savings).length} סוגי חיסכון`} />
            <Kpi
              label={v.housing === HOUSING.own ? "יתרת משכנתא" : "שכר דירה"}
              value={v.housing === HOUSING.own ? (s.mortgageBalance ? formatMoney(s.mortgageBalance) : "—") : v.rent ? formatMoney(toNumber(v.rent)) : "—"}
              sub={v.housing === HOUSING.own && s.mortgageMonthly ? `החזר ${formatMoney(s.mortgageMonthly)} בחודש` : undefined}
            />
            <Kpi label="חיסכון לחתונות" value={v.weddingMonthly ? formatMoney(toNumber(v.weddingMonthly)) : v.weddingSaving || "—"} sub={v.weddingMonthly ? "בחודש" : undefined} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-5 rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-sh-green">לאן הולכת ההכנסה</h3>
            {s.income > 0 ? (
              <StackBar
                parts={[
                  { label: "הוצאות", value: s.expenses, className: "bg-sh-cream-dark ring-1 ring-inset ring-sh-ink/10" },
                  { label: "הלוואות", value: s.loansMonthly, className: "bg-sh-accent" },
                  { label: "נשאר", value: Math.max(0, afterLoans), className: "bg-sh-mint" },
                ]}
              />
            ) : (
              <p className="text-sm text-sh-ink/75">חסרים נתוני הכנסה.</p>
            )}
            {s.loanRatio !== null && <Meter label="החזרי הלוואות מתוך ההכנסה" value={s.loanRatio} limit={30} />}
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-sh-green">מצב מהיר</h3>
            <ul className="space-y-2 text-sm">
              {[
                ["ביטוח חיים", v.lifeInsurance],
                ["ביטוח בריאות", v.healthInsurance],
                ["בדיקת כפילויות בביטוחים", v.duplicates],
                ["פנסיה", (r.borrowers === 2 ? [1, 2] : [1]).map((b) => `${v[`b${b}.fullName`] || def.personLabels[b - 1]}: ${v[`b${b}.pension`] || "—"}`).join(" · ")],
                ["מענק עבודה", v.workGrant],
                ["הנחה בארנונה", v.arnona],
                ["חיסכון לכל ילד (הכפלה)", kids > 0 ? v.childSavingsDouble : "אין ילדים"],
                ["אנשי מקצוע נוספים", splitMulti(v.professionals).join(", ")],
              ].map(([label, value]) => (
                <li key={label} className="flex justify-between gap-3 border-b border-sh-cream-dark/70 pb-2 last:border-0">
                  <span className="text-sh-ink/75">{label}</span>
                  <span className="text-left font-medium">{value || "—"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <InsightsPanel insights={s.insights} />

        <Quote title="מה הביא אותם לתהליך" text={v.mainReason} />
        <Quote title="מה ייחשב בעיניהם הצלחה" text={v.success} />

        <h2 className="print-break px-1 pt-3 text-xl font-semibold text-sh-green">כל התשובות</h2>
        <div className="space-y-4">
          {FINANCE_SECTIONS.map((sec) => (
            <SectionDetail key={sec.id} section={sec} r={r} personLabels={def.personLabels} flagged={flaggedFinance} />
          ))}
        </div>

        <p className="pb-4 text-center font-wordmark text-sh-accent-ink">חותמים בראש שקט.</p>
      </div>
    </main>
  );
}
