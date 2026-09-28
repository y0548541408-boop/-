import { prisma } from "@/lib/prisma";

export type TransactionEntry = {
  id: string;
  kind: "expense" | "income";
  amount: number;
  note: string | null;
  occurredAt: Date;
  categoryId: string;
  categoryName: string;
};

export async function getFamilyTransactionLog(
  familyId: string,
  opts: { from?: Date; to?: Date; limit?: number } = {}
): Promise<TransactionEntry[]> {
  const dateFilter =
    opts.from || opts.to
      ? { occurredAt: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lt: opts.to } : {}) } }
      : {};

  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: { familyId, ...dateFilter },
      include: { category: true },
      orderBy: { occurredAt: "desc" },
      take: opts.limit,
    }),
    prisma.income.findMany({
      where: { familyId, ...dateFilter },
      include: { category: true },
      orderBy: { occurredAt: "desc" },
      take: opts.limit,
    }),
  ]);

  const entries: TransactionEntry[] = [
    ...expenses.map((e) => ({
      id: e.id,
      kind: "expense" as const,
      amount: Number(e.amount),
      note: e.note,
      occurredAt: e.occurredAt,
      categoryId: e.categoryId,
      categoryName: e.category.name,
    })),
    ...incomes.map((i) => ({
      id: i.id,
      kind: "income" as const,
      amount: Number(i.amount),
      note: i.note,
      occurredAt: i.occurredAt,
      categoryId: i.categoryId,
      categoryName: i.category.name,
    })),
  ];

  entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return opts.limit ? entries.slice(0, opts.limit) : entries;
}
