"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissInsight, generateInsights, type InsightResult } from "./insightActions";

export type InsightView = {
  id: string;
  severity: "alert" | "check" | "info";
  title: string;
  detail: string;
  createdAt: string; // YYYY-MM-DD
};

const SEVERITY: Record<InsightView["severity"], { label: string; cls: string }> = {
  alert: { label: "לטפל", cls: "bg-red-50 text-red-700" },
  check: { label: "לבדוק", cls: "bg-amber-50 text-amber-800" },
  info: { label: "לידיעה", cls: "bg-brand-teal/10 text-brand-teal" },
};

export default function InsightsSection({
  familyId,
  insights,
}: {
  familyId: string;
  insights: InsightView[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<InsightResult>, done: (r: Extract<InsightResult, { ok: true }>) => string) {
    setMessage(null);
    startTransition(async () => {
      const res = await action();
      setMessage("error" in res ? res.error : done(res));
      router.refresh();
    });
  }

  return (
    <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-brand-teal">תובנות AI מהמסמכים</h2>
          <p className="mt-0.5 text-xs text-gray-500">רק היועץ רואה את זה. דברים לוודא לפני הפגישה.</p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            run(
              () => generateInsights({ familyId }),
              (r) =>
                `נמצאו ${r.count} תובנות${r.skipped > 0 ? `. ${r.skipped} מסמכים לא נותחו (סיסמה או סוג קובץ לא נתמך).` : "."}`
            )
          }
          className="rounded-lg bg-brand-teal px-3 py-2 text-xs font-medium text-white hover:bg-brand-teal-dark disabled:opacity-50"
        >
          {isPending ? "מנתח את המסמכים..." : "ניתוח מחדש"}
        </button>
      </div>

      {message && <p className="mt-2 text-xs font-medium text-gray-700">{message}</p>}

      {insights.length === 0 ? (
        <p className="mt-3 text-xs text-gray-500">אין תובנות כרגע. לחץ על "ניתוח מחדש" אחרי שהלקוח העלה מסמכים.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {insights.map((i) => (
            <li key={i.id} className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY[i.severity].cls}`}>
                    {SEVERITY[i.severity].label}
                  </span>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{i.title}</div>
                  <div className="mt-0.5 text-xs text-gray-600">{i.detail}</div>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    run(
                      () => dismissInsight({ familyId, id: i.id }),
                      () => "סומן כטופל."
                    )
                  }
                  className="shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:border-brand-teal/30 disabled:opacity-50"
                >
                  טופל
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
