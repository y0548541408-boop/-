"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTransaction, updateTransaction } from "../actions";
import { formatShekel } from "../RiseCard";
import type { TransactionEntry } from "@/lib/transactions";

function toDateInputValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const INPUT = "rounded-2xl border border-ru-blue-soft bg-white px-3 py-2.5 text-base";
const CARD = "rounded-3xl bg-white p-4 shadow-[0_2px_14px_rgba(46,46,46,0.07)]";

export default function TransactionRow({ entry }: { entry: TransactionEntry }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(entry.amount));
  const [note, setNote] = useState(entry.note ?? "");
  const [date, setDate] = useState(toDateInputValue(entry.occurredAt));
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
    startTransition(async () => {
      const result = await deleteTransaction({ id: entry.id, kind: entry.kind });
      if ("error" in result) {
        setError(result.error);
        setConfirmingDelete(false);
        return;
      }
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className={`${CARD} ring-2 ring-ru-blue-soft`}>
        <p className="mb-3 font-bold">{entry.categoryName}</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={INPUT}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={INPUT}
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="הערה"
          className={`${INPUT} mt-2 w-full`}
        />
        {error && <p className="mt-2 text-sm font-semibold text-ru-pink">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex-1 rounded-full bg-ru-blue px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? "שומר..." : "שמירה"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-full border border-ru-blue-soft px-4 py-2.5 text-sm text-ru-ink/70"
          >
            ביטול
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${CARD} flex items-center justify-between gap-3`}>
      <div className="min-w-0">
        <div className="truncate font-bold text-ru-ink">{entry.categoryName}</div>
        <div className="truncate text-xs text-ru-muted">
          {entry.occurredAt.toLocaleDateString("he-IL")}
          {entry.note && ` · ${entry.note}`}
        </div>
        {confirmingDelete ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-ru-ink">למחוק את התנועה?</span>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-full bg-ru-pink px-3 py-1.5 font-bold text-white disabled:opacity-50"
            >
              {isPending ? "מוחק..." : "כן, מחק"}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="rounded-full border border-ru-blue-soft px-3 py-1.5 text-ru-ink/70"
            >
              ביטול
            </button>
          </div>
        ) : (
          <div className="mt-2 flex gap-2 text-xs">
            <button
              onClick={() => setEditing(true)}
              className="rounded-full bg-ru-blue-soft px-3 py-1.5 font-bold text-ru-blue"
            >
              עריכה
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="rounded-full bg-ru-pink-soft px-3 py-1.5 font-bold text-ru-pink"
            >
              מחיקה
            </button>
          </div>
        )}
        {error && <p className="mt-1 text-xs font-semibold text-ru-pink">{error}</p>}
      </div>
      <span className={`shrink-0 text-xl font-bold ${isIncome ? "text-ru-green" : "text-ru-pink"}`}>
        {isIncome ? "+" : "-"}
        {formatShekel(entry.amount)}
      </span>
    </div>
  );
}
