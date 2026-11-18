import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { merchantKey, type ParsedRow } from "@/lib/mappingParse";

// ---------------------------------------------------------------------------
// Automatic guesses. A guess is a set of words in the merchant name, and a
// test on the family's own category names (every family can rename them).
// ---------------------------------------------------------------------------

type Guess = { words: string[]; category: (name: string) => boolean };

const EXPENSE_GUESSES: Guess[] = [
  {
    words: ["סופר-פארם", "סופר פארם", "superpharm", "be ", "מכבי", "כללית", "מאוחדת", "לאומית", "מרקחת", "אופטי", "רופא", "מרפאה", "שיניים"],
    category: (n) => n.includes("בריאות"),
  },
  {
    words: ["שופרסל", "רמי לוי", "יוחננוף", "ויקטורי", "טיב טעם", "אושר עד", "חצי חינם", "יינות ביתן", "קרפור", "מגה בעיר", "סופר", "מכולת", "מינימרקט", "פירות", "ירקות", "מאפי", "קצביה", "אטליז", "שוק", "פרש מרקט", "נתיב החסד", "קשת טעמים", "zol", "זול"],
    category: (n) => n === "אוכל" || n.startsWith("אוכל ") && !n.includes("בחוץ") || n.includes("מזון") || n.includes("סופר"),
  },
  {
    words: ["מסעד", "פיצה", "פיצרי", "קפה", "בורגר", "מקדונלד", "ארומה", "גרג", "שווארמה", "פלאפל", "וולט", "wolt", "תן ביס", "סושי", "גלידה", "רולדין", "בורקס"],
    category: (n) => n.includes("בחוץ") || n.includes("מסעד"),
  },
  {
    words: ["פז ", "פז-", "סונול", "דלק", "דור אלון", "אלון", "טן ", "yellow", "רב קו", "רב-קו", "רבקו", "מוביט", "gett", "חניון", "פנגו", "סלופארק", "כביש 6", "נתיבי", "אגד", "דן ", "רכבת ישראל", "מוסך", "צמיגים", "טסט", "רישוי"],
    category: (n) => n.includes("דלק") || n.includes("רב קו") || n.includes("רכב") || n.includes("תחבורה"),
  },
  {
    words: ["חשמל", "ארנונה", "עירי", "מועצה", "תאגיד", "מי ", "מים", "בזק", "פרטנר", "סלקום", "הוט", "hot", "yes", "גולן", "012", "019", "רמי לוי תקשורת", "ביטוח", "הראל", "מגדל", "כלל ", "הפניקס", "מנורה", "הכשרה", "ליברה", "ישיר", "איילון", "שכירות", "שכר דירה", "גז", "אמישראגז", "סופרגז", "פזגז", "ועד בית", "מעון", "צהרון", "גן ", "נטפליקס", "netflix", "spotify", "ספוטיפיי", "google", "apple.com", "icloud"],
    category: (n) => n.includes("קבוע") || n.includes("חשבונות") || n.includes("דיור"),
  },
  {
    words: ["קסטרו", "פוקס", "h&m", "זארה", "zara", "רנואר", "גולף", "טרמינל", "נעל", "shoes", "אמריקן איגל", "טוונטי פור סבן", "מנגו", "הודיס", "גלי ", "נעלי", "ביגוד", "אופנה", "next"],
    category: (n) => n.includes("ביגוד") || n.includes("בגדים"),
  },
  {
    words: ["סינמה", "planet", "קולנוע", "לונה", "ספארי", "בריכה", "מוזיאון", "פארק", "צימר", "מלון", "booking", "airbnb", "טיול"],
    category: (n) => n.includes("פנאי") || n.includes("בילוי"),
  },
  {
    words: ["איקאה", "ikea", "ace", "הום סנטר", "אלי אקספרס", "aliexpress", "amazon", "אמזון", "שיין", "shein", "ksp", "באג", "מקס סטוק", "max stock", "טמבור", "כלבו", "ניצת הדובדבן", "סטימצקי", "צומת ספרים"],
    category: (n) => n.includes("רכישות") || n.includes("קניות"),
  },
  {
    words: ["צדקה", "מעשר", "גמ\"ח", "גמח", "ישיבת", "ישיבה", "כולל ", "קופת העיר", "קופת רבי מאיר", "תרומ", "עזר מציון", "ידידים"],
    category: (n) => n.includes("מעשר") || n.includes("צדקה"),
  },
  {
    words: ["החזר הלוואה", "הלוואה", "הלואה"],
    category: (n) => n.includes("חוב") || n.includes("הלווא"),
  },
];

const INCOME_GUESSES: Guess[] = [
  { words: ["משכורת", "שכר", "salary", "מש\"ת"], category: (n) => n.includes("משכורת") || n.includes("שכר") },
  { words: ["ביטוח לאומי", "בטוח לאומי", "קצבת", "קיצבת", "קצבה"], category: (n) => n.includes("קצב") || n.includes("לאומי") },
  { words: ["כולל"], category: (n) => n.includes("כולל") },
];

// Card charges inside the checking account. The card statement already
// lists each purchase, so counting the monthly charge too would double it.
const CARD_CHARGE_WORDS = ["ישראכרט", "כאל", "כ.א.ל", "ויזה", "visa", "מקס איט", "max it", "לאומי קארד", "לאומי לקארד", "אמריקן אקספרס", "אמריקן אקס", "דיינרס", "כרטיס אשראי", "כרטיסי אשראי", "מסטרקרד", "mastercard", "חיוב כרטיס", "ישרכרט"];

// Short words ("פז", "גן", "דן") must stand alone, or "עדן" would count as "דן".
function includesAny(text: string, words: string[]): boolean {
  const t = text.toLowerCase();
  const tokens = new Set(t.split(/[^\p{L}\p{N}&]+/u).filter(Boolean));
  return words.some((raw) => {
    const w = raw.trim().toLowerCase();
    if (!w) return false;
    return w.length <= 3 && !w.includes(" ") ? tokens.has(w) : t.includes(w);
  });
}

export function isCardCharge(description: string): boolean {
  if (includesAny(description, ["מקס סטוק", "max stock"])) return false;
  return includesAny(description, CARD_CHARGE_WORDS);
}

type Cat = { id: string; name: string };

function guessCategory(description: string, cats: Cat[], guesses: Guess[]): string | null {
  for (const g of guesses) {
    if (!includesAny(description, g.words)) continue;
    const hit = cats.find((c) => g.category(c.name.trim()));
    if (hit) return hit.id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export async function importMappingRows(input: {
  familyId: string;
  filename: string;
  source: "checking" | "credit";
  rows: ParsedRow[];
  uploadedBy: "advisor" | "client";
}): Promise<{ added: number; auto: number; skippedDuplicates: number }> {
  const { familyId, source, rows } = input;

  const [expenseCats, incomeCats, rules, existing] = await Promise.all([
    prisma.budgetCategory.findMany({ where: { familyId, isActive: true }, select: { id: true, name: true } }),
    prisma.incomeCategory.findMany({ where: { familyId, isActive: true }, select: { id: true, name: true } }),
    prisma.merchantRule.findMany({ where: { familyId } }),
    prisma.mappingTransaction.findMany({
      where: { familyId, source },
      select: { occurredAt: true, amount: true, description: true },
    }),
  ]);

  // Same file uploaded twice (or two overlapping date ranges): skip exact repeats.
  const seen = new Set(
    existing.map((t) => `${t.occurredAt.toISOString().slice(0, 10)}|${Number(t.amount)}|${t.description}`)
  );

  // What other families of the same advisor taught us, matched by category name.
  const keys = [...new Set(rows.map((r) => merchantKey(r.description)))];
  const family = await prisma.family.findUnique({ where: { id: familyId }, select: { advisorId: true } });
  const sharedRules = await prisma.merchantRule.findMany({
    where: { merchantKey: { in: keys }, familyId: { not: familyId }, family: { advisorId: family?.advisorId } },
    include: { category: { select: { name: true } }, incomeCategory: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const ownRule = new Map(rules.map((r) => [r.merchantKey, r]));
  const sharedRule = new Map<string, { expense?: string; income?: string }>();
  for (const r of sharedRules) {
    if (sharedRule.has(r.merchantKey)) continue;
    sharedRule.set(r.merchantKey, { expense: r.category?.name, income: r.incomeCategory?.name });
  }

  let auto = 0;
  let skippedDuplicates = 0;
  const data: Prisma.MappingTransactionCreateManyInput[] = [];

  for (const row of rows) {
    const sig = `${row.occurredAt.toISOString().slice(0, 10)}|${row.amount}|${row.description}`;
    if (seen.has(sig)) {
      skippedDuplicates++;
      continue;
    }
    seen.add(sig);

    const key = merchantKey(row.description);
    let categoryId: string | null = null;
    let incomeCategoryId: string | null = null;
    let excluded = false;
    let excludeReason: string | null = null;

    if (source === "checking" && !row.isIncome && isCardCharge(row.description)) {
      excluded = true;
      excludeReason = "חיוב כרטיס אשראי. הקניות עצמן נספרות מפירוט האשראי.";
    } else if (row.isIncome) {
      incomeCategoryId =
        ownRule.get(key)?.incomeCategoryId ??
        incomeCats.find((c) => c.name === sharedRule.get(key)?.income)?.id ??
        guessCategory(row.description, incomeCats, INCOME_GUESSES);
    } else {
      categoryId =
        ownRule.get(key)?.categoryId ??
        expenseCats.find((c) => c.name === sharedRule.get(key)?.expense)?.id ??
        guessCategory(row.description, expenseCats, EXPENSE_GUESSES);
    }
    if (categoryId || incomeCategoryId) auto++;

    data.push({
      familyId,
      source,
      occurredAt: row.occurredAt,
      description: row.description.slice(0, 300),
      merchantKey: key,
      amount: row.amount,
      isIncome: row.isIncome,
      categoryId,
      incomeCategoryId,
      excluded,
      excludeReason,
    });
  }

  await prisma.$transaction(async (tx) => {
    const upload = await tx.mappingUpload.create({
      data: {
        familyId,
        filename: input.filename.slice(0, 200),
        source,
        rowCount: data.length,
        uploadedBy: input.uploadedBy,
      },
    });
    if (data.length) {
      await tx.mappingTransaction.createMany({ data: data.map((d) => ({ ...d, uploadId: upload.id })) });
    }
  });

  return { added: data.length, auto, skippedDuplicates };
}

// Assigning one row teaches the whole merchant: every unassigned row with the
// same merchant gets the same category, and future uploads remember it.
export async function assignMerchant(input: {
  familyId: string;
  transactionId: string;
  categoryId: string | null; // expense category, or income category for income rows
  applyToSame: boolean;
}): Promise<{ ok: true; count: number } | { error: string }> {
  const tx = await prisma.mappingTransaction.findFirst({
    where: { id: input.transactionId, familyId: input.familyId },
  });
  if (!tx) return { error: "התנועה לא נמצאה." };

  if (input.categoryId) {
    const exists = tx.isIncome
      ? await prisma.incomeCategory.findFirst({ where: { id: input.categoryId, familyId: input.familyId } })
      : await prisma.budgetCategory.findFirst({ where: { id: input.categoryId, familyId: input.familyId } });
    if (!exists) return { error: "הקטגוריה לא נמצאה." };
  }

  const field = tx.isIncome
    ? { incomeCategoryId: input.categoryId }
    : { categoryId: input.categoryId };

  let count = 1;
  if (input.applyToSame) {
    const res = await prisma.mappingTransaction.updateMany({
      where: { familyId: input.familyId, merchantKey: tx.merchantKey, isIncome: tx.isIncome, excluded: false },
      data: field,
    });
    count = res.count;
    if (input.categoryId) {
      await prisma.merchantRule.upsert({
        where: { familyId_merchantKey: { familyId: input.familyId, merchantKey: tx.merchantKey } },
        create: { familyId: input.familyId, merchantKey: tx.merchantKey, ...field },
        update: tx.isIncome
          ? { incomeCategoryId: input.categoryId, categoryId: undefined }
          : { categoryId: input.categoryId, incomeCategoryId: undefined },
      });
    }
  } else {
    await prisma.mappingTransaction.update({ where: { id: tx.id }, data: field });
  }
  return { ok: true, count };
}

// ---------------------------------------------------------------------------
// The picture: average per month, per category
// ---------------------------------------------------------------------------

export type MappingCategoryLine = {
  id: string;
  name: string;
  monthly: number; // average per month (bank + card) plus the cash estimate
  cashMonthly: number;
  plannedAmount: number;
  count: number;
};

export type MappingOverview = {
  months: number; // how many calendar months the files cover
  firstDate: Date | null;
  lastDate: Date | null;
  uploads: { id: string; filename: string; source: string; rowCount: number; uploadedBy: string; createdAt: Date }[];
  expenseLines: MappingCategoryLine[];
  incomeLines: MappingCategoryLine[];
  totalExpenseMonthly: number;
  totalIncomeMonthly: number;
  unassignedExpenseMonthly: number;
  unassignedIncomeMonthly: number;
  unassigned: {
    id: string;
    description: string;
    isIncome: boolean;
    count: number;
    total: number;
    source: string;
    lastDate: Date;
  }[];
  excluded: { id: string; description: string; amount: number; occurredAt: Date; reason: string | null }[];
  cash: { id: string; description: string; amount: number; categoryId: string | null; categoryName: string | null }[];
  transactionCount: number;
};

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}

export async function getMappingOverview(familyId: string): Promise<MappingOverview> {
  const [txs, uploads, expenseCats, incomeCats] = await Promise.all([
    prisma.mappingTransaction.findMany({ where: { familyId }, orderBy: { occurredAt: "desc" } }),
    prisma.mappingUpload.findMany({ where: { familyId }, orderBy: { createdAt: "desc" } }),
    prisma.budgetCategory.findMany({ where: { familyId, isActive: true }, orderBy: { createdAt: "asc" } }),
    prisma.incomeCategory.findMany({ where: { familyId, isActive: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const statementTxs = txs.filter((t) => t.source !== "cash");
  const monthSet = new Set(statementTxs.map((t) => monthKey(t.occurredAt)));
  const months = Math.max(monthSet.size, 1);
  const dates = statementTxs.map((t) => t.occurredAt.getTime());

  const expenseSum = new Map<string, { sum: number; cash: number; count: number }>();
  const incomeSum = new Map<string, { sum: number; cash: number; count: number }>();
  let unassignedExpense = 0;
  let unassignedIncome = 0;
  const unassignedGroups = new Map<string, MappingOverview["unassigned"][number]>();
  const excluded: MappingOverview["excluded"] = [];
  const cash: MappingOverview["cash"] = [];
  const catName = new Map(expenseCats.map((c) => [c.id, c.name]));

  for (const t of txs) {
    const amount = Number(t.amount);
    if (t.source === "cash") {
      cash.push({
        id: t.id,
        description: t.description,
        amount,
        categoryId: t.categoryId,
        categoryName: t.categoryId ? catName.get(t.categoryId) ?? null : null,
      });
      if (t.categoryId) {
        const e = expenseSum.get(t.categoryId) ?? { sum: 0, cash: 0, count: 0 };
        e.cash += amount;
        e.count++;
        expenseSum.set(t.categoryId, e);
      } else {
        unassignedExpense += amount;
      }
      continue;
    }
    if (t.excluded) {
      excluded.push({ id: t.id, description: t.description, amount, occurredAt: t.occurredAt, reason: t.excludeReason });
      continue;
    }
    const target = t.isIncome ? t.incomeCategoryId : t.categoryId;
    if (target) {
      const map = t.isIncome ? incomeSum : expenseSum;
      const e = map.get(target) ?? { sum: 0, cash: 0, count: 0 };
      e.sum += amount;
      e.count++;
      map.set(target, e);
    } else {
      if (t.isIncome) unassignedIncome += amount;
      else unassignedExpense += amount;
      const gkey = `${t.isIncome ? "in" : "out"}|${t.merchantKey}`;
      const g = unassignedGroups.get(gkey);
      if (g) {
        g.count++;
        g.total += amount;
      } else {
        unassignedGroups.set(gkey, {
          id: t.id,
          description: t.description,
          isIncome: t.isIncome,
          count: 1,
          total: amount,
          source: t.source,
          lastDate: t.occurredAt,
        });
      }
    }
  }

  const toLines = (
    cats: { id: string; name: string; plannedAmount: unknown }[],
    sums: Map<string, { sum: number; cash: number; count: number }>
  ): MappingCategoryLine[] =>
    cats.map((c) => {
      const s = sums.get(c.id) ?? { sum: 0, cash: 0, count: 0 };
      return {
        id: c.id,
        name: c.name,
        monthly: Math.round(s.sum / months + s.cash),
        cashMonthly: Math.round(s.cash),
        plannedAmount: Number(c.plannedAmount),
        count: s.count,
      };
    });

  const expenseLines = toLines(expenseCats, expenseSum).sort((a, b) => b.monthly - a.monthly);
  const incomeLines = toLines(incomeCats, incomeSum).sort((a, b) => b.monthly - a.monthly);
  const cashUnassigned = cash.filter((c) => !c.categoryId).reduce((s, c) => s + c.amount, 0);
  const unassignedExpenseMonthly = Math.round((unassignedExpense - cashUnassigned) / months + cashUnassigned);
  const unassignedIncomeMonthly = Math.round(unassignedIncome / months);

  return {
    months: monthSet.size,
    firstDate: dates.length ? new Date(Math.min(...dates)) : null,
    lastDate: dates.length ? new Date(Math.max(...dates)) : null,
    uploads,
    expenseLines,
    incomeLines,
    totalExpenseMonthly: expenseLines.reduce((s, l) => s + l.monthly, 0) + unassignedExpenseMonthly,
    totalIncomeMonthly: incomeLines.reduce((s, l) => s + l.monthly, 0) + unassignedIncomeMonthly,
    unassignedExpenseMonthly,
    unassignedIncomeMonthly,
    unassigned: [...unassignedGroups.values()].sort((a, b) => b.total - a.total),
    excluded,
    cash,
    transactionCount: statementTxs.length,
  };
}
