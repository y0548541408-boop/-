"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addIncome } from "./actions";

type IncomeCategoryOption = { id: string; name: string };

export default function IncomeTools({
  categories,
}: {
  categories: IncomeCategoryOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
      const result = await addIncome({ categoryId, newCategoryName, amount: parsedAmount, note });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setAmount("");
      setNote("");
      setNewCategoryName("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleAddIncome}
      className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <h2 className="mb-3 text-sm font-semibold text-gray-900">הוספת הכנסה</h2>
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
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:w-32"
        />
      </div>
      {categoryId === "__new__" && (
        <input
          type="text"
          required
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder='שם הקטגוריה החדשה (למשל "טיפולים")'
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      )}
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="הערה (לא חובה)"
        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !categoryId}
        className="mt-3 w-full rounded-lg bg-brand-gold px-3 py-2 text-sm font-medium text-brand-navy hover:brightness-95 disabled:opacity-50"
      >
        {isPending ? "שומר..." : "הוסף הכנסה"}
      </button>
    </form>
  );
}
