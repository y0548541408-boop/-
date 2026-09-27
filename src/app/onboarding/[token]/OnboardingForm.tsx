"use client";

import { useState, useTransition } from "react";
import { submitOnboarding } from "./actions";
import { STEPS, type FieldConfig } from "./formSchema";

type Values = Record<string, string | string[]>;

const OTHER_LABEL = "אחר";
const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

function isEmpty(value: string | string[] | undefined): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return value.trim().length === 0;
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
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>
      {field.hint && <p className="mb-1 text-xs text-gray-400">{field.hint}</p>}

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
        <div className="space-y-1.5">
          {[...field.options, ...(field.hasOther ? [OTHER_LABEL] : [])].map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name={field.key}
                checked={value === option}
                onChange={() => onChange(field.key, option)}
                className="h-4 w-4 border-gray-300"
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
        <div className="space-y-1.5">
          {[...field.options, ...(field.hasOther ? [OTHER_LABEL] : [])].map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Array.isArray(value) && value.includes(option)}
                onChange={() => onToggle(field.key, option)}
                className="h-4 w-4 rounded border-gray-300"
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
        return "יש למלא את כל השדות המסומנות בכוכבית לפני שממשיכים.";
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
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">תודה!</h1>
        <p className="mt-2 text-sm text-gray-600">
          הפרטים התקבלו בהצלחה. ישראל יעבור עליהם לקראת הפגישה שלכם ויצור איתכם קשר
          לתיאום.
        </p>
      </div>
    );
  }

  const isIntro = step === 0;
  const isLastStep = step === totalSteps - 1;
  const sectionTitle = isIntro ? "פרטי יצירת קשר" : STEPS[step - 1].title;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="mb-2 flex justify-between text-xs text-gray-500">
          <span>{sectionTitle}</span>
          <span>
            שלב {step + 1} מתוך {totalSteps}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-gray-900 transition-all"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isIntro ? (
          <>
            <p className="text-xs text-gray-500">
              רק כדי שנדע איך ליצור איתכם קשר, ואז נצלול לפרטים.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                שם מלא *
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                טלפון *
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

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            הקודם
          </button>
        )}
        {!isLastStep ? (
          <button
            type="button"
            onClick={goNext}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            הבא
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "שולח..." : "שליחה"}
          </button>
        )}
      </div>
    </div>
  );
}
