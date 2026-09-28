import { prisma } from "@/lib/prisma";

export type AnnualCategoryRow = {
  id: string;
  name: string;
  planned: number;
  actualByMonth: number[]; // length 12, index 0 = January
  yearActual: number;
};

export type AnnualBudgetTable = {
  year: number;
  incomeRows: AnnualCategoryRow[];
  expenseRows: AnnualCategoryRow[];
  incomeTotalByMonth: number[];
  expenseTotalByMonth: number[];
  netByMonth: number[];
};

export async function getFamilyAnnualBudget(familyId: string, year: number): Promise<AnnualBudgetTable> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const [expenseCategories, incomeCategories, expenses, incomes] = await Promise.all([
    prisma.budgetCategory.findMany({ where: { familyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.incomeCategory.findMany({ where: { familyId, isActive: true }, orderBy: { name: "asc" } }),
    prisma.expense.findMany({
      where: { familyId, occurredAt: { gte: yearStart, lt: yearEnd } },
      select: { categoryId: true, amount: true, occurredAt: true },
    }),
    prisma.income.findMany({
      where: { familyId, occurredAt: { gte: yearStart, lt: yearEnd } },
      select: { categoryId: true, amount: true, occurredAt: true },
    }),
  ]);

  function buildRows(
    categories: { id: string; name: string; plannedAmount: unknown }[],
    entries: { categoryId: string; amount: unknown; occurredAt: Date }[]
  ): AnnualCategoryRow[] {
    return categories.map((cat) => {
      const actualByMonth = new Array(12).fill(0);
      for (const e of entries) {
        if (e.categoryId === cat.id) {
          actualByMonth[e.occurredAt.getMonth()] += Number(e.amount);
        }
      }
      return {
        id: cat.id,
        name: cat.name,
        planned: Number(cat.plannedAmount),
        actualByMonth,
        yearActual: actualByMonth.reduce((s, v) => s + v, 0),
      };
    });
  }

  const incomeRows = buildRows(incomeCategories, incomes);
  const expenseRows = buildRows(expenseCategories, expenses);

  const incomeTotalByMonth = new Array(12).fill(0);
  const expenseTotalByMonth = new Array(12).fill(0);
  for (const row of incomeRows) row.actualByMonth.forEach((v, i) => (incomeTotalByMonth[i] += v));
  for (const row of expenseRows) row.actualByMonth.forEach((v, i) => (expenseTotalByMonth[i] += v));

  const netByMonth = incomeTotalByMonth.map((v, i) => v - expenseTotalByMonth[i]);

  return { year, incomeRows, expenseRows, incomeTotalByMonth, expenseTotalByMonth, netByMonth };
}
