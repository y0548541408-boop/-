"use client";

import { useState, useTransition } from "react";
import { submitOnboarding } from "./actions";
import { STEPS, CHAPTERS, type FieldConfig } from "./formSchema";

type Values = Record<string, string | string[]>;

const OTHER_LABEL = "אחר";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 transition focus:border-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-navy/10";

function isEmpty(value: string | string[] | undefined): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return value.trim().length === 0;
}

function chapterTitleForStep(step: number): string {
  // step 0 is the intro/contact screen, grouped with the first chapter.
  return step === 0 ? STEPS[0].chapter : STEPS[step - 1].chapter;
}

function chapterIndexForStep(step: number): number {
  return CHAPTERS.findIndex((c) => c.title === chapterTitleForStep(step));
}

function Field({
  field,
  values,
  onChange,
  onToggle,
}: {
  field: FieldConfig;
  values: Values;
  onChange: (key: string, value: string) => void;
  onToggle: (key: string, option: string) => void;
}) {
  const value = values[field.key];

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-800">
        {field.label}
        {field.required && <span className="text-brand-gold font-semibold"> *</span>}
      </label>
      {field.hint && <p className="mb-1.5 text-xs text-gray-400">{field.hint}</p>}

      {field.type === "text" && (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClass}
        />
      )}

      {field.type === "textarea" && (
        <textarea
          rows={3}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={inputClass}
        />
      )}

      {field.type === "radio" && (
        <div className="space-y-2">
          {[...field.options, ...(field.hasOther ? [OTHER_LABEL] : [])].map((option) => (
            <label
              key={option}
              className="flex items-center gap-2.5 text-sm text-gray-700"
            >
              <input
                type="radio"
                name={field.key}
                checked={value === option}
                onChange={() => onChange(field.key, option)}
                className="h-4 w-4 accent-[#D9B25C]"
              />
              {option}
            </label>
          ))}
          {field.hasOther && value === OTHER_LABEL && (
            <input
              type="text"
              placeholder="פרטו..."
              value={(values[`${field.key}__other`] as string) ?? ""}
              onChange={(e) => onChange(`${field.key}__other`, e.target.value)}
              className={`${inputClass} mt-1`}
            />
          )}
        </div>
      )}

      {field.type === "checkbox" && (
        <div className="space-y-2">
          {[...field.options, ...(field.hasOther ? [OTHER_LABEL] : [])].map((option) => (
            <label
              key={option}
              className="flex items-center gap-2.5 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                checked={Array.isArray(value) && value.includes(option)}
                onChange={() => onToggle(field.key, option)}
                className="h-4 w-4 rounded accent-[#D9B25C]"
              />
              {option}
            </label>
          ))}
          {field.hasOther && Array.isArray(value) && value.includes(OTHER_LABEL) && (
            <input
              type="text"
              placeholder="פרטו..."
              value={(values[`${field.key}__other`] as string) ?? ""}
              onChange={(e) => onChange(`${field.key}__other`, e.target.value)}
              className={`${inputClass} mt-1`}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function OnboardingForm({ token }: { token: string }) {
  const [step, setStep] = useState(0);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [values, setValues] = useState<Values>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalSteps = STEPS.length + 1; // +1 for the intro contact step

  function onChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function onToggle(key: string, option: string) {
    setValues((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  }

  function validateCurrentStep(): string | null {
    if (step === 0) {
      if (!contactName.trim() || !contactPhone.trim()) {
        return "יש להזין שם וטלפון ליצירת קשר.";
      }
      return null;
    }
    const section = STEPS[step - 1];
    for (const field of section.fields) {
      if (field.required && isEmpty(values[field.key])) {
        return "יש למלא את כל השדות המסומנים בכוכבית לפני שממשיכים.";
      }
    }
    return null;
  }

  function goNext() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await submitOnboarding(token, {
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        ...values,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-brand-navy/10 bg-white p-8 text-center shadow-lg shadow-brand-navy/5">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold/15">
          <svg
            className="h-7 w-7 text-brand-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-brand-navy">תודה רבה!</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          כל הכבוד שלקחתם את הזמן למלא את זה בקפידה. ישראל יעבור על הפרטים לקראת
          הפגישה שלכם ויצור איתכם קשר לתיאום.
        </p>
      </div>
    );
  }

  const isIntro = step === 0;
  const isLastStep = step === totalSteps - 1;
  const sectionTitle = isIntro ? "פרטי יצירת קשר" : STEPS[step - 1].title;
  const chapterIndex = chapterIndexForStep(step);
  const chapter = CHAPTERS[chapterIndex];
  const isFirstStepOfChapter =
    step === 0 || chapterTitleForStep(step) !== chapterTitleForStep(step - 1);

  return (
    <div className="rounded-3xl border border-brand-navy/10 bg-white p-6 shadow-lg shadow-brand-navy/5">
      <div className="mb-5">
        <div className="mb-2.5 flex items-center justify-center gap-1.5">
          {CHAPTERS.map((c, i) => (
            <div
              key={c.title}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < chapterIndex
                  ? "bg-brand-gold"
                  : i === chapterIndex
                    ? "bg-brand-navy"
                    : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-xs font-medium text-brand-navy/60">
          פרק {chapterIndex + 1} מתוך {CHAPTERS.length} · {chapter.title}
        </p>
        {isFirstStepOfChapter && (
          <p className="mt-2 text-center text-sm text-gray-500">{chapter.intro}</p>
        )}
        {!isIntro && (
          <h2 className="mt-3 text-base font-semibold text-brand-navy">
            {sectionTitle}
          </h2>
        )}
      </div>

      <div className="space-y-5">
        {isIntro ? (
          <>
            <p className="text-sm text-gray-500">
              שלום וברכה! רק כדי שנדע איך ליצור איתכם קשר, ואז נצלול לפרטים.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-800">
                שם מלא <span className="text-brand-gold font-semibold">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-800">
                טלפון <span className="text-brand-gold font-semibold">*</span>
              </label>
              <input
                type="tel"
                dir="ltr"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className={inputClass}
              />
            </div>
          </>
        ) : (
          STEPS[step - 1].fields.map((field) => (
            <Field
              key={field.key}
              field={field}
              values={values}
              onChange={onChange}
              onToggle={onToggle}
            />
          ))
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="rounded-xl border border-brand-navy/20 px-4 py-2.5 text-sm font-medium text-brand-navy transition hover:bg-brand-navy/5"
          >
            הקודם
          </button>
        )}
        {!isLastStep ? (
          <button
            type="button"
            onClick={goNext}
            className="flex-1 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-navy-dark"
          >
            הבא
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-navy-dark disabled:opacity-50"
          >
            {isPending ? "שולח..." : "שליחה"}
          </button>
        )}
      </div>
    </div>
  );
}
