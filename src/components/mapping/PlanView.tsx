import Link from "next/link";
import type { MappingOverview } from "@/lib/mapping";
import { PlanLine, FillFromMapping } from "./PlanClient";

const shekel = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

export default function PlanView({
  overview,
  familyId,
  mappingHref,
  picture,
}: {
  overview: MappingOverview;
  familyId?: string;
  mappingHref: string;
  picture?: { hasData: boolean; expense: Record<string, number>; income: Record<string, number> };
}) {
  const usePicture = !!picture?.hasData;
  const hasMapping = usePicture || overview.transactionCount > 0 || overview.cash.length > 0;
  const source = usePicture ? "picture" : "bank";
  const mappedExpense = (l: { name: string; monthly: number }) => (usePicture ? picture!.expense[l.name] ?? 0 : l.monthly);
  const mappedIncome = (l: { name: string; monthly: number }) => (usePicture ? picture!.income[l.name] ?? 0 : l.monthly);
  const plannedExpenses = overview.expenseLines.reduce((s, l) => s + l.plannedAmount, 0);
  const plannedIncome = overview.incomeLines.reduce((s, l) => s + l.plannedAmount, 0);
  const left = plannedIncome - plannedExpenses;
  const savingVsToday = hasMapping
    ? (usePicture ? Object.values(picture!.expense).reduce((a, b) => a + b, 0) : overview.totalExpenseMonthly) - plannedExpenses
    : 0;

  // Biggest spending (by the mapping) first, so the big decisions come first.
  // Not by the plan itself, or lines would jump while you type.
  const expenses = overview.expenseLines;

  return (
    <div>
      <div className="mt-5 rounded-3xl bg-ru-blue p-5 text-white shadow-[0_8px_24px_rgba(11,95,88,0.3)]">
        <p className="text-base text-white/80">התוכנית החודשית שלכם</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm text-white/75">צפוי להיכנס</p>
            <p className="font-num text-2xl font-bold">{shekel(plannedIncome)}</p>
          </div>
          <div>
            <p className="text-sm text-white/75">מתוכנן לצאת</p>
            <p className="font-num text-2xl font-bold">{shekel(plannedExpenses)}</p>
          </div>
        </div>
        <div className={`mt-3 rounded-2xl px-4 py-3 ${left < 0 ? "bg-brand-mand" : "bg-white/15"}`}>
          <p className="text-sm text-white/85">{left < 0 ? "חסר כדי לסגור את החודש" : "נשאר כל חודש לחיסכון ולמטרות"}</p>
          <p className="font-num text-3xl font-bold">{shekel(Math.abs(left))}</p>
        </div>
        {hasMapping && plannedExpenses > 0 && Math.abs(savingVsToday) >= 50 && (
          <p className="mt-2 text-sm text-white/85">
            {savingVsToday > 0
              ? `התוכנית מוציאה ${shekel(savingVsToday)} פחות ממה שיצא בממוצע עד היום.`
              : `התוכנית מוציאה ${shekel(-savingVsToday)} יותר ממה שיצא בממוצע עד היום.`}
          </p>
        )}
      </div>

      {hasMapping ? (
        <FillFromMapping familyId={familyId} source={source} />
      ) : (
        <Link
          href={mappingHref}
          className="mt-4 block rounded-3xl bg-ru-blue-soft p-4 text-base"
        >
          <span className="font-bold text-ru-blue">עוד אין מיפוי. </span>
          כשממלאים את תמונת המצב ומעלים פירוט מהבנק, רואים כאן ליד כל קטגוריה כמה יוצא היום. ←
        </Link>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
      <div>
      <h2 className="mt-7 font-display text-2xl text-ru-blue">הוצאות</h2>
      <p className="text-base text-ru-muted">כמה מוציאים מעכשיו בכל חודש. נשמר לבד.</p>
      <div className="mt-3 space-y-2.5">
        {expenses.map((l) => (
          <PlanLine
            key={l.id}
            familyId={familyId}
            kind="expense"
            id={l.id}
            name={l.name}
            mapped={mappedExpense(l)}
            planned={l.plannedAmount}
            hasMapping={hasMapping}
            source={source}
          />
        ))}
      </div>

      </div>
      <div>
      <h2 className="mt-7 font-display text-2xl text-ru-blue">הכנסות</h2>
      <p className="text-base text-ru-muted">כמה צפוי להיכנס בחודש רגיל.</p>
      <div className="mt-3 space-y-2.5">
        {overview.incomeLines.map((l) => (
          <PlanLine
            key={l.id}
            familyId={familyId}
            kind="income"
            id={l.id}
            name={l.name}
            mapped={mappedIncome(l)}
            planned={l.plannedAmount}
            hasMapping={hasMapping}
            source={source}
          />
        ))}
      </div>
      </div>
      </div>
    </div>
  );
}
