import { prisma } from "@/lib/prisma";

// Mirrors the category sheet of Israel's own Excel budget tracker, so every
// new client starts with his template instead of an empty screen.
const EXPENSE_DEFAULTS: { name: string; type: "fixed" | "variable" }[] = [
  { name: "הוצאות קבועות", type: "fixed" },
  { name: "מעשרות", type: "fixed" },
  { name: "החזרי חובות", type: "fixed" },
  { name: "חיסכון לשנתי", type: "fixed" },
  { name: "אוכל", type: "variable" },
  { name: "אוכל בחוץ", type: "variable" },
  { name: "ביגוד והנעלה", type: "variable" },
  { name: "דלק רכב קו", type: "variable" },
  { name: "פנאי", type: "variable" },
  { name: "רכישות קטנות", type: "variable" },
  { name: "שונות (הוצאות)", type: "variable" },
];

const INCOME_DEFAULTS = [
  "משכורת בעל",
  "משכורת אשה",
  "כולל",
  "קצבת ילדים",
  "הורים",
  "שונות (הכנסות)",
];

export async function ensureDefaultCategories(familyId: string): Promise<void> {
  await prisma.budgetCategory.createMany({
    data: EXPENSE_DEFAULTS.map((c) => ({ familyId, ...c, plannedAmount: 0 })),
    skipDuplicates: true,
  });
  await prisma.incomeCategory.createMany({
    data: INCOME_DEFAULTS.map((name) => ({ familyId, name, plannedAmount: 0 })),
    skipDuplicates: true,
  });
}

export async function familyHasNoCategories(familyId: string): Promise<boolean> {
  const [expenseCount, incomeCount] = await Promise.all([
    prisma.budgetCategory.count({ where: { familyId } }),
    prisma.incomeCategory.count({ where: { familyId } }),
  ]);
  return expenseCount === 0 && incomeCount === 0;
}
