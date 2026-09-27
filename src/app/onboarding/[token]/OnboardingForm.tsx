"use client";

import { useState, useTransition } from "react";
import { submitOnboarding, type OnboardingResponses } from "./actions";

const STEPS = ["פרטים אישיים", "הכנסות", "הוצאות והתחייבויות", "חיסכון ומטרות"];

type FormState = {
  fullName: string;
  phone: string;
  spouseName: string;
  childrenCount: string;
  incomeSelf: string;
  incomeSpouse: string;
  incomeOther: string;
  rentOrMortgage: string;
  loanPayments: string;
  creditCardDebt: string;
  hasEmergencyFund: boolean;
  emergencyFundAmount: string;
  mainGoal: string;
  biggestConcern: string;
};

const initialState: FormState = {
  fullName: "",
  phone: "",
  spouseName: "",
  childrenCount: "",
  incomeSelf: "",
  incomeSpouse: "",
  incomeOther: "",
  rentOrMortgage: "",
  loanPayments: "",
  creditCardDebt: "",
  hasEmergencyFund: false,
  emergencyFundAmount: "",
  mainGoal: "",
  biggestConcern: "",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

export default function OnboardingForm({ token }: { token: string }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!form.fullName.trim()) return "יש להזין שם מלא.";
      if (!form.phone.trim()) return "יש להזין מספר טלפון.";
    }
    return null;
  }

  function goNext() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit() {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    const payload: OnboardingResponses = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      spouseName: form.spouseName.trim(),
      childrenCount: Number(form.childrenCount) || 0,
      incomeSelf: Number(form.incomeSelf) || 0,
      incomeSpouse: Number(form.incomeSpouse) || 0,
      incomeOther: Number(form.incomeOther) || 0,
      rentOrMortgage: Number(form.rentOrMortgage) || 0,
      loanPayments: Number(form.loanPayments) || 0,
      creditCardDebt: Number(form.creditCardDebt) || 0,
      hasEmergencyFund: form.hasEmergencyFund,
      emergencyFundAmount: form.hasEmergencyFund
        ? Number(form.emergencyFundAmount) || 0
        : null,
      mainGoal: form.mainGoal.trim(),
      biggestConcern: form.biggestConcern.trim(),
    };

    startTransition(async () => {
      const result = await submitOnboarding(token, payload);
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

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="mb-2 flex justify-between text-xs text-gray-500">
          <span>{STEPS[step]}</span>
          <span>
            שלב {step + 1} מתוך {STEPS.length}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-gray-900 transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {step === 0 && (
          <>
            <Field label="שם מלא *">
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="טלפון *">
              <input
                type="tel"
                dir="ltr"
                required
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="שם בן/בת הזוג (אם רלוונטי)">
              <input
                type="text"
                value={form.spouseName}
                onChange={(e) => update("spouseName", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="מספר ילדים">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={form.childrenCount}
                onChange={(e) => update("childrenCount", e.target.value)}
                className={inputClass}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-xs text-gray-500">הכנסה חודשית נטו (אחרי מס), בש״ח.</p>
            <Field label="ההכנסה שלך">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={form.incomeSelf}
                onChange={(e) => update("incomeSelf", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="הכנסת בן/בת הזוג">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={form.incomeSpouse}
                onChange={(e) => update("incomeSpouse", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="הכנסות נוספות (שכירות, קצבאות וכד׳)">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={form.incomeOther}
                onChange={(e) => update("incomeOther", e.target.value)}
                className={inputClass}
              />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="שכר דירה / משכנתא חודשי">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={form.rentOrMortgage}
                onChange={(e) => update("rentOrMortgage", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="סה״כ החזרי הלוואות חודשי">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={form.loanPayments}
                onChange={(e) => update("loanPayments", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="יתרת חוב בכרטיסי אשראי / מסגרת">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={form.creditCardDebt}
                onChange={(e) => update("creditCardDebt", e.target.value)}
                className={inputClass}
              />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.hasEmergencyFund}
                onChange={(e) => update("hasEmergencyFund", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              יש לנו כיום קרן חירום
            </label>
            {form.hasEmergencyFund && (
              <Field label="סכום משוער בקרן החירום">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={form.emergencyFundAmount}
                  onChange={(e) => update("emergencyFundAmount", e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}
            <Field label="מה המטרה העיקרית שלכם מהתהליך?">
              <textarea
                rows={3}
                value={form.mainGoal}
                onChange={(e) => update("mainGoal", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="מה הכי מטריד אתכם כלכלית כרגע?">
              <textarea
                rows={3}
                value={form.biggestConcern}
                onChange={(e) => update("biggestConcern", e.target.value)}
                className={inputClass}
              />
            </Field>
          </>
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
        {step < STEPS.length - 1 ? (
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
