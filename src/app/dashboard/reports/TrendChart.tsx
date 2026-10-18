"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import type { MonthPoint } from "@/lib/reports";

export default function TrendChart({ data }: { data: MonthPoint[] }) {
  const chartData = data.map((d) => ({
    name: d.label,
    הכנסות: Math.round(d.income),
    הוצאות: Math.round(d.expense),
    נטו: Math.round(d.net),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0ebdd" />
        <XAxis dataKey="name" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="הכנסות" stroke="#00bf6f" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="הוצאות" stroke="#ec4f8a" strokeWidth={3} dot={false} />
        <Line type="monotone" dataKey="נטו" stroke="#5b7bff" strokeWidth={3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
