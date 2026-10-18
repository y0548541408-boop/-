"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExpenseCategoryPlanned, updateIncomeCategoryPlanned } from "./actions";

export default function PlannedAmountEditor({
  kind,
  categoryId,
  displayAmount,
  baseAmount,
}: {
  kind: "expense" | "income";
  categoryId: string;
  displayAmount: number;
  baseAmount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(baseAmount));
  const [error, setError] = useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = Number(value);

    startTransition(async () => {
      const result =
        kind === "expense"
          ? await updateExpenseCategoryPlanned({ categoryId, amount })
          : await updateIncomeCategoryPlanned({ categoryId, amount });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(baseAmount));
          setEditing(true);
        }}
        className="flex items-baseline gap-1.5 text-lg text-ru-ink hover:text-ru-blue"
        aria-label="עריכת תקציב"
      >
        ₪{displayAmount.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
        <span className="text-xs text-ru-muted">✎</span>
      </button>
    );
  }

  return (
    <form onSubmit={save} className="flex items-center gap-1">
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="1"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 rounded-xl border border-ru-blue-soft bg-white px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-ru-blue px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        {isPending ? "..." : "שמור"}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-gray-400"
      >
        ביטול
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
