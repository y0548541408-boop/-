// Building blocks shared by the questionnaire reports (mortgage, coaching).
import {
  answerText,
  displayValue,
  fieldKey,
  filledRows,
  formatMoney,
  isVisible,
  withCount,
  type Insight,
  type QuestionnaireResponses,
  type Section,
} from "@/lib/questionnaire/core";

export function Kpi({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-sm text-sh-ink/75">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${accent ? "text-sh-accent-ink" : "text-sh-green"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-sm text-sh-ink/75">{sub}</div>}
    </div>
  );
}

export function Meter({ value, limit, label, max = 100 }: { value: number; limit: number; label: string; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const limitPct = Math.min(100, (limit / max) * 100);
  const over = value > limit;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-sh-ink/70">{label}</span>
        <span className={`font-bold tabular-nums ${over ? "text-sh-accent-ink" : "text-sh-green"}`}>{value.toFixed(1)}%</span>
      </div>
      <div className="relative mt-2 h-3 rounded-full bg-sh-cream-dark">
        <div className={`h-full rounded-full ${over ? "bg-sh-accent" : "bg-sh-green"}`} style={{ width: `${pct}%` }} />
        <div className="absolute -top-1 h-5 w-0.5 bg-sh-ink/60" style={{ right: `${limitPct}%` }} title={`גבול ${limit}%`} />
      </div>
      <div className="mt-1 text-sm text-sh-ink/75">קו הגבול: {limit}%</div>
    </div>
  );
}

export function StackBar({ parts }: { parts: { label: string; value: number; className: string }[] }) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0);
  if (total <= 0) return null;
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-sh-cream-dark">
        {parts.map((p) =>
          p.value > 0 ? <div key={p.label} className={p.className} style={{ width: `${(p.value / total) * 100}%` }} title={p.label} /> : null
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
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

export const TONE: Record<Insight["tone"], { dot: string; label: string }> = {
  attention: { dot: "bg-sh-accent", label: "לתשומת לב" },
  info: { dot: "bg-sh-green/40", label: "לידיעה" },
  good: { dot: "bg-sh-green", label: "לטובה" },
};

export function SectionDetail({ section: s, r, personLabels, flagged }: { section: Section; r: QuestionnaireResponses; personLabels: [string, string]; flagged?: (key: string, value: string) => boolean }) {
  const shown = withCount(r.values, r.borrowers);
  const fields = [...s.fields, ...(s.fieldsAfter ?? [])].filter((f) => isVisible(f, shown));
  const per = fields.filter((f) => f.perBorrower);
  const shared = fields.filter((f) => !f.perBorrower);
  const borrowers: (1 | 2)[] = r.borrowers === 2 ? [1, 2] : [1];
  const tables = (s.tables ?? []).filter((t) => isVisible(t, shown));

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
                    {r.values[`b${b}.fullName`] || personLabels[b - 1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {per.map((f) => (
                <tr key={f.key} className="border-b border-sh-cream-dark/70 last:border-0">
                  <td className="w-2/5 px-3 py-2 text-sh-ink/75">{f.label}</td>
                  {borrowers.map((b) => {
                    const k = fieldKey(f, b);
                    const isFlagged = flagged ? flagged(f.key, r.values[k] ?? "") : false;
                    return (
                      <td key={b} className={`px-3 py-2 font-medium ${isFlagged ? "text-sh-accent-ink" : "text-sh-ink"}`}>
                        {answerText(f, r.values, k) || "—"}
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
              <dt className="text-sm text-sh-ink/75">{f.label}</dt>
              <dd className="mt-0.5 whitespace-pre-line font-medium">{answerText(f, r.values, f.key) || "—"}</dd>
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
              <p className="mt-1 text-sm text-sh-ink/75">לא מולאו פרטים.</p>
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

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  const attention = insights.filter((i) => i.tone === "attention");
  const others = insights.filter((i) => i.tone !== "attention");
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border-r-4 border-sh-accent bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-sh-accent-ink">נקודות לתשומת לב ({attention.length})</h3>
        {attention.length === 0 ? (
          <p className="mt-2 text-sm text-sh-ink/75">לא עלו נקודות מיוחדות. תיק נקי.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {attention.map((i, idx) => (
              <li key={idx} className="flex gap-2.5 text-sm leading-relaxed">
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE[i.tone].dot}`} />
                {i.text}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-2xl border-r-4 border-sh-green bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-sh-green">עוד דברים שכדאי לדעת</h3>
        {others.length === 0 ? (
          <p className="mt-2 text-sm text-sh-ink/75">אין עוד הערות.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {others.map((i, idx) => (
              <li key={idx} className="flex gap-2.5 text-sm leading-relaxed">
                <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE[i.tone].dot}`} />
                {i.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function Quote({ title, text }: { title: string; text: string | undefined }) {
  if (!text) return null;
  return (
    <div className="rounded-2xl bg-sh-green p-5 text-white shadow-sm">
      <h3 className="text-sm font-medium text-white/80">{title}</h3>
      <p className="mt-2 whitespace-pre-line text-lg leading-relaxed">&ldquo;{text}&rdquo;</p>
    </div>
  );
}
