"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addExpense, addRecurringExpense, reallocateBudget , deleteTransaction } from "./actions";
import SavedBanner, { type EntryStatus } from "./SavedBanner";

type CategoryOption = { id: string; name: string; type: "fixed" | "variable"; remaining: number };

type OverBudgetPrompt = {
  categoryId: string;
  categoryName: string;
  overageAmount: number;
};

export default function ExpenseTools({
  categories,
  defaultDate,
}: {
  categories: CategoryOption[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(defaultDate);
  const [status, setStatus] = useState<EntryStatus>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overBudget, setOverBudget] = useState<OverBudgetPrompt | null>(null);
  const [fromCategoryId, setFromCategoryId] = useState("");
  const [reallocAmount, setReallocAmount] = useState("");
  const [reallocError, setReallocError] = useState<string | null>(null);

  function handleUndo() {
    if (!lastId) return;
    startTransition(async () => {
      const result = await deleteTransaction({ id: lastId, kind: "expense" });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setLastId(null);
      setStatus("undone");
      router.refresh();
    });
  }

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isRecurring && categoryId === "__new__") {
      setError("להוצאה קבועה יש לבחור קטגוריה קיימת (אפשר להוסיף קטגוריה חדשה קודם כהוצאה רגילה).");
      return;
    }

    const parsedAmount = Number(amount);

    startTransition(async () => {
      const result = isRecurring
        ? await addRecurringExpense({ categoryId, name: note, amount: parsedAmount })
        : await addExpense({ categoryId, newCategoryName, amount: parsedAmount, note, date });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setAmount("");
      setNote("");
      setNewCategoryName("");
      setStatus("saved");
      setLastId("id" in result && result.id ? result.id : null);
      if (result.overBudget) {
        setOverBudget(result.overBudget);
        setReallocAmount(String(result.overBudget.overageAmount));
        setFromCategoryId(
          categories.find((c) => c.id !== result.overBudget!.categoryId)?.id ?? ""
        );
      }
      router.refresh();
    });
  }

  function handleReallocate(e: React.FormEvent) {
    e.preventDefault();
    if (!overBudget) return;
    setReallocError(null);
    const parsedAmount = Number(reallocAmount);

    startTransition(async () => {
      const result = await reallocateBudget({
        fromCategoryId,
        toCategoryId: overBudget.categoryId,
        amount: parsedAmount,
      });
      if ("error" in result) {
        setReallocError(result.error);
        return;
      }
      setOverBudget(null);
      router.refresh();
    });
  }

  const reallocationSources = categories.filter((c) => c.id !== overBudget?.categoryId);

  return (
    <div className="mt-6">
      <form
        onSubmit={handleAddExpense}
        className="rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]"
      >
        <h2 className="mb-4 text-lg font-bold text-ru-ink">הוספת הוצאה</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new__">+ קטגוריה חדשה</option>
          </select>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="סכום בש״ח"
            className="rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base sm:w-32"
          />
        </div>
        {categoryId === "__new__" && (
          <input
            type="text"
            required
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder='שם הקטגוריה החדשה (למשל "בריאות")'
            className="mt-3 w-full rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base"
          />
        )}
        {!isRecurring && (
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="תאריך"
            className="mt-3 w-full rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base"
          />
        )}
        <input
          type="text"
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setStatus(null);
          }}
          placeholder={isRecurring ? 'שם ההוצאה הקבועה (למשל "שכירות")' : "הערה (לא חובה)"}
          required={isRecurring}
          className="mt-3 w-full rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base"
        />
        <label className="mt-3 flex items-center gap-2 text-sm text-ru-ink">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-5 w-5 rounded accent-ru-blue"
          />
          הוצאה קבועה (תתחדש אוטומטית כל חודש)
        </label>
        {error && <p className="mt-2 text-sm font-semibold text-ru-pink">{error}</p>}
        {!error && (
        <SavedBanner status={status} pending={isPending} onUndo={lastId ? handleUndo : undefined} />
      )}
        <button
          type="submit"
          disabled={isPending || !categoryId}
          className="mt-3 w-full rounded-full bg-ru-blue px-4 py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(91,123,255,0.35)] disabled:opacity-50"
        >
          {isPending ? "שומר..." : isRecurring ? "הוסף הוצאה קבועה" : "הוסף הוצאה"}
        </button>
      </form>

      {overBudget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            onSubmit={handleReallocate}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-bold text-ru-ink">
              חריגה בקטגוריית {overBudget.categoryName}
            </h3>
            <p className="mt-1 text-sm text-ru-ink/70">
              חרגתם ב-{overBudget.overageAmount.toFixed(0)} ₪. על חשבון מה נעביר את הסכום הזה?
            </p>

            <label className="mt-4 block text-sm font-medium text-ru-ink">
              קיזוז מקטגוריה
            </label>
            <select
              value={fromCategoryId}
              onChange={(e) => setFromCategoryId(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base"
            >
              {reallocationSources.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (נותרו {c.remaining.toFixed(0)} ₪)
                </option>
              ))}
            </select>

            <label className="mt-3 block text-sm font-medium text-ru-ink">סכום להעברה</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={reallocAmount}
              onChange={(e) => setReallocAmount(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base"
            />

            {reallocError && <p className="mt-2 text-sm font-semibold text-ru-pink">{reallocError}</p>}

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={isPending || !fromCategoryId}
                className="flex-1 rounded-full bg-ru-blue px-4 py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(91,123,255,0.35)] disabled:opacity-50"
              >
                {isPending ? "מעביר..." : "בצע קיזוז"}
              </button>
              <button
                type="button"
                onClick={() => setOverBudget(null)}
                className="rounded-full border border-ru-blue-soft px-4 py-3 text-sm text-ru-ink/70"
              >
                אטפל בזה אחר כך
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
