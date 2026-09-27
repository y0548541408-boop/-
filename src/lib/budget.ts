import { prisma } from "@/lib/prisma";

export type CategorySummary = {
  id: string;
  name: string;
  type: "fixed" | "variable";
  plannedAmount: number;
  effectivePlanned: number;
  spent: number;
  remaining: number;
  percentUsed: number;
};

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export async function getFamilyBudgetSummary(
  familyId: string,
  month: Date = new Date()
): Promise<CategorySummary[]> {
  const { start, end } = monthRange(month);

  const [categories, expenses, reallocations] = await Promise.all([
    prisma.budgetCategory.findMany({
      where: { familyId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.expense.findMany({
      where: { familyId, occurredAt: { gte: start, lt: end } },
      select: { categoryId: true, amount: true },
    }),
    prisma.budgetReallocation.findMany({
      where: { familyId, createdAt: { gte: start, lt: end } },
      select: { fromCategoryId: true, toCategoryId: true, amount: true },
    }),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const expense of expenses) {
    const current = spentByCategory.get(expense.categoryId) ?? 0;
    spentByCategory.set(expense.categoryId, current + Number(expense.amount));
  }

  const reallocationDelta = new Map<string, number>();
  for (const r of reallocations) {
    const amount = Number(r.amount);
    reallocationDelta.set(
      r.fromCategoryId,
      (reallocationDelta.get(r.fromCategoryId) ?? 0) - amount
    );
    reallocationDelta.set(
      r.toCategoryId,
      (reallocationDelta.get(r.toCategoryId) ?? 0) + amount
    );
  }

  return categories.map((category) => {
    const plannedAmount = Number(category.plannedAmount);
    const effectivePlanned =
      plannedAmount + (reallocationDelta.get(category.id) ?? 0);
    const spent = spentByCategory.get(category.id) ?? 0;
    const remaining = effectivePlanned - spent;
    const percentUsed =
      effectivePlanned > 0 ? (spent / effectivePlanned) * 100 : spent > 0 ? 100 : 0;

    return {
      id: category.id,
      name: category.name,
      type: category.type,
      plannedAmount,
      effectivePlanned,
      spent,
      remaining,
      percentUsed,
    };
  });
}
