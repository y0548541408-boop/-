"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  SECTIONS,
  YES,
  NO,
  fieldKey,
  isVisible,
  toNumber,
  ltvLimitFor,
  type Field,
  type Row,
  type TableConfig,
  type Tables,
  type Values,
} from "@/lib/mortgageQuestionnaire";
import { submitMortgageQuestionnaire } from "./actions";

const inputClass =
  "w-full rounded-xl border border-sh-cream-dark bg-white px-3.5 py-2.5 text-[15px] text-sh-ink placeholder:text-sh-ink/35 transition focus:border-sh-green focus:outline-none focus:ring-2 focus:ring-sh-green/15";

type Draft = { step: number; borrowers: 1 | 2; values: Values; tables: Tables };

function storageKey(token: string) {
  return `mortgage-draft:${token}`;
}

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("he-IL") : "";
}

function Pills({
  options,
  value,
  onChange,
  name,
}: {
  options: string[];
  value: string | undefined;
  onChange: (v: string) => void;
  name: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? "" : option)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              active
                ? "border-sh-green bg-sh-green text-white shadow-sm"
                : "border-sh-cream-dark bg-white text-sh-ink hover:border-sh-green/40"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Input({
  type,
  value,
  onChange,
  placeholder,
  label,
}: {
  type: Field["type"];
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
}) {
  const v = value ?? "";
  if (type === "money") {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-sh-ink/45">₪</span>
        <input
          aria-label={label}
          inputMode="numeric"
          dir="ltr"
          value={formatThousands(v)}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
          placeholder={placeholder ?? "0"}
          className={`${inputClass} pl-8 text-right`}
        />
      </div>
    );
  }
  if (type === "textarea") {
    return (
      <textarea
        aria-label={label}
        rows={5}
        value={v}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    );
  }
  const htmlType = type === "date" ? "date" : type === "email" ? "email" : type === "tel" ? "tel" : "text";
  const ltr = type === "tel" || type === "email" || type === "id" || type === "number" || type === "percent";
  return (
    <input
      aria-label={label}
      type={htmlType}
      inputMode={type === "number" || type === "id" ? "numeric" : type === "percent" ? "decimal" : undefined}
      dir={ltr ? "ltr" : undefined}
      value={v}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputClass} ${ltr ? "text-right" : ""}`}
    />
  );
}

function SingleControl({
  field,
  k,
  values,
  set,
  label,
}: {
  field: Field;
  k: string;
  values: Values;
  set: (key: string, v: string) => void;
  label: string;
}) {
  if (field.type === "choice") {
    return <Pills name={label} options={field.options ?? []} value={values[k]} onChange={(v) => set(k, v)} />;
  }
  if (field.type === "yesno") {
    return (
      <div className="space-y-2">
        <Pills name={label} options={[YES, NO]} value={values[k]} onChange={(v) => set(k, v)} />
        {field.detailLabel && values[k] === YES && (
          <input
            aria-label={field.detailLabel}
            value={values[`${k}__detail`] ?? ""}
            onChange={(e) => set(`${k}__detail`, e.target.value)}
            placeholder={field.detailLabel}
            className={inputClass}
          />
        )}
      </div>
    );
  }
  return <Input type={field.type} value={values[k]} onChange={(v) => set(k, v)} placeholder={field.placeholder} label={label} />;
}

function FieldBlock({
  field,
  values,
  set,
  borrowers,
  names,
  missing,
}: {
  field: Field;
  values: Values;
  set: (key: string, v: string) => void;
  borrowers: 1 | 2;
  names: [string, string];
  missing: Set<string>;
}) {
  const keys = field.perBorrower ? (borrowers === 2 ? [1, 2] : [1]).map((b) => fieldKey(field, b as 1 | 2)) : [field.key];
  const isMissing = keys.some((k) => missing.has(k));

  return (
    <div
      className={`rounded-2xl border bg-white p-4 transition sm:p-5 ${
        isMissing ? "border-sh-accent/70 ring-2 ring-sh-accent/15" : "border-sh-cream-dark"
      }`}
    >
      <label className="block text-[15px] font-medium text-sh-ink">
        {field.label}
        {field.required && <span className="text-sh-accent"> *</span>}
      </label>
      {field.hint && <p className="mt-0.5 text-xs text-sh-ink/55">{field.hint}</p>}

      {field.perBorrower && borrowers === 2 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([1, 2] as const).map((b) => (
            <div key={b}>
              <div className="mb-1.5 text-xs font-medium text-sh-green">{names[b - 1]}</div>
              <SingleControl field={field} k={fieldKey(field, b)} values={values} set={set} label={`${field.label} – ${names[b - 1]}`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3">
          <SingleControl field={field} k={keys[0]} values={values} set={set} label={field.label} />
        </div>
      )}
      {isMissing && <p className="mt-2 text-xs font-medium text-sh-accent">נשמח שתמלאו את השדה הזה</p>}
    </div>
  );
}

function TableBlock({
  table,
  rows,
  setRows,
}: {
  table: TableConfig;
  rows: Row[];
  setRows: (rows: Row[]) => void;
}) {
  const list = rows.length ? rows : [{}];

  function update(i: number, key: string, value: string) {
    const next = list.map((r, idx) => (idx === i ? { ...r, [key]: value } : r));
    setRows(next);
  }

  return (
    <div className="rounded-2xl border border-sh-cream-dark bg-white p-4 sm:p-5">
      <div className="text-[15px] font-medium text-sh-ink">{table.title}</div>
      {table.hint && <p className="mt-0.5 text-xs text-sh-ink/55">{table.hint}</p>}
      <div className="mt-3 space-y-3">
        {list.map((row, i) => (
          <div key={i} className="rounded-xl bg-sh-cream/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-sh-green">{i + 1}</span>
              {list.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows(list.filter((_, idx) => idx !== i))}
                  className="text-xs text-sh-ink/50 underline-offset-2 hover:text-sh-accent hover:underline"
                >
                  הסרה
                </button>
              )}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {table.columns.map((col) => (
                <div key={col.key}>
                  <div className="mb-1 text-xs text-sh-ink/60">{col.label}</div>
                  {col.type === "choice" || col.type === "yesno" ? (
                    <Pills
                      name={col.label}
                      options={col.type === "yesno" ? [YES, NO] : (col.options ?? [])}
                      value={row[col.key]}
                      onChange={(v) => update(i, col.key, v)}
                    />
                  ) : (
                    <Input type={col.type} value={row[col.key]} onChange={(v) => update(i, col.key, v)} label={col.label} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setRows([...list, {}])}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-sh-green/40 px-4 py-2 text-sm font-medium text-sh-green transition hover:bg-sh-mint/50"
      >
        <span className="text-base leading-none">+</span> {table.addLabel}
      </button>
    </div>
  );
}

function FinancingCard({ values }: { values: Values }) {
  const value = toNumber(values.propertyValue);
  const mortgage = toNumber(values.mortgageNeeded);
  const equity = toNumber(values.equity);
  if (!value || (!mortgage && !equity)) return null;
  const ltv = (mortgage / value) * 100;
  const limit = ltvLimitFor(values.apartmentStatus);
  const over = ltv > limit;
  return (
    <div className="rounded-2xl bg-sh-mint p-4 sm:p-5">
      <div className="text-sm font-medium text-sh-green">חישוב אוטומטי</div>
      <div className="mt-2 grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-xs text-sh-ink/60">אחוז מימון</div>
          <div className={`mt-0.5 text-xl font-bold ${over ? "text-sh-accent" : "text-sh-green"}`}>{ltv.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xs text-sh-ink/60">מקסימום מותר</div>
          <div className="mt-0.5 text-xl font-bold text-sh-green">{limit}%</div>
        </div>
        <div>
          <div className="text-xs text-sh-ink/60">הון עצמי</div>
          <div className="mt-0.5 text-xl font-bold text-sh-green">{((equity / value) * 100).toFixed(0)}%</div>
        </div>
      </div>
      {over && (
        <p className="mt-3 text-xs text-sh-ink/70">
          אחוז המימון גבוה מהמותר. לא נורא, בגלל זה נפגשים. נבנה יחד פתרון.
        </p>
      )}
    </div>
  );
}

export default function MortgageForm({ token, clientName }: { token: string; clientName: string }) {
  const [step, setStep] = useState(0);
  const [borrowers, setBorrowers] = useState<1 | 2>(1);
  const [values, setValues] = useState<Values>({ "b1.fullName": clientName });
  const [tables, setTables] = useState<Tables>({});
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [restored, setRestored] = useState(false);
  const [isPending, startTransition] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);

  // Restore a saved draft (per-device convenience only; never required).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(token));
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from browser storage */
        setStep(draft.step ?? 0);
        setBorrowers(draft.borrowers === 2 ? 2 : 1);
        setValues(draft.values ?? {});
        setTables(draft.tables ?? {});
        if ((draft.step ?? 0) > 0) setRestored(true);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      // storage unavailable — start fresh
    }
  }, [token]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(token), JSON.stringify({ step, borrowers, values, tables } satisfies Draft));
    } catch {
      // ignore
    }
  }, [token, step, borrowers, values, tables]);

  const totalSteps = SECTIONS.length + 2; // welcome + sections + review
  const isWelcome = step === 0;
  const isReview = step === totalSteps - 1;
  const section = !isWelcome && !isReview ? SECTIONS[step - 1] : null;
  const names: [string, string] = [values["b1.fullName"] || "לווה 1", values["b2.fullName"] || "לווה 2"];
  const progress = Math.round((step / (totalSteps - 1)) * 100);

  const set = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setMissing((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const visibleFields = useMemo(
    () => ({
      // The name was already asked on the welcome screen.
      before: section ? section.fields.filter((f) => f.key !== "fullName" && isVisible(f, values)) : [],
      after: section?.fieldsAfter ? section.fieldsAfter.filter((f) => isVisible(f, values)) : [],
      tables: section?.tables ? section.tables.filter((t) => isVisible(t, values)) : [],
    }),
    [section, values]
  );

  function scrollTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validate(): boolean {
    if (isWelcome) {
      if (!values["b1.fullName"]?.trim()) {
        setMissing(new Set(["b1.fullName"]));
        setError("נשמח לדעת איך קוראים לכם.");
        return false;
      }
      return true;
    }
    if (!section) return true;
    const miss = new Set<string>();
    for (const f of [...visibleFields.before, ...visibleFields.after]) {
      if (!f.required) continue;
      const keys = f.perBorrower ? (borrowers === 2 ? [1, 2] : [1]).map((b) => fieldKey(f, b as 1 | 2)) : [f.key];
      for (const k of keys) if (!values[k]?.trim()) miss.add(k);
    }
    setMissing(miss);
    if (miss.size) {
      setError("חסרים כמה פרטים שמסומנים בכוכבית.");
      return false;
    }
    return true;
  }

  function next() {
    if (!validate()) return;
    setError(null);
    setRestored(false);
    setStep((s) => Math.min(s + 1, totalSteps - 1));
    scrollTop();
  }

  function back() {
    setError(null);
    setMissing(new Set());
    setStep((s) => Math.max(s - 1, 0));
    scrollTop();
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitMortgageQuestionnaire(token, { version: 1, borrowers, values, tables });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      try {
        localStorage.removeItem(storageKey(token));
      } catch {
        // ignore
      }
      setDone(true);
      scrollTop();
    });
  }

  if (done) {
    return (
      <div ref={topRef} className="rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sh-mint">
          <svg className="h-8 w-8 text-sh-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-sh-green">תודה רבה, {values["b1.fullName"]?.split(" ")[0]}!</h1>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-sh-ink/75">
          השאלון התקבל. ישראל יעבור על הפרטים לפני הפגישה, כדי שנגיע אליה מוכנים ונוכל להתמקד במה שחשוב באמת.
        </p>
        <p className="mt-6 font-wordmark text-lg text-sh-accent">חותמים בראש שקט.</p>
      </div>
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-4">
      {/* Progress */}
      <div className="mb-5 rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between text-xs text-sh-ink/60">
          <span>{isWelcome ? "פתיחה" : isReview ? "סיכום ושליחה" : `חלק ${section!.letter}' · ${section!.title}`}</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sh-cream-dark">
          <div className="h-full rounded-full bg-sh-green transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 hidden justify-between sm:flex">
          {SECTIONS.map((s, i) => {
            const idx = i + 1;
            const state = idx < step ? "done" : idx === step ? "current" : "todo";
            return (
              <div key={s.id} className="flex flex-col items-center gap-1">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    state === "done"
                      ? "bg-sh-accent text-white"
                      : state === "current"
                        ? "bg-sh-green text-white"
                        : "bg-sh-cream-dark text-sh-ink/50"
                  }`}
                >
                  {s.letter}
                </span>
                <span className={`text-[10px] ${state === "current" ? "text-sh-green" : "text-sh-ink/45"}`}>{s.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {restored && (
        <div className="mb-4 rounded-xl bg-sh-mint px-4 py-2.5 text-sm text-sh-green">שמרנו את מה שמילאתם. אפשר להמשיך מאיפה שעצרתם.</div>
      )}

      {/* Welcome */}
      {isWelcome && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-sh-green p-6 text-white shadow-sm sm:p-8">
            <h1 className="text-2xl font-semibold">שאלון לפני ייעוץ משכנתא</h1>
            <p className="mt-2 leading-relaxed text-white/85">
              כמה דקות של מילוי עכשיו חוסכות הרבה זמן בפגישה. ככה נגיע אליה עם תמונה מלאה ונבנה לכם משכנתא שמתאימה בדיוק.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1">כ-10 דקות</span>
              <span className="rounded-full bg-white/15 px-3 py-1">8 חלקים קצרים</span>
              <span className="rounded-full bg-white/15 px-3 py-1">נשמר אוטומטית במכשיר</span>
            </div>
          </div>
          <div className="rounded-2xl border border-sh-cream-dark bg-white p-4 sm:p-5">
            <label className="block text-[15px] font-medium">
              כמה לווים יהיו במשכנתא?
            </label>
            <p className="mt-0.5 text-xs text-sh-ink/55">בדרך כלל בני זוג לווים יחד.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([1, 2] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBorrowers(n)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    borrowers === n ? "border-sh-green bg-sh-green text-white" : "border-sh-cream-dark bg-white hover:border-sh-green/40"
                  }`}
                >
                  {n === 1 ? "לווה אחד" : "שני לווים"}
                </button>
              ))}
            </div>
          </div>
          <FieldBlock
            field={{ key: "fullName", label: "שם מלא", type: "text", perBorrower: true, required: true }}
            values={values}
            set={set}
            borrowers={borrowers}
            names={["לווה 1", "לווה 2"]}
            missing={missing}
          />
        </div>
      )}

      {/* Section */}
      {section && (
        <div className="space-y-4">
          <div className="px-1">
            <div className="text-sm font-medium text-sh-accent">חלק {section.letter}&apos;</div>
            <h2 className="text-2xl font-semibold text-sh-green">{section.title}</h2>
            <p className="mt-1 text-sh-ink/70">{section.intro}</p>
          </div>
          {visibleFields.before.map((f) => (
            <FieldBlock key={f.key} field={f} values={values} set={set} borrowers={borrowers} names={names} missing={missing} />
          ))}
          {section.id === "deal" && <FinancingCard values={values} />}
          {visibleFields.tables.map((t) => (
            <TableBlock key={t.key} table={t} rows={tables[t.key] ?? []} setRows={(rows) => setTables((prev) => ({ ...prev, [t.key]: rows }))} />
          ))}
          {section.note && (
            <div className="rounded-2xl border-r-4 border-sh-accent bg-sh-cream-dark/60 px-4 py-3 text-[15px] font-medium text-sh-green">
              {section.note}
            </div>
          )}
          {visibleFields.after.map((f) => (
            <FieldBlock key={f.key} field={f} values={values} set={set} borrowers={borrowers} names={names} missing={missing} />
          ))}
        </div>
      )}

      {/* Review */}
      {isReview && <Review borrowers={borrowers} values={values} tables={tables} onEdit={(i) => setStep(i + 1)} />}

      {error && <p className="mt-4 rounded-xl bg-sh-cream-dark px-4 py-2.5 text-sm font-medium text-sh-accent">{error}</p>}

      <div className="sticky bottom-3 mt-6 flex gap-2 rounded-2xl bg-sh-cream/90 p-1 backdrop-blur">
        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className="rounded-xl border border-sh-green/25 bg-white px-5 py-3 text-sm font-medium text-sh-green transition hover:bg-sh-mint/40"
          >
            הקודם
          </button>
        )}
        {!isReview ? (
          <button
            type="button"
            onClick={next}
            className="flex-1 rounded-xl bg-sh-green px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sh-green-dark"
          >
            {isWelcome ? "בואו נתחיל" : step === totalSteps - 2 ? "לסיכום" : "המשך"}
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="flex-1 rounded-xl bg-sh-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
          >
            {isPending ? "שולח..." : "שליחת השאלון"}
          </button>
        )}
      </div>
    </div>
  );
}

function Review({
  borrowers,
  values,
  tables,
  onEdit,
}: {
  borrowers: 1 | 2;
  values: Values;
  tables: Tables;
  onEdit: (sectionIndex: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-2xl font-semibold text-sh-green">כמעט סיימנו</h2>
        <p className="mt-1 text-sh-ink/70">עברו רגע על הפרטים. אפשר לחזור לכל חלק ולתקן לפני השליחה.</p>
      </div>
      {SECTIONS.map((s, i) => {
        const fields = [...s.fields, ...(s.fieldsAfter ?? [])].filter((f) => isVisible(f, values));
        let filled = 0;
        let total = 0;
        for (const f of fields) {
          const keys = f.perBorrower ? (borrowers === 2 ? [1, 2] : [1]).map((b) => fieldKey(f, b as 1 | 2)) : [f.key];
          for (const k of keys) {
            total++;
            if (values[k]) filled++;
          }
        }
        const rows = (s.tables ?? []).reduce((a, t) => a + (tables[t.key]?.filter((r) => Object.values(r).some(Boolean)).length ?? 0), 0);
        return (
          <div key={s.id} className="flex items-center justify-between rounded-2xl border border-sh-cream-dark bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sh-mint text-sm font-semibold text-sh-green">{s.letter}</span>
              <div>
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-sh-ink/55">
                  {total > 0 && `${filled} מתוך ${total} שדות`}
                  {total > 0 && s.tables?.length ? " · " : ""}
                  {s.tables?.length ? `${rows} שורות בטבלה` : ""}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => onEdit(i)} className="text-sm font-medium text-sh-green underline-offset-2 hover:underline">
              עריכה
            </button>
          </div>
        );
      })}
      <p className="px-1 text-xs text-sh-ink/55">הפרטים נשלחים ישירות ליועץ ונשמרים בצורה מאובטחת.</p>
    </div>
  );
}
