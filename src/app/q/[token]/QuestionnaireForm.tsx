"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  YES,
  NO,
  OTHER,
  fieldKey,
  isVisible,
  optionsFor,
  splitMulti,
  toNumber,
  withCount,
  MULTI_SEP,
  type Field,
  type Section,
  type Row,
  type TableConfig,
  type Tables,
  type Values,
} from "@/lib/questionnaire/core";
import { ltvLimitFor } from "@/lib/mortgageQuestionnaire";
import { getQuestionnaire, type Kind } from "@/lib/questionnaires";
import { submitQuestionnaire } from "./actions";

// Accessibility notes: 16px+ text everywhere (also stops iOS zoom on focus),
// 48px touch targets, real radio inputs for every choice (keyboard + screen
// readers), labels tied to inputs, errors announced, focus moved to the new
// step's heading, text colors that pass WCAG AA on white and cream.

const inputClass =
  "block min-h-12 w-full rounded-xl border-2 border-sh-cream-dark bg-white px-4 py-3 text-base text-sh-ink placeholder:text-sh-ink/50 motion-safe:transition focus:border-sh-green focus:outline-none focus:ring-4 focus:ring-sh-green/15 aria-[invalid=true]:border-sh-accent-ink";

type Draft = { step: number; borrowers: 1 | 2; values: Values; tables: Tables };

function storageKey(token: string) {
  // Key name kept from the first version so drafts saved before survive.
  return `mortgage-draft:${token}`;
}

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("he-IL") : "";
}

function domId(key: string) {
  return `q-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-sh-accent-ink">
        {" "}
        *
      </span>
      <span className="sr-only"> (שדה חובה)</span>
    </>
  );
}

function Choices({
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
    <div className="flex flex-wrap gap-2.5">
      {options.map((option) => (
        <label key={option} className="relative cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="peer sr-only"
          />
          <span className="flex min-h-12 items-center gap-2 rounded-full border-2 border-sh-cream-dark bg-white px-5 py-2.5 text-base text-sh-ink motion-safe:transition hover:border-sh-green/50 peer-checked:border-sh-green peer-checked:bg-sh-green peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-sh-green/30">
            {value === option && (
              <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                <path d="M7.7 13.3 4.4 10l-1.2 1.2 4.5 4.5 9.1-9.1-1.2-1.2z" />
              </svg>
            )}
            {option}
          </span>
        </label>
      ))}
    </div>
  );
}

function MultiChoices({ options, value, onChange, name }: { options: string[]; value: string | undefined; onChange: (v: string) => void; name: string }) {
  const selected = splitMulti(value);
  function toggle(option: string) {
    const next = selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option];
    onChange(options.filter((o) => next.includes(o)).join(MULTI_SEP));
  }
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((option) => (
        <label key={option} className="relative cursor-pointer">
          <input type="checkbox" name={name} value={option} checked={selected.includes(option)} onChange={() => toggle(option)} className="peer sr-only" />
          <span className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-sh-cream-dark bg-white px-4 py-2.5 text-base text-sh-ink motion-safe:transition hover:border-sh-green/50 peer-checked:border-sh-green peer-checked:bg-sh-mint peer-checked:text-sh-green peer-focus-visible:ring-4 peer-focus-visible:ring-sh-green/30">
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${selected.includes(option) ? "border-sh-green bg-sh-green text-white" : "border-sh-ink/40 bg-white"}`}
            >
              {selected.includes(option) && (
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M7.7 13.3 4.4 10l-1.2 1.2 4.5 4.5 9.1-9.1-1.2-1.2z" />
                </svg>
              )}
            </span>
            {option}
          </span>
        </label>
      ))}
    </div>
  );
}

function TextInput({
  id,
  type,
  value,
  onChange,
  placeholder,
  describedBy,
  invalid,
  ariaLabel,
}: {
  id: string;
  type: Field["type"];
  value: string | undefined;
  onChange: (v: string) => void;
  placeholder?: string;
  describedBy?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  const v = value ?? "";
  const common = {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": invalid || undefined,
    "aria-label": ariaLabel,
  };
  if (type === "money") {
    return (
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base text-sh-ink/70">
          ₪
        </span>
        <input
          {...common}
          inputMode="numeric"
          dir="ltr"
          autoComplete="off"
          value={formatThousands(v)}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
          placeholder={placeholder ?? "0"}
          className={`${inputClass} pl-10 text-right`}
        />
      </div>
    );
  }
  if (type === "textarea") {
    return <textarea {...common} rows={5} value={v} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />;
  }
  const htmlType = type === "date" ? "date" : type === "email" ? "email" : type === "tel" ? "tel" : "text";
  const ltr = type === "tel" || type === "email" || type === "id" || type === "number" || type === "percent";
  const autoComplete = type === "email" ? "email" : type === "tel" ? "tel" : undefined;
  return (
    <input
      {...common}
      type={htmlType}
      inputMode={type === "number" || type === "id" ? "numeric" : type === "percent" ? "decimal" : undefined}
      autoComplete={autoComplete}
      dir={ltr ? "ltr" : undefined}
      value={v}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${inputClass} ${ltr ? "text-right" : ""}`}
    />
  );
}

/** One answer control for one key (a single borrower, or a shared question). */
function Control({
  field,
  k,
  values,
  set,
  label,
  describedBy,
  invalid,
  showLabel,
}: {
  field: Field;
  k: string;
  values: Values;
  set: (key: string, v: string) => void;
  label: string;
  describedBy?: string;
  invalid: boolean;
  showLabel?: string;
}) {
  const id = domId(k);
  const isChoice = field.type === "choice" || field.type === "yesno" || field.type === "multi";
  const otherChosen = field.hasOther && (values[k] === OTHER || splitMulti(values[k]).includes(OTHER));

  if (isChoice) {
    return (
      <fieldset aria-describedby={describedBy}>
        <legend className={showLabel ? "mb-2 text-sm font-semibold text-sh-green" : "sr-only"}>{showLabel ?? label}</legend>
        {field.type === "multi" ? (
          <MultiChoices name={id} options={optionsFor(field)} value={values[k]} onChange={(v) => set(k, v)} />
        ) : (
          <Choices name={id} options={optionsFor(field)} value={values[k]} onChange={(v) => set(k, v)} />
        )}
        {otherChosen && (
          <div className="mt-3">
            <label htmlFor={`${id}-other`} className="mb-1.5 block text-sm font-medium text-sh-ink/80">
              מה בדיוק?
            </label>
            <TextInput id={`${id}-other`} type="text" value={values[`${k}__other`]} onChange={(v) => set(`${k}__other`, v)} />
          </div>
        )}
        {field.type === "yesno" && field.detailLabel && values[k] === YES && (
          <div className="mt-3">
            <label htmlFor={`${id}-detail`} className="mb-1.5 block text-sm font-medium text-sh-ink/80">
              {field.detailLabel}
            </label>
            <TextInput id={`${id}-detail`} type="text" value={values[`${k}__detail`]} onChange={(v) => set(`${k}__detail`, v)} />
          </div>
        )}
      </fieldset>
    );
  }

  return (
    <div>
      {showLabel && (
        <label htmlFor={id} className="mb-2 block text-sm font-semibold text-sh-green">
          {showLabel}
        </label>
      )}
      <TextInput
        id={id}
        type={field.type}
        value={values[k]}
        onChange={(v) => set(k, v)}
        placeholder={field.placeholder}
        describedBy={describedBy}
        invalid={invalid}
        ariaLabel={showLabel ? `${label} – ${showLabel}` : undefined}
      />
    </div>
  );
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
  const uid = useId();
  const both = field.perBorrower && borrowers === 2;
  const keys = field.perBorrower ? (borrowers === 2 ? [1, 2] : [1]).map((b) => fieldKey(field, b as 1 | 2)) : [field.key];
  const isMissing = keys.some((k) => missing.has(k));
  const hintId = field.hint ? `${uid}-hint` : undefined;
  const errorId = isMissing ? `${uid}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const isChoice = field.type === "choice" || field.type === "yesno" || field.type === "multi";
  // A single text input gets a real <label>; choices and side-by-side pairs get a heading.
  const titleId = `${uid}-title`;

  const title = (
    <>
      {field.label}
      {field.required && <RequiredMark />}
    </>
  );

  return (
    <div
      role={both ? "group" : undefined}
      aria-labelledby={both ? titleId : undefined}
      className={`rounded-2xl border-2 bg-white p-5 shadow-[0_1px_2px_rgba(27,43,42,0.04)] sm:p-6 ${
        isMissing ? "border-sh-accent-ink" : "border-transparent"
      }`}
    >
      {both || isChoice ? (
        <div id={titleId} aria-hidden={both ? undefined : true} className="text-lg font-semibold leading-snug text-sh-ink">
          {title}
        </div>
      ) : (
        <label htmlFor={domId(keys[0])} className="block text-lg font-semibold leading-snug text-sh-ink">
          {title}
        </label>
      )}
      {field.hint && (
        <p id={hintId} className="mt-1 text-base text-sh-ink/75">
          {field.hint}
        </p>
      )}

      <div className={`mt-4 ${both ? "grid gap-5 sm:grid-cols-2" : ""}`}>
        {both
          ? ([1, 2] as const).map((b) => (
              <Control
                key={b}
                field={field}
                k={fieldKey(field, b)}
                values={values}
                set={set}
                label={field.label}
                describedBy={describedBy}
                invalid={missing.has(fieldKey(field, b))}
                showLabel={names[b - 1]}
              />
            ))
          : (
            <Control field={field} k={keys[0]} values={values} set={set} label={field.label} describedBy={describedBy} invalid={isMissing} />
          )}
      </div>
      {isMissing && (
        <p id={errorId} className="mt-3 flex items-center gap-1.5 text-base font-medium text-sh-accent-ink">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="currentColor">
            <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.9 4h1.8v5.2H9.1V6Zm0 6.6h1.8v1.8H9.1v-1.8Z" />
          </svg>
          צריך למלא את השדה הזה כדי להמשיך
        </p>
      )}
    </div>
  );
}

function TableBlock({ table, rows, setRows }: { table: TableConfig; rows: Row[]; setRows: (rows: Row[]) => void }) {
  const uid = useId();
  const list = rows.length ? rows : [{}];

  function update(i: number, key: string, value: string) {
    setRows(list.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  return (
    <div role="group" aria-labelledby={`${uid}-title`} className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(27,43,42,0.04)] sm:p-6">
      <div id={`${uid}-title`} className="text-lg font-semibold text-sh-ink">
        {table.title}
      </div>
      {table.hint && <p className="mt-1 text-base text-sh-ink/75">{table.hint}</p>}
      <ol className="mt-4 space-y-4">
        {list.map((row, i) => (
          <li key={i} className="rounded-xl border-2 border-sh-cream-dark bg-sh-cream/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-base font-semibold text-sh-green">
                {table.addLabel.replace("הוספת ", "")} {i + 1}
              </span>
              {list.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRows(list.filter((_, idx) => idx !== i))}
                  className="min-h-11 rounded-lg px-3 text-base text-sh-ink/75 underline underline-offset-4 hover:text-sh-accent-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sh-green/30"
                >
                  מחיקה<span className="sr-only"> של שורה {i + 1}</span>
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {table.columns.map((col) => {
                const id = `${uid}-${i}-${col.key}`;
                return col.type === "choice" || col.type === "yesno" ? (
                  <fieldset key={col.key}>
                    <legend className="mb-2 text-base font-medium text-sh-ink/85">{col.label}</legend>
                    <Choices
                      name={id}
                      options={col.type === "yesno" ? [YES, NO] : (col.options ?? [])}
                      value={row[col.key]}
                      onChange={(v) => update(i, col.key, v)}
                    />
                  </fieldset>
                ) : (
                  <div key={col.key}>
                    <label htmlFor={id} className="mb-2 block text-base font-medium text-sh-ink/85">
                      {col.label}
                    </label>
                    <TextInput id={id} type={col.type} value={row[col.key]} onChange={(v) => update(i, col.key, v)} />
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => setRows([...list, {}])}
        className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-dashed border-sh-green/50 px-5 text-base font-semibold text-sh-green motion-safe:transition hover:bg-sh-mint/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sh-green/30"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          +
        </span>
        {table.addLabel}
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
    <section aria-label="חישוב אחוז המימון" aria-live="polite" className="rounded-2xl bg-sh-mint p-5 sm:p-6">
      <div className="text-base font-semibold text-sh-green">חישוב אוטומטי לפי מה שמילאתם</div>
      <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-sm text-sh-ink/80">אחוז מימון</dt>
          <dd className={`mt-1 text-2xl font-bold tabular-nums ${over ? "text-sh-accent-ink" : "text-sh-green"}`}>{ltv.toFixed(1)}%</dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-sm text-sh-ink/80">המקסימום המותר</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums text-sh-green">{limit}%</dd>
        </div>
        <div className="rounded-xl bg-white/70 p-3">
          <dt className="text-sm text-sh-ink/80">הון עצמי</dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums text-sh-green">{((equity / value) * 100).toFixed(0)}%</dd>
        </div>
      </dl>
      {over && (
        <p className="mt-3 text-base text-sh-ink/85">
          אחוז המימון גבוה מהמותר. זה בדיוק מה שנבדוק יחד בפגישה, ונמצא פתרון.
        </p>
      )}
    </section>
  );
}

export default function QuestionnaireForm({ token, clientName, kind }: { token: string; clientName: string; kind: Kind }) {
  const def = getQuestionnaire(kind);
  const SECTIONS = def.sections;
  const [step, setStep] = useState(0);
  const [borrowers, setBorrowers] = useState<1 | 2>(1);
  const [values, setValues] = useState<Values>({ "b1.fullName": clientName });
  const [tables, setTables] = useState<Tables>({});
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [restored, setRestored] = useState(false);
  // Don't write the draft back until it has been read, or the empty initial state would overwrite it.
  const [hydrated, setHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const movedStep = useRef(false);

  // Restore a saved draft (a per-device convenience only; never required).
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
      // storage unavailable: start fresh
    }
    setHydrated(true);
  }, [token]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey(token), JSON.stringify({ step, borrowers, values, tables } satisfies Draft));
    } catch {
      // ignore
    }
  }, [hydrated, token, step, borrowers, values, tables]);

  // After moving between steps, bring the new heading into view and give it focus,
  // so keyboard and screen-reader users start at the top of the new step.
  useEffect(() => {
    if (!movedStep.current) return;
    movedStep.current = false;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [step, done]);

  const totalSteps = SECTIONS.length + 2; // welcome + sections + review
  const isWelcome = step === 0;
  const isReview = step === totalSteps - 1;
  const section = !isWelcome && !isReview ? SECTIONS[step - 1] : null;
  const names: [string, string] = [values["b1.fullName"] || def.personLabels[0], values["b2.fullName"] || def.personLabels[1]];
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

  const shown = withCount(values, borrowers);
  const visible = {
      // The name is already asked on the opening screen.
      before: section ? section.fields.filter((f) => f.key !== "fullName" && isVisible(f, shown)) : [],
      after: section?.fieldsAfter ? section.fieldsAfter.filter((f) => isVisible(f, shown)) : [],
      tables: section?.tables ? section.tables.filter((t) => isVisible(t, shown)) : [],
  };

  function goTo(nextStep: number) {
    movedStep.current = true;
    setStep(nextStep);
  }

  function validate(): boolean {
    const miss = new Set<string>();
    const fields = isWelcome
      ? [{ key: "fullName", label: "", type: "text", perBorrower: true, required: true } as Field]
      : [...visible.before, ...visible.after];
    for (const f of fields) {
      if (!f.required) continue;
      const keys = f.perBorrower ? (borrowers === 2 ? [1, 2] : [1]).map((b) => fieldKey(f, b as 1 | 2)) : [f.key];
      for (const k of keys) if (!values[k]?.trim()) miss.add(k);
    }
    setMissing(miss);
    if (miss.size) {
      setError(miss.size === 1 ? "חסר פרט אחד שמסומן בכוכבית." : `חסרים ${miss.size} פרטים שמסומנים בכוכבית.`);
      // Take the user straight to the first missing field.
      const first = document.getElementById(domId([...miss][0])) ?? document.querySelector<HTMLElement>(`[name="${domId([...miss][0])}"]`);
      first?.focus();
      return false;
    }
    return true;
  }

  function next() {
    if (!validate()) return;
    setError(null);
    setRestored(false);
    goTo(Math.min(step + 1, totalSteps - 1));
  }

  function back() {
    setError(null);
    setMissing(new Set());
    goTo(Math.max(step - 1, 0));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitQuestionnaire(token, { version: 1, borrowers, values, tables });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      try {
        localStorage.removeItem(storageKey(token));
      } catch {
        // ignore
      }
      movedStep.current = true;
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-sm sm:p-10">
        <div aria-hidden="true" className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sh-mint">
          <svg className="h-8 w-8 text-sh-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-sh-green focus:outline-none sm:text-3xl">
          תודה רבה, {values["b1.fullName"]?.split(" ")[0]}!
        </h1>
        <p className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-sh-ink/85">
          {def.doneText}
        </p>
        <p className="mt-6 font-wordmark text-xl text-sh-accent-ink">חותמים בראש שקט.</p>
      </div>
    );
  }

  const stepLabel = isWelcome ? "פתיחה" : isReview ? "סיכום ושליחה" : `${section!.title}`;

  return (
    <div>
      {/* Progress */}
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-base font-semibold text-sh-green">{stepLabel}</span>
          <span className="text-sm text-sh-ink/75">
            שלב {step + 1} מתוך {totalSteps}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="התקדמות במילוי השאלון"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`${progress}%`}
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-sh-cream-dark"
        >
          <div className="h-full rounded-full bg-sh-green motion-safe:transition-all motion-safe:duration-500" style={{ width: `${Math.max(progress, 3)}%` }} />
        </div>
        <ol className="mt-4 hidden justify-between sm:flex" aria-label="שלבי השאלון">
          {SECTIONS.map((s, i) => {
            const idx = i + 1;
            const state = idx < step ? "done" : idx === step ? "current" : "todo";
            return (
              <li key={s.id} className="flex w-16 flex-col items-center gap-1.5 text-center" aria-current={state === "current" ? "step" : undefined}>
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    state === "done" ? "bg-sh-mint text-sh-green" : state === "current" ? "bg-sh-green text-white" : "bg-sh-cream-dark text-sh-ink/70"
                  }`}
                >
                  {state === "done" ? "✓" : s.letter}
                </span>
                <span className={`text-xs leading-tight ${state === "current" ? "font-semibold text-sh-green" : "text-sh-ink/75"}`}>
                  {s.title}
                  {state === "done" && <span className="sr-only"> (הושלם)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {restored && (
        <div role="status" className="mb-5 rounded-xl bg-sh-mint px-4 py-3 text-base text-sh-green">
          שמרנו את מה שמילאתם. אפשר להמשיך מהמקום שבו עצרתם.
        </div>
      )}

      {/* Welcome */}
      {isWelcome && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-sh-green p-6 text-white shadow-sm sm:p-8">
            <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold leading-tight focus:outline-none sm:text-3xl">
              {def.title}
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-white/95">{def.welcome}</p>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm">
              {def.chips.map((chip) => (
                <li key={chip} className="rounded-full bg-white/15 px-3.5 py-1.5">
                  {chip}
                </li>
              ))}
            </ul>
          </div>

          <fieldset className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(27,43,42,0.04)] sm:p-6">
            <legend className="sr-only">{def.countQuestion}</legend>
            <div aria-hidden="true" className="text-lg font-semibold text-sh-ink">
              {def.countQuestion}
            </div>
            <p className="mt-1 text-base text-sh-ink/75">{def.countHint}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {([1, 2] as const).map((n) => (
                <label key={n} className="relative cursor-pointer">
                  <input type="radio" name="borrowers" checked={borrowers === n} onChange={() => setBorrowers(n)} className="peer sr-only" />
                  <span className="flex min-h-14 items-center justify-center rounded-xl border-2 border-sh-cream-dark bg-white px-4 text-base font-semibold text-sh-ink motion-safe:transition hover:border-sh-green/50 peer-checked:border-sh-green peer-checked:bg-sh-green peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-sh-green/30">
                    {def.countOptions[n - 1]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <FieldBlock
            field={{ key: "fullName", label: def.nameLabel[borrowers - 1], type: "text", perBorrower: true, required: true }}
            values={values}
            set={set}
            borrowers={borrowers}
            names={def.personLabels}
            missing={missing}
          />
        </div>
      )}

      {/* Section */}
      {section && (
        <div className="space-y-5">
          <div className="px-1">
            <div className="text-base font-semibold text-sh-accent-ink">חלק {section.letter}&apos;</div>
            <h1 ref={headingRef} tabIndex={-1} className="mt-0.5 text-2xl font-bold text-sh-green focus:outline-none sm:text-3xl">
              {section.title}
            </h1>
            <p className="mt-2 text-lg leading-relaxed text-sh-ink/85">{section.intro}</p>
          </div>
          {visible.before.map((f) => (
            <FieldBlock key={f.key} field={f} values={values} set={set} borrowers={borrowers} names={names} missing={missing} />
          ))}
          {kind === "mortgage" && section.id === "deal" && <FinancingCard values={values} />}
          {visible.tables.map((t) => (
            <TableBlock key={t.key} table={t} rows={tables[t.key] ?? []} setRows={(rows) => setTables((prev) => ({ ...prev, [t.key]: rows }))} />
          ))}
          {section.note && (
            <p className="rounded-2xl border-r-4 border-sh-accent bg-white px-5 py-4 text-lg font-semibold text-sh-green">{section.note}</p>
          )}
          {visible.after.map((f) => (
            <FieldBlock key={f.key} field={f} values={values} set={set} borrowers={borrowers} names={names} missing={missing} />
          ))}
        </div>
      )}

      {/* Review */}
      {isReview && (
        <Review sections={SECTIONS} borrowers={borrowers} values={values} tables={tables} headingRef={headingRef} onEdit={(i) => goTo(i + 1)} />
      )}

      <div role="alert" aria-live="assertive" className="empty:hidden">
        {error && (
          <p className="mt-5 rounded-xl border-2 border-sh-accent-ink/30 bg-white px-4 py-3 text-base font-semibold text-sh-accent-ink">{error}</p>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-sh-cream-dark bg-sh-cream/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="min-h-12 rounded-xl border-2 border-sh-green/30 bg-white px-5 text-base font-semibold text-sh-green motion-safe:transition hover:bg-sh-mint/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sh-green/30"
            >
              <span aria-hidden="true">→ </span>חזרה
            </button>
          )}
          {!isReview ? (
            <button
              type="button"
              onClick={next}
              className="min-h-12 flex-1 rounded-xl bg-sh-green px-5 text-base font-bold text-white shadow-sm motion-safe:transition hover:bg-sh-green-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sh-green/40"
            >
              {isWelcome ? "מתחילים" : step === totalSteps - 2 ? "לסיכום" : "המשך"}
              <span aria-hidden="true"> ←</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="min-h-12 flex-1 rounded-xl bg-sh-green px-5 text-base font-bold text-white shadow-sm motion-safe:transition hover:bg-sh-green-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sh-green/40 disabled:opacity-70"
            >
              {isPending ? "שולחים..." : "שליחת השאלון"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Review({
  sections,
  borrowers,
  values,
  tables,
  headingRef,
  onEdit,
}: {
  sections: Section[];
  borrowers: 1 | 2;
  values: Values;
  tables: Tables;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onEdit: (sectionIndex: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-sh-green focus:outline-none sm:text-3xl">
          כמעט סיימנו
        </h1>
        <p className="mt-2 text-lg leading-relaxed text-sh-ink/85">
          עברו רגע על השלבים. אפשר לחזור לכל שלב ולתקן לפני השליחה. שדות שלא מילאתם נשאיר לשיחה.
        </p>
      </div>
      <ul className="space-y-3">
        {sections.map((s, i) => {
          const shown = withCount(values, borrowers);
          const fields = [...s.fields, ...(s.fieldsAfter ?? [])].filter((f) => isVisible(f, shown));
          let filled = 0;
          let total = 0;
          for (const f of fields) {
            const keys = f.perBorrower ? (borrowers === 2 ? [1, 2] : [1]).map((b) => fieldKey(f, b as 1 | 2)) : [f.key];
            for (const k of keys) {
              total++;
              if (values[k]) filled++;
            }
          }
          const rows = (s.tables ?? []).filter((t) => isVisible(t, shown)).reduce((a, t) => a + (tables[t.key]?.filter((r) => Object.values(r).some(Boolean)).length ?? 0), 0);
          const parts = [total > 0 ? `מולאו ${filled} מתוך ${total}` : "", s.tables?.length ? (rows ? `${rows} שורות בטבלה` : "הטבלה ריקה") : ""].filter(Boolean);
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(27,43,42,0.04)] sm:p-5">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sh-mint text-base font-bold text-sh-green">
                  {s.letter}
                </span>
                <div>
                  <div className="text-lg font-semibold text-sh-ink">{s.title}</div>
                  <div className="text-base text-sh-ink/75">{parts.join(" · ")}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onEdit(i)}
                className="min-h-11 shrink-0 rounded-lg px-3 text-base font-semibold text-sh-green underline underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sh-green/30"
              >
                עריכה<span className="sr-only"> של {s.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="px-1 text-base text-sh-ink/75">הפרטים נשלחים ישירות לישראל שרמן ונשמרים במערכת מאובטחת.</p>
    </div>
  );
}
