"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addExpense, addRecurringExpense, reallocateBudget } from "./actions";

type CategoryOption = { id: string; name: string; type: "fixed" | "variable"; remaining: number };

type OverBudgetPrompt = {
  categoryId: string;
  categoryName: string;
  overageAmount: number;
};

export default function ExpenseTools({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overBudget, setOverBudget] = useState<OverBudgetPrompt | null>(null);
  const [fromCategoryId, setFromCategoryId] = useState("");
  const [reallocAmount, setReallocAmount] = useState("");
  const [reallocError, setReallocError] = useState<string | null>(null);

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number(amount);

    startTransition(async () => {
      const result = isRecurring
        ? await addRecurringExpense({ categoryId, name: note, amount: parsedAmount })
        : await addExpense({ categoryId, amount: parsedAmount, note });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setAmount("");
      setNote("");
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
        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <h2 className="mb-3 text-sm font-semibold text-gray-900">הוספת הוצאה</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
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
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-32"
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isRecurring ? 'שם ההוצאה הקבועה (למשל "שכירות")' : "הערה (לא חובה)"}
          required={isRecurring}
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          הוצאה קבועה (תתחדש אוטומטית כל חודש)
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending || !categoryId}
          className="mt-3 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "שומר..." : isRecurring ? "הוסף הוצאה קבועה" : "הוסף הוצאה"}
        </button>
      </form>

      {overBudget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            onSubmit={handleReallocate}
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg"
          >
            <h3 className="text-base font-semibold text-gray-900">
              חריגה בקטגוריית {overBudget.categoryName}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              חרגתם ב-{overBudget.overageAmount.toFixed(0)} ₪. על חשבון מה נעביר את הסכום הזה?
            </p>

            <label className="mt-4 block text-sm font-medium text-gray-700">
              קיזוז מקטגוריה
            </label>
            <select
              value={fromCategoryId}
              onChange={(e) => setFromCategoryId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {reallocationSources.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (נותרו {c.remaining.toFixed(0)} ₪)
                </option>
              ))}
            </select>

            <label className="mt-3 block text-sm font-medium text-gray-700">סכום להעברה</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={reallocAmount}
              onChange={(e) => setReallocAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            {reallocError && <p className="mt-2 text-sm text-red-600">{reallocError}</p>}

            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={isPending || !fromCategoryId}
                className="flex-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isPending ? "מעביר..." : "בצע קיזוז"}
              </button>
              <button
                type="button"
                onClick={() => setOverBudget(null)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
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
