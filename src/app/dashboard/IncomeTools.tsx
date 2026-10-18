"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addIncome } from "./actions";

type IncomeCategoryOption = { id: string; name: string };

export default function IncomeTools({
  categories,
  defaultDate,
}: {
  categories: IncomeCategoryOption[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(defaultDate);
  const [saved, setSaved] = useState(false);

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleAddIncome(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsedAmount = Number(amount);

    startTransition(async () => {
      const result = await addIncome({ categoryId, newCategoryName, amount: parsedAmount, note, date });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setAmount("");
      setNote("");
      setNewCategoryName("");
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleAddIncome}
      className="mt-3 rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]"
    >
      <h2 className="mb-4 text-lg font-bold text-ru-ink">הוספת הכנסה</h2>
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
          placeholder='שם הקטגוריה החדשה (למשל "טיפולים")'
          className="mt-3 w-full rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base"
        />
      )}
      <input
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
        aria-label="תאריך"
        className="mt-3 w-full rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        placeholder="הערה (לא חובה)"
        className="mt-3 w-full rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base"
      />
      {error && <p className="mt-2 text-sm font-semibold text-ru-pink">{error}</p>}
      {saved && !error && <p className="mt-2 text-sm font-semibold text-ru-green">נשמר ✓ אפשר להוסיף עוד.</p>}
      <button
        type="submit"
        disabled={isPending || !categoryId}
        className="mt-3 w-full rounded-full bg-ru-green px-4 py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(0,191,111,0.35)] disabled:opacity-50"
      >
        {isPending ? "שומר..." : "הוסף הכנסה"}
      </button>
    </form>
  );
}
