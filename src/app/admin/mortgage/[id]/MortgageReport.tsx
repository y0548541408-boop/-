import Link from "next/link";
import { ShermanLogo } from "@/components/ShermanLogo";
import {
  SECTIONS,
  YES,
  displayValue,
  fieldKey,
  filledRows,
  formatMoney,
  isVisible,
  summarize,
  type Field,
  type Insight,
  type MortgageResponses,
} from "@/lib/mortgageQuestionnaire";
import PrintButton from "./PrintButton";

function Kpi({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-xs text-sh-ink/55">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${accent ? "text-sh-accent" : "text-sh-green"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-sh-ink/50">{sub}</div>}
    </div>
  );
}

function Meter({ value, limit, label, max = 100 }: { value: number; limit: number; label: string; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const limitPct = Math.min(100, (limit / max) * 100);
  const over = value > limit;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-sh-ink/70">{label}</span>
        <span className={`font-bold tabular-nums ${over ? "text-sh-accent" : "text-sh-green"}`}>{value.toFixed(1)}%</span>
      </div>
      <div className="relative mt-2 h-3 rounded-full bg-sh-cream-dark">
        <div className={`h-full rounded-full ${over ? "bg-sh-accent" : "bg-sh-green"}`} style={{ width: `${pct}%` }} />
        <div className="absolute -top-1 h-5 w-0.5 bg-sh-ink/60" style={{ right: `${limitPct}%` }} title={`גבול ${limit}%`} />
      </div>
      <div className="mt-1 text-xs text-sh-ink/50">קו הגבול: {limit}%</div>
    </div>
  );
}

function StackBar({ parts }: { parts: { label: string; value: number; className: string }[] }) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0);
  if (total <= 0) return null;
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-sh-cream-dark">
        {parts.map((p) =>
          p.value > 0 ? <div key={p.label} className={p.className} style={{ width: `${(p.value / total) * 100}%` }} title={p.label} /> : null
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {parts.map((p) => (
          <span key={p.label} className="inline-flex items-center gap-1.5 text-sh-ink/75">
            <span className={`h-2.5 w-2.5 rounded-sm ${p.className}`} />
            {p.label}: <span className="font-semibold tabular-nums">{formatMoney(p.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const TONE: Record<Insight["tone"], { dot: string; label: string }> = {
  attention: { dot: "bg-sh-accent", label: "לתשומת לב" },
  info: { dot: "bg-sh-green/40", label: "לידיעה" },
  good: { dot: "bg-sh-green", label: "לטובה" },
};

function answer(field: Field, r: MortgageResponses, key: string): string {
  const v = r.values[key];
  if (!v) return "—";
  const shown = displayValue(field.type, v);
  const detail = r.values[`${key}__detail`];
  return field.type === "yesno" && v === YES && detail ? `${shown}: ${detail}` : shown;
}

function SectionDetail({ index, r }: { index: number; r: MortgageResponses }) {
  const s = SECTIONS[index];
  const fields = [...s.fields, ...(s.fieldsAfter ?? [])].filter((f) => isVisible(f, r.values));
  const per = fields.filter((f) => f.perBorrower);
  const shared = fields.filter((f) => !f.perBorrower);
  const borrowers: (1 | 2)[] = r.borrowers === 2 ? [1, 2] : [1];
  const tables = (s.tables ?? []).filter((t) => isVisible(t, r.values));

  return (
    <section className="break-inside-avoid rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2.5 text-lg font-semibold text-sh-green">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sh-mint text-sm">{s.letter}</span>
        {s.title}
      </h3>

      {per.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="bg-sh-cream-dark text-right text-sh-ink/70">
                <th className="rounded-r-lg px-3 py-2 font-medium" />
                {borrowers.map((b, i) => (
                  <th key={b} className={`px-3 py-2 font-semibold text-sh-green ${i === borrowers.length - 1 ? "rounded-l-lg" : ""}`}>
                    {r.values[`b${b}.fullName`] || `לווה ${b}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {per.map((f) => (
                <tr key={f.key} className="border-b border-sh-cream-dark/70 last:border-0">
                  <td className="w-2/5 px-3 py-2 text-sh-ink/65">{f.label}</td>
                  {borrowers.map((b) => {
                    const k = fieldKey(f, b);
                    const flagged = (f.type === "yesno" && r.values[k] === YES && ["medical", "citizenship"].includes(f.key)) || r.values[k] === "צפויה לרדת";
                    return (
                      <td key={b} className={`px-3 py-2 font-medium ${flagged ? "text-sh-accent" : "text-sh-ink"}`}>
                        {answer(f, r, k)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {shared.length > 0 && (
        <dl className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {shared.map((f) => (
            <div key={f.key} className={`border-b border-sh-cream-dark/70 pb-2 ${f.wide ? "sm:col-span-2" : ""}`}>
              <dt className="text-xs text-sh-ink/55">{f.label}</dt>
              <dd className="mt-0.5 whitespace-pre-line font-medium">{answer(f, r, f.key)}</dd>
            </div>
          ))}
        </dl>
      )}

      {tables.map((t) => {
        const rows = filledRows(r.tables[t.key]);
        return (
          <div key={t.key} className="mt-5">
            <div className="text-sm font-semibold text-sh-ink/80">{t.title}</div>
            {rows.length === 0 ? (
              <p className="mt-1 text-sm text-sh-ink/45">לא מולא.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="bg-sh-cream-dark text-right text-sh-ink/70">
                      {t.columns.map((c, i) => (
                        <th
                          key={c.key}
                          className={`px-3 py-2 font-medium ${i === 0 ? "rounded-r-lg" : ""} ${i === t.columns.length - 1 ? "rounded-l-lg" : ""}`}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-sh-cream-dark/70 last:border-0">
                        {t.columns.map((c) => (
                          <td key={c.key} className="px-3 py-2 tabular-nums">
                            {displayValue(c.type, row[c.key]) || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

export default function MortgageReport({ clientName, submittedAt, r }: { clientName: string; submittedAt: Date | null; r: MortgageResponses }) {
  const s = summarize(r);
  const v = r.values;
  const names = [v["b1.fullName"], r.borrowers === 2 ? v["b2.fullName"] : null].filter(Boolean).join(" ו");
  const attention = s.insights.filter((i) => i.tone === "attention");
  const others = s.insights.filter((i) => i.tone !== "attention");
  const remaining = s.totalIncome - s.expenses - s.loansMonthly - s.maxRepayment;

  return (
    <main className="min-h-screen bg-sh-cream px-4 py-8 text-sh-ink print:bg-white print:py-0">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="no-print flex items-center justify-between">
          <Link href="/admin/mortgage" className="text-xs text-sh-ink/50 underline">
            ← כל השאלונים
          </Link>
          <PrintButton />
        </div>

        {/* Header */}
        <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-sh-accent">דוח שאלון לפני ייעוץ משכנתא</div>
            <h1 className="mt-1 text-2xl font-semibold text-sh-green sm:text-3xl">{names || clientName}</h1>
            <div className="mt-1 text-sm text-sh-ink/60">
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
            <Kpi label="שווי הנכס" value={s.propertyValue ? formatMoney(s.propertyValue) : "—"} />
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
            {s.ltv !== null ? <Meter label="אחוז מימון" value={s.ltv} limit={s.ltvLimit} /> : <p className="text-sm text-sh-ink/50">חסר שווי נכס.</p>}
            {s.repaymentRatio !== null ? (
              <Meter label="יחס החזר להכנסה (כולל הלוואות)" value={s.repaymentRatio} limit={40} />
            ) : (
              <p className="text-sm text-sh-ink/50">חסרים נתוני הכנסה או החזר.</p>
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
          <Kpi label="נכסים פיננסיים" value={formatMoney(s.assetsTotal)} sub={`${filledRows(r.tables.assets).length} נכסים`} />
          <Kpi label="נשאר בחודש אחרי הכל" value={formatMoney(remaining)} accent={remaining < 0} sub="הכנסה פחות הוצאות, הלוואות ומשכנתא" />
          <Kpi label="ילדים מתחת ל-18" value={v.kidsUnder18 || "0"} sub={v.kidsAges ? `גילאים: ${v.kidsAges}` : undefined} />
        </div>

        {/* Insights */}
        {s.insights.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border-r-4 border-sh-accent bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-sh-accent">נקודות לתשומת לב ({attention.length})</h3>
              {attention.length === 0 ? (
                <p className="mt-2 text-sm text-sh-ink/60">לא עלו נקודות מיוחדות. תיק נקי.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {attention.map((i, idx) => (
                    <li key={idx} className="flex gap-2.5 text-sm leading-relaxed">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE[i.tone].dot}`} />
                      {i.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl border-r-4 border-sh-green bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-sh-green">עוד דברים שכדאי לדעת</h3>
              <ul className="mt-3 space-y-2.5">
                {others.map((i, idx) => (
                  <li key={idx} className="flex gap-2.5 text-sm leading-relaxed">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE[i.tone].dot}`} />
                    {i.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {v.expectations && (
          <div className="rounded-2xl bg-sh-green p-5 text-white shadow-sm">
            <h3 className="text-sm font-medium text-white/75">הציפיות של הלקוח מהתהליך</h3>
            <p className="mt-2 whitespace-pre-line text-lg leading-relaxed">&ldquo;{v.expectations}&rdquo;</p>
          </div>
        )}

        {/* Full answers */}
        <h2 className="print-break px-1 pt-3 text-lg font-semibold text-sh-green">כל התשובות</h2>
        <div className="space-y-4">
          {SECTIONS.map((sec, i) => (sec.id === "expectations" ? null : <SectionDetail key={sec.id} index={i} r={r} />))}
        </div>

        <p className="pb-4 text-center font-wordmark text-sh-accent">חותמים בראש שקט.</p>
      </div>
    </main>
  );
}
