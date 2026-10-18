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
        className="rounded-md border border-dashed border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:border-brand-teal hover:text-brand-teal"
        aria-label="עריכת תקציב"
      >
        {displayAmount.toFixed(0)} ₪ ✎
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
        className="w-20 rounded-md border border-gray-300 px-1.5 py-0.5 text-xs"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand-teal px-2 py-0.5 text-xs text-white disabled:opacity-50"
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
