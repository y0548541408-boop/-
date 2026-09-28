import { prisma } from "@/lib/prisma";

export type IncomeCategorySummary = {
  id: string;
  name: string;
  plannedAmount: number;
  received: number;
  remaining: number;
};

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export async function getFamilyIncomeSummary(
  familyId: string,
  month: Date = new Date()
): Promise<IncomeCategorySummary[]> {
  const { start, end } = monthRange(month);

  const [categories, incomes] = await Promise.all([
    prisma.incomeCategory.findMany({
      where: { familyId, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.income.findMany({
      where: { familyId, occurredAt: { gte: start, lt: end } },
      select: { categoryId: true, amount: true },
    }),
  ]);

  const receivedByCategory = new Map<string, number>();
  for (const income of incomes) {
    const current = receivedByCategory.get(income.categoryId) ?? 0;
    receivedByCategory.set(income.categoryId, current + Number(income.amount));
  }

  return categories.map((category) => {
    const plannedAmount = Number(category.plannedAmount);
    const received = receivedByCategory.get(category.id) ?? 0;
    return {
      id: category.id,
      name: category.name,
      plannedAmount,
      received,
      remaining: plannedAmount - received,
    };
  });
}

export async function getFamilyMonthlyNet(
  familyId: string,
  totalExpenses: number,
  month: Date = new Date()
): Promise<{ totalIncome: number; totalExpenses: number; net: number }> {
  const income = await getFamilyIncomeSummary(familyId, month);
  const totalIncome = income.reduce((sum, c) => sum + c.received, 0);
  return { totalIncome, totalExpenses, net: totalIncome - totalExpenses };
}
