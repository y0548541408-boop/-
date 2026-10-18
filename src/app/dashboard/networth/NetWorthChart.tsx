"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function NetWorthChart({ data }: { data: { label: string; net: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b7bff" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#5b7bff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0ebdd" vertical={false} />
        <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} width={60} />
        <Tooltip formatter={(v) => `₪${Number(v).toLocaleString("he-IL")}`} />
        <Area type="monotone" dataKey="net" name="שווי נקי" stroke="#5b7bff" strokeWidth={3} fill="url(#netFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
