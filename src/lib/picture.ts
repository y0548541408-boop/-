import { prisma } from "@/lib/prisma";
import {
  PICTURE_TEMPLATE,
  DEDUCTION_GROUPS,
  G,
  YEAR_CYCLE_MONTHS,
  expenseCategoryName,
  incomeCategoryName,
  type PicturePeriod,
  type PictureKind,
} from "@/lib/pictureTemplate";

export type PictureLineView = {
  id: string;
  period: PicturePeriod;
  kind: PictureKind;
  groupName: string;
  subGroup: string;
  name: string;
  amount: number;
  targetAmount: number | null;
  priority: number | null;
  notes: string | null;
  whenText: string | null;
};

// Every family starts from the workbook's lines. Safe to call on every visit:
// a unique index on the line makes a second call add nothing.
export async function ensurePictureLines(familyId: string): Promise<void> {
  const count = await prisma.pictureLine.count({ where: { familyId } });
  if (count > 0) return;
  await prisma.pictureLine.createMany({
    data: PICTURE_TEMPLATE.map((l, i) => ({ familyId, ...l, sortOrder: i })),
    skipDuplicates: true,
  });
}

type Totals = { now: number; target: number };

export type PictureGroup = {
  groupName: string;
  subGroup: string;
  lines: PictureLineView[];
  total: Totals;
  isDeduction: boolean;
};

export type PictureSummary = {
  monthlyIncome: Totals; // monthly picture only
  monthlyExpenseNoDebt: Totals;
  monthlyDebts: Totals;
  annualIncome: Totals; // after taking off the months with less work
  annualExpense: Totals;
  // Everything per month: the annual picture divided by 12.
  incomePerMonth: Totals;
  expensePerMonth: Totals; // without debt repayments
  diffPerMonth: Totals;
  diffAfterDebts: Totals;
  // The year as a whole.
  yearBalance: Totals;
  householdSize: number | null;
  perPersonIncome: number | null;
  perPersonExpense: number | null;
};

export type Picture = {
  groups: { monthlyIncome: PictureGroup[]; monthlyExpense: PictureGroup[]; annualIncome: PictureGroup[]; annualFixed: PictureGroup[]; annualCurrent: PictureGroup[]; yearCycle: PictureGroup[] };
  summary: PictureSummary;
  hasData: boolean;
  // For the plan: what each budget category gets, per month.
  categoryExpense: Map<string, Totals>;
  categoryIncome: Map<string, Totals>;
};

const toNum = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const sum = (ls: PictureLineView[], pick: (l: PictureLineView) => number) => ls.reduce((s, l) => s + pick(l), 0);
const nowOf = (l: PictureLineView) => l.amount;
// The goal counts only where we set one; everywhere else the line stays as it is.
const targetOf = (l: PictureLineView) => (l.targetAmount ?? l.amount);

function totalsOf(ls: PictureLineView[]): Totals {
  return { now: sum(ls, nowOf), target: sum(ls, targetOf) };
}

const add = (a: Totals, b: Totals): Totals => ({ now: a.now + b.now, target: a.target + b.target });
const sub = (a: Totals, b: Totals): Totals => ({ now: a.now - b.now, target: a.target - b.target });
const scale = (a: Totals, f: number): Totals => ({ now: a.now * f, target: a.target * f });
const ZERO: Totals = { now: 0, target: 0 };

function groupLines(ls: PictureLineView[], order: string[]): PictureGroup[] {
  const names = [...new Set([...order, ...ls.map((l) => l.groupName)])];
  return names
    .map((groupName) => {
      const lines = ls.filter((l) => l.groupName === groupName);
      return { groupName, subGroup: "", lines, total: totalsOf(lines), isDeduction: DEDUCTION_GROUPS.includes(groupName) };
    })
    .filter((g) => g.lines.length > 0 || order.includes(g.groupName));
}

export async function getPicture(familyId: string): Promise<Picture> {
  const [rows, family] = await Promise.all([
    prisma.pictureLine.findMany({ where: { familyId }, orderBy: { sortOrder: "asc" } }),
    prisma.family.findUnique({ where: { id: familyId }, select: { householdSize: true } }),
  ]);

  const all: PictureLineView[] = rows.map((r) => ({
    id: r.id,
    period: r.period,
    kind: r.kind,
    groupName: r.groupName,
    subGroup: r.subGroup,
    name: r.name,
    amount: toNum(r.amount),
    targetAmount: r.targetAmount === null ? null : toNum(r.targetAmount),
    priority: r.priority,
    notes: r.notes,
    whenText: r.whenText,
  }));

  const pick = (period: PicturePeriod, kind: PictureKind) => all.filter((l) => l.period === period && l.kind === kind);
  const mIncome = pick("monthly", "income");
  const mExpense = pick("monthly", "expense");
  const aIncome = pick("annual", "income");
  const aExpense = pick("annual", "expense");

  const mExpenseNoDebt = mExpense.filter((l) => l.groupName !== G.debts);
  const mDebts = mExpense.filter((l) => l.groupName === G.debts);

  const aIncomeUp = aIncome.filter((l) => !DEDUCTION_GROUPS.includes(l.groupName));
  const aIncomeDown = aIncome.filter((l) => DEDUCTION_GROUPS.includes(l.groupName));
  const annualIncome = sub(totalsOf(aIncomeUp), totalsOf(aIncomeDown));
  const annualExpense = totalsOf(aExpense);

  const incomePerMonth = add(totalsOf(mIncome), scale(annualIncome, 1 / 12));
  const expensePerMonth = add(totalsOf(mExpenseNoDebt), scale(annualExpense, 1 / 12));
  const diffPerMonth = sub(incomePerMonth, expensePerMonth);
  const diffAfterDebts = sub(diffPerMonth, totalsOf(mDebts));
  const householdSize = family?.householdSize ?? null;

  // Per budget category, per month (the annual picture counts one twelfth).
  const categoryExpense = new Map<string, Totals>();
  for (const l of [...mExpense, ...aExpense]) {
    const f = l.period === "annual" ? 1 / 12 : 1;
    const key = expenseCategoryName(l);
    categoryExpense.set(key, add(categoryExpense.get(key) ?? ZERO, scale({ now: nowOf(l), target: targetOf(l) }, f)));
  }
  const categoryIncome = new Map<string, Totals>();
  for (const l of [...mIncome, ...aIncome]) {
    const f = (l.period === "annual" ? 1 / 12 : 1) * (DEDUCTION_GROUPS.includes(l.groupName) ? -1 : 1);
    const key = incomeCategoryName(l);
    categoryIncome.set(key, add(categoryIncome.get(key) ?? ZERO, scale({ now: nowOf(l), target: targetOf(l) }, f)));
  }

  const cycle = aExpense.filter((l) => l.groupName === G.yearCycle);
  const yearCycle: PictureGroup[] = [
    ...new Set([...YEAR_CYCLE_MONTHS, ...cycle.map((l) => l.subGroup)]),
  ].map((month) => {
    const lines = cycle.filter((l) => l.subGroup === month);
    return { groupName: G.yearCycle, subGroup: month, lines, total: totalsOf(lines), isDeduction: false };
  });

  return {
    groups: {
      monthlyIncome: groupLines(mIncome, [G.husband, G.wife, G.benefits, G.otherIncome]),
      monthlyExpense: groupLines(mExpense, [G.fixed, G.variable, G.current, G.tithes, G.debts]),
      annualIncome: groupLines(aIncome, [G.husband, G.wife, G.taxRefunds, G.otherIncome, G.irregular, G.productivityLoss]),
      annualFixed: groupLines(aExpense.filter((l) => l.groupName === G.annualFixed), [G.annualFixed]),
      annualCurrent: groupLines(aExpense.filter((l) => l.groupName === G.annualCurrent), [G.annualCurrent]),
      yearCycle,
    },
    summary: {
      monthlyIncome: totalsOf(mIncome),
      monthlyExpenseNoDebt: totalsOf(mExpenseNoDebt),
      monthlyDebts: totalsOf(mDebts),
      annualIncome,
      annualExpense,
      incomePerMonth,
      expensePerMonth,
      diffPerMonth,
      diffAfterDebts,
      // Same as the workbook: the monthly balance times 12, plus the annual balance.
      yearBalance: scale(diffAfterDebts, 12),
      householdSize,
      perPersonIncome: householdSize ? incomePerMonth.now / householdSize : null,
      perPersonExpense: householdSize ? expensePerMonth.now / householdSize : null,
    },
    hasData: all.some((l) => l.amount !== 0 || l.targetAmount !== null),
    categoryExpense,
    categoryIncome,
  };
}
