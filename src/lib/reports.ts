import { prisma } from "@/lib/prisma";

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export type MonthPoint = {
  key: string; // YYYY-MM
  label: string; // MM/YY
  income: number;
  expense: number;
  net: number;
};

export async function getFamilyMonthlyTrend(familyId: string, monthsBack = 6): Promise<MonthPoint[]> {
  const now = new Date();
  const points: MonthPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const { start, end } = monthRange(d);

    const [expenseAgg, incomeAgg] = await Promise.all([
      prisma.expense.aggregate({
        where: { familyId, occurredAt: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      prisma.income.aggregate({
        where: { familyId, occurredAt: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
    ]);

    const income = Number(incomeAgg._sum.amount ?? 0);
    const expense = Number(expenseAgg._sum.amount ?? 0);

    points.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`,
      income,
      expense,
      net: income - expense,
    });
  }

  return points;
}

export type CategoryShare = { name: string; amount: number };

export async function getFamilyCategoryBreakdown(
  familyId: string,
  month: Date = new Date()
): Promise<{ expenses: CategoryShare[]; incomes: CategoryShare[] }> {
  const { start, end } = monthRange(month);

  const [expenses, incomes] = await Promise.all([
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { familyId, occurredAt: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
    prisma.income.groupBy({
      by: ["categoryId"],
      where: { familyId, occurredAt: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ]);

  const [expenseCats, incomeCats] = await Promise.all([
    prisma.budgetCategory.findMany({ where: { familyId } }),
    prisma.incomeCategory.findMany({ where: { familyId } }),
  ]);
  const expenseNameById = new Map(expenseCats.map((c) => [c.id, c.name]));
  const incomeNameById = new Map(incomeCats.map((c) => [c.id, c.name]));

  return {
    expenses: expenses
      .map((e) => ({ name: expenseNameById.get(e.categoryId) ?? "לא ידוע", amount: Number(e._sum.amount ?? 0) }))
      .filter((e) => e.amount > 0)
      .sort((a, b) => b.amount - a.amount),
    incomes: incomes
      .map((i) => ({ name: incomeNameById.get(i.categoryId) ?? "לא ידוע", amount: Number(i._sum.amount ?? 0) }))
      .filter((i) => i.amount > 0)
      .sort((a, b) => b.amount - a.amount),
  };
}
