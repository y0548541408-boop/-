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
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-brand-teal/10 bg-white p-1 text-sm shadow-sm">
        <button
          type="button"
          onClick={() => setTab("expense")}
          className={`rounded-lg px-3 py-2 font-medium ${
            tab === "expense" ? "bg-red-500 text-white" : "text-gray-600"
          }`}
        >
          הוצאה
        </button>
        <button
          type="button"
          onClick={() => setTab("income")}
          className={`rounded-lg px-3 py-2 font-medium ${
            tab === "income" ? "bg-emerald-600 text-white" : "text-gray-600"
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
