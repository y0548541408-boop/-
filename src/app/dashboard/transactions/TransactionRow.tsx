"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction, updateTransaction } from "../actions";
import type { TransactionEntry } from "@/lib/transactions";

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TransactionRow({ entry }: { entry: TransactionEntry }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(entry.amount));
  const [note, setNote] = useState(entry.note ?? "");
  const [date, setDate] = useState(toDateInputValue(entry.occurredAt));
  const [error, setError] = useState<string | null>(null);

  const isIncome = entry.kind === "income";

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateTransaction({
        id: entry.id,
        kind: entry.kind,
        amount: Number(amount),
        note,
        occurredAt: date,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("למחוק את התנועה הזו?")) return;
    startTransition(async () => {
      await deleteTransaction({ id: entry.id, kind: entry.kind });
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-brand-gold/40 bg-white p-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="הערה"
          className="mt-2 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 rounded-lg bg-brand-navy px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {isPending ? "שומר..." : "שמירה"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs text-gray-600"
          >
            ביטול
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-sm">
      <div>
        <div className="font-medium text-gray-900">
          {entry.categoryName}
          {entry.note && <span className="font-normal text-gray-500"> · {entry.note}</span>}
        </div>
        <div className="text-xs text-gray-400">{entry.occurredAt.toLocaleDateString("he-IL")}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
          {isIncome ? "+" : "-"}
          {entry.amount.toFixed(0)} ₪
        </span>
        <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-brand-navy">
          עריכה
        </button>
        <button onClick={handleDelete} disabled={isPending} className="text-xs text-gray-400 hover:text-red-600">
          מחיקה
        </button>
      </div>
    </div>
  );
}
