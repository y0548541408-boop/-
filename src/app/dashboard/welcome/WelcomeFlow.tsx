"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatShekel } from "../RiseCard";
import { completeWelcome } from "./actions";

type Category = { id: string; name: string };
type Amounts = Record<string, string>;

const CARD = "rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]";
const PRIMARY =
  "w-full rounded-full bg-ru-blue px-4 py-3.5 text-base font-bold text-white shadow-[0_4px_14px_rgba(91,123,255,0.35)] disabled:opacity-50";
const GHOST = "w-full rounded-full px-4 py-3 text-sm font-semibold text-ru-muted";
const GOAL_IDEAS = ["קרן חירום", "דירה", "חתונה", "רכב"];

const toNumber = (value: string | undefined) => (value ? Number(value) || 0 : 0);
const sum = (amounts: Amounts) => Object.values(amounts).reduce((s, v) => s + toNumber(v), 0);

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 border-t border-ru-bg py-3 first:border-t-0">
      <span className="text-base">{label}</span>
      <span className="flex w-32 shrink-0 items-center gap-1.5 rounded-2xl border border-ru-blue-soft bg-white px-3 py-2">
        <span className="text-ru-muted">₪</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full min-w-0 bg-transparent text-base outline-none"
        />
      </span>
    </label>
  );
}

function StepHeader({ step, title, hint }: { step: number; title: string; hint: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-ru-muted">
        <span>צעד {step} מתוך 3</span>
        <span>דקה וחצי בסך הכל</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ru-blue-soft">
        <div
          className="h-full rounded-full bg-ru-blue transition-all"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
      <h2 className="mt-5 text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-ru-muted">{hint}</p>
    </div>
  );
}

export default function WelcomeFlow({
  firstName,
  incomeCategories,
  fixedCategories,
  variableCategories,
}: {
  firstName: string;
  incomeCategories: Category[];
  fixedCategories: Category[];
  variableCategories: Category[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [income, setIncome] = useState<Amounts>({});
  const [expenses, setExpenses] = useState<Amounts>({});
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");

  const totalIncome = sum(income);
  const totalExpenses = sum(expenses);
  const left = totalIncome - totalExpenses;

  function finish(skip: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await completeWelcome(
        skip
          ? { income: [], expenses: [] }
          : {
              income: incomeCategories
                .filter((c) => income[c.id])
                .map((c) => ({ id: c.id, amount: toNumber(income[c.id]) })),
              expenses: [...fixedCategories, ...variableCategories]
                .filter((c) => expenses[c.id])
                .map((c) => ({ id: c.id, amount: toNumber(expenses[c.id]) })),
              goal: { title: goalTitle, target: toNumber(goalTarget) },
            }
      );
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  if (step === 0) {
    return (
      <div className="mt-8 space-y-4">
        <div className={CARD}>
          <h1 className="text-2xl font-bold">ברוכים הבאים, {firstName}</h1>
          <p className="mt-3 text-base leading-relaxed text-ru-ink/80">
            בשלושה צעדים קטנים נבנה את התקציב של המשפחה: כמה נכנס, כמה מתכננים להוציא, ולמה חוסכים.
          </p>
          <p className="mt-2 text-sm text-ru-muted">
            בערך זה בסדר גמור. הכל אפשר לתקן אחר כך בלחיצה.
          </p>
        </div>
        <button type="button" className={PRIMARY} onClick={() => setStep(1)}>
          מתחילים
        </button>
        <button type="button" className={GHOST} disabled={isPending} onClick={() => finish(true)}>
          {isPending ? "רגע..." : "אעשה את זה אחר כך"}
        </button>
        {error && <p className="text-sm font-semibold text-ru-pink">{error}</p>}
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="mt-6 space-y-4">
        <StepHeader
          step={1}
          title="כמה נכנס אליכם בחודש?"
          hint="מה שיש, בערך. מה שלא רלוונטי משאירים ריק."
        />
        <div className={CARD}>
          {incomeCategories.map((c) => (
            <AmountField
              key={c.id}
              label={c.name}
              value={income[c.id] ?? ""}
              onChange={(v) => setIncome({ ...income, [c.id]: v })}
            />
          ))}
          <div className="mt-2 flex items-baseline justify-between border-t border-ru-blue-soft pt-3">
            <span className="font-bold">סה״כ בחודש</span>
            <span className="text-lg font-bold text-ru-green">{formatShekel(totalIncome)}</span>
          </div>
        </div>
        <button type="button" className={PRIMARY} onClick={() => setStep(2)}>
          המשך
        </button>
        <button type="button" className={GHOST} onClick={() => setStep(2)}>
          דלגו על הצעד הזה
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="mt-6 space-y-4">
        <StepHeader
          step={2}
          title="כמה מתכננים להוציא בחודש?"
          hint="לכל סוג הוצאה, סכום חודשי משוער. תמיד אפשר לשנות."
        />
        <div className={CARD}>
          <h3 className="mb-1 text-sm font-bold text-ru-muted">הוצאות קבועות</h3>
          {fixedCategories.map((c) => (
            <AmountField
              key={c.id}
              label={c.name}
              value={expenses[c.id] ?? ""}
              onChange={(v) => setExpenses({ ...expenses, [c.id]: v })}
            />
          ))}
        </div>
        <div className={CARD}>
          <h3 className="mb-1 text-sm font-bold text-ru-muted">הוצאות משתנות</h3>
          {variableCategories.map((c) => (
            <AmountField
              key={c.id}
              label={c.name}
              value={expenses[c.id] ?? ""}
              onChange={(v) => setExpenses({ ...expenses, [c.id]: v })}
            />
          ))}
        </div>

        <div
          className={`rounded-3xl px-5 py-4 ${
            totalExpenses === 0 || left >= 0 ? "bg-ru-green-soft" : "bg-ru-pink-soft"
          }`}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">סה״כ מתוכנן להוצאות</span>
            <span className="text-lg font-bold">{formatShekel(totalExpenses)}</span>
          </div>
          {totalIncome > 0 && totalExpenses > 0 && (
            <p className="mt-1 text-sm text-ru-ink/80">
              {left >= 0
                ? `נשאר לכם ${formatShekel(left)} בחודש`
                : `התכנון עובר את ההכנסות ב-${formatShekel(-left)}. נסדר את זה יחד`}
            </p>
          )}
        </div>

        <button type="button" className={PRIMARY} onClick={() => setStep(3)}>
          המשך
        </button>
        <button type="button" className={GHOST} onClick={() => setStep(1)}>
          חזרה
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <StepHeader
        step={3}
        title="יש משהו שחוסכים אליו?"
        hint="יעד אחד מספיק להתחלה. אפשר גם לדלג."
      />
      <div className={`${CARD} space-y-3`}>
        <div className="flex flex-wrap gap-2">
          {GOAL_IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => setGoalTitle(idea)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                goalTitle === idea ? "bg-ru-blue text-white" : "bg-ru-blue-soft text-ru-blue"
              }`}
            >
              {idea}
            </button>
          ))}
        </div>
        <input
          value={goalTitle}
          onChange={(e) => setGoalTitle(e.target.value)}
          placeholder="או כתבו משהו משלכם"
          className="w-full rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base"
        />
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={goalTarget}
          onChange={(e) => setGoalTarget(e.target.value)}
          placeholder="כמה רוצים לחסוך? (₪)"
          className="w-full rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base"
        />
      </div>
      {error && <p className="text-sm font-semibold text-ru-pink">{error}</p>}
      <button type="button" className={PRIMARY} disabled={isPending} onClick={() => finish(false)}>
        {isPending ? "שומר..." : "סיימנו, לתקציב שלי"}
      </button>
      <button type="button" className={GHOST} onClick={() => setStep(2)}>
        חזרה
      </button>
    </div>
  );
}
