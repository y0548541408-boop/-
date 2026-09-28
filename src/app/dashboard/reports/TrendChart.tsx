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
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="name" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="הכנסות" stroke="#059669" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="הוצאות" stroke="#dc2626" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="נטו" stroke="#1e2a45" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
