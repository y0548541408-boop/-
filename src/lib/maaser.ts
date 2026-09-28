import { prisma } from "@/lib/prisma";

const TITHE_CATEGORY_NAME = "מעשרות";

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export type MaaserSummary = {
  ratePercent: number;
  taxableIncome: number;
  required: number;
  paid: number;
  remaining: number;
  priorDebt: number;
};

export async function getFamilyMaaserSummary(familyId: string, month: Date = new Date()): Promise<MaaserSummary> {
  const family = await prisma.family.findUnique({ where: { id: familyId }, select: { maaserRatePercent: true } });
  const ratePercent = family?.maaserRatePercent ?? 10;
  const rate = ratePercent / 100;

  const titheCategory = await prisma.budgetCategory.findFirst({
    where: { familyId, name: TITHE_CATEGORY_NAME },
  });

  const { start, end } = monthRange(month);

  const incomeAgg = await prisma.income.aggregate({
    where: { familyId, occurredAt: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  const taxableIncome = Number(incomeAgg._sum.amount ?? 0);
  const required = taxableIncome * rate;

  let paid = 0;
  if (titheCategory) {
    const paidAgg = await prisma.expense.aggregate({
      where: { familyId, categoryId: titheCategory.id, occurredAt: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    paid = Number(paidAgg._sum.amount ?? 0);
  }
  const remaining = Math.max(required - paid, 0);

  // Debt carried from all earlier months with income on record.
  const firstIncome = await prisma.income.findFirst({
    where: { familyId },
    orderBy: { occurredAt: "asc" },
    select: { occurredAt: true },
  });

  let priorDebt = 0;
  if (firstIncome && firstIncome.occurredAt < start) {
    const [allIncomes, allPaid] = await Promise.all([
      prisma.income.findMany({
        where: { familyId, occurredAt: { lt: start } },
        select: { occurredAt: true, amount: true },
      }),
      titheCategory
        ? prisma.expense.findMany({
            where: { familyId, categoryId: titheCategory.id, occurredAt: { lt: start } },
            select: { occurredAt: true, amount: true },
          })
        : Promise.resolve([] as { occurredAt: Date; amount: unknown }[]),
    ]);

    const byMonth = new Map<string, { income: number; paid: number }>();
    for (const r of allIncomes) {
      const key = `${r.occurredAt.getFullYear()}-${r.occurredAt.getMonth()}`;
      const cur = byMonth.get(key) ?? { income: 0, paid: 0 };
      cur.income += Number(r.amount);
      byMonth.set(key, cur);
    }
    for (const r of allPaid) {
      const key = `${r.occurredAt.getFullYear()}-${r.occurredAt.getMonth()}`;
      const cur = byMonth.get(key) ?? { income: 0, paid: 0 };
      cur.paid += Number(r.amount);
      byMonth.set(key, cur);
    }
    for (const { income, paid: p } of byMonth.values()) {
      priorDebt += Math.max(income * rate - p, 0);
    }
  }

  return { ratePercent, taxableIncome, required, paid, remaining, priorDebt };
}

export { TITHE_CATEGORY_NAME };
