"use client";

import { useState } from "react";
import ExpenseTools from "../ExpenseTools";
import IncomeTools from "../IncomeTools";

type ExpenseCategory = {
  id: string;
  name: string;
  type: "fixed" | "variable";
  remaining: number;
};

export default function AddTabs({
  expenseCategories,
  incomeCategories,
  defaultDate,
}: {
  expenseCategories: ExpenseCategory[];
  incomeCategories: { id: string; name: string }[];
  defaultDate: string;
}) {
  const [tab, setTab] = useState<"expense" | "income">("expense");

  return (
    <div>
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-white p-1.5 text-base shadow-[0_2px_14px_rgba(46,46,46,0.07)]">
        <button
          type="button"
          onClick={() => setTab("expense")}
          className={`rounded-full px-3 py-2.5 font-bold ${
            tab === "expense" ? "bg-ru-pink text-white" : "text-ru-ink/60"
          }`}
        >
          הוצאה
        </button>
        <button
          type="button"
          onClick={() => setTab("income")}
          className={`rounded-full px-3 py-2.5 font-bold ${
            tab === "income" ? "bg-ru-green text-white" : "text-ru-ink/60"
          }`}
        >
          הכנסה
        </button>
      </div>

      {tab === "expense" ? (
        <ExpenseTools categories={expenseCategories} defaultDate={defaultDate} />
      ) : (
        <IncomeTools categories={incomeCategories} defaultDate={defaultDate} />
      )}
    </div>
  );
}
