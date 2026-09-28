"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMaaserRate, recordTithePayment } from "../actions";
import type { MaaserSummary } from "@/lib/maaser";

export default function MaaserTools({ summary }: { summary: MaaserSummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleRateChange(rate: 10 | 20) {
    startTransition(async () => {
      await setMaaserRate(rate);
      router.refresh();
    });
  }

  function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await recordTithePayment({ amount: Number(amount), note });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setAmount("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-brand-teal/10 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-gray-700">סוג הפרשה</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleRateChange(10)}
            disabled={isPending}
            className={`rounded-lg border py-2 text-sm font-medium ${
              summary.ratePercent === 10 ? "border-brand-teal bg-brand-teal text-white" : "border-gray-300 text-gray-600"
            }`}
          >
            מעשר (10%)
          </button>
          <button
            onClick={() => handleRateChange(20)}
            disabled={isPending}
            className={`rounded-lg border py-2 text-sm font-medium ${
              summary.ratePercent === 20 ? "border-brand-teal bg-brand-teal text-white" : "border-gray-300 text-gray-600"
            }`}
          >
            חומש (20%)
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-terracotta/40 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-xs text-gray-500">הכנסה חייבת</p>
            <p className="mt-1 font-semibold text-gray-900">{summary.taxableIncome.toFixed(0)} ₪</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">חובה ({summary.ratePercent}%)</p>
            <p className="mt-1 font-semibold text-gray-900">{summary.required.toFixed(0)} ₪</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">שולם החודש</p>
            <p className="mt-1 font-semibold text-emerald-600">{summary.paid.toFixed(0)} ₪</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">נותר</p>
            <p className={`mt-1 font-semibold ${summary.remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {summary.remaining > 0 ? `${summary.remaining.toFixed(0)} ₪` : "שולם במלואו ✓"}
            </p>
          </div>
        </div>

        {summary.priorDebt > 0 ? (
          <p className="mt-3 rounded-lg bg-red-50 p-2 text-center text-xs text-red-700">
            חוב מעשר מחודשים קודמים: {summary.priorDebt.toFixed(0)} ₪
          </p>
        ) : (
          <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-center text-xs text-emerald-700">
            אין חוב פתוח מחודשים קודמים ✓
          </p>
        )}
      </div>

      <form onSubmit={handlePayment} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">רישום תשלום מעשר</h2>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="למי (לא חובה)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="סכום"
            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="mt-3 w-full rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white hover:bg-brand-teal-dark disabled:opacity-50"
        >
          {isPending ? "שומר..." : "רשום תשלום"}
        </button>
      </form>
    </div>
  );
}
