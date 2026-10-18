"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMaaserRate, recordTithePayment } from "../actions";
import RiseCard, { formatShekel } from "../RiseCard";
import type { MaaserSummary } from "@/lib/maaser";

const CARD = "rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]";
const INPUT = "rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base";

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

  const paidPercent = summary.required > 0 ? (summary.paid / summary.required) * 100 : 0;
  const settled = summary.remaining <= 0;

  return (
    <div className="mt-5 space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-white p-1.5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]">
        {([10, 20] as const).map((rate) => (
          <button
            key={rate}
            onClick={() => handleRateChange(rate)}
            disabled={isPending}
            className={`rounded-full px-3 py-2.5 text-base font-bold ${
              summary.ratePercent === rate ? "bg-ru-blue text-white" : "text-ru-ink/60"
            }`}
          >
            {rate === 10 ? "מעשר (10%)" : "חומש (20%)"}
          </button>
        ))}
      </div>

      <RiseCard
        size="lg"
        title="מעשרות החודש"
        actualLabel="שולם"
        actual={summary.paid}
        expectedLabel={`חובה (${summary.ratePercent}%)`}
        expected={formatShekel(summary.required)}
        percent={paidPercent}
        tone={settled ? "green" : "blue"}
        footer={
          <>
            <span className={settled ? "font-semibold text-ru-green" : "font-semibold text-ru-ink"}>
              {settled ? "שולם במלואו ✓" : `נותרו ${formatShekel(summary.remaining)}`}
            </span>
            {` · הכנסה חייבת ${formatShekel(summary.taxableIncome)}`}
          </>
        }
      />

      <div
        className={`rounded-3xl px-5 py-4 text-center text-sm font-semibold ${
          summary.priorDebt > 0 ? "bg-ru-pink-soft text-ru-pink" : "bg-ru-green-soft text-ru-green"
        }`}
      >
        {summary.priorDebt > 0
          ? `חוב מעשר מחודשים קודמים: ${formatShekel(summary.priorDebt)}`
          : "אין חוב פתוח מחודשים קודמים ✓"}
      </div>

      <form onSubmit={handlePayment} className={CARD}>
        <h2 className="mb-4 text-lg font-bold">רישום תשלום מעשר</h2>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="למי (לא חובה)"
            className={INPUT}
          />
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="סכום"
            className={`${INPUT} w-28`}
          />
        </div>
        {error && <p className="mt-2 text-sm font-semibold text-ru-pink">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="mt-3 w-full rounded-full bg-ru-blue px-4 py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(91,123,255,0.35)] disabled:opacity-50"
        >
          {isPending ? "שומר..." : "רשום תשלום"}
        </button>
      </form>
    </div>
  );
}
