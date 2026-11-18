"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";
import { getCurrentFamilyMember } from "@/lib/currentMember";
import { parseStatement } from "@/lib/mappingParse";
import { importMappingRows, assignMerchant, getMappingOverview } from "@/lib/mapping";
import { getPicture, ensurePictureLines } from "@/lib/picture";

type Result = { error: string } | { ok: true; message?: string };

// The mapping screens are shared: the client sees their own family, and the
// advisor opens the same screen for any family of theirs (familyId given).
async function resolveFamily(
  familyId?: string | null
): Promise<{ familyId: string; by: "advisor" | "client" } | { error: string }> {
  if (familyId) {
    const advisor = await getCurrentAdvisor();
    if (!advisor) return { error: "צריך להתחבר מחדש." };
    const family = await prisma.family.findFirst({ where: { id: familyId, advisorId: advisor.id } });
    if (!family) return { error: "המשפחה לא נמצאה." };
    return { familyId, by: "advisor" };
  }
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "צריך להתחבר מחדש." };
  return { familyId: member.familyId, by: "client" };
}

function refresh(familyId: string) {
  revalidatePath("/dashboard/mapping");
  revalidatePath(`/admin/families/${familyId}/mapping`);
  revalidatePath("/dashboard/plan");
  revalidatePath(`/admin/families/${familyId}/mapping`);
}

const updatedText = (n: number) => (n === 1 ? "עודכנה קטגוריה אחת" : `עודכנו ${n} קטגוריות`);

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function uploadMappingFile(formData: FormData): Promise<Result> {
  const who = await resolveFamily(formData.get("familyId") as string | null);
  if ("error" in who) return who;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "לא נבחר קובץ." };
  if (file.size > MAX_FILE_BYTES) return { error: `הקובץ "${file.name}" גדול מדי. אפשר לפצל אותו לפי חודשים.` };
  if (/\.pdf$/i.test(file.name)) {
    return { error: `"${file.name}" הוא PDF. צריך להוריד מהבנק את הפירוט כקובץ אקסל.` };
  }

  const parsed = parseStatement(await file.arrayBuffer(), file.name);
  if (!parsed.ok) return { error: `${file.name}: ${parsed.error}` };

  const res = await importMappingRows({
    familyId: who.familyId,
    filename: file.name,
    source: parsed.source,
    rows: parsed.rows,
    uploadedBy: who.by,
  });
  refresh(who.familyId);

  const kind = parsed.source === "credit" ? "פירוט אשראי" : "עובר ושב";
  const dup = res.skippedDuplicates ? `, ${res.skippedDuplicates} כבר היו ודילגנו עליהן` : "";
  return {
    ok: true,
    message: `${file.name} (${kind}): ${res.added} תנועות, ${res.auto} שויכו לבד${dup}.`,
  };
}

export async function assignMappingCategory(input: {
  familyId?: string;
  transactionId: string;
  categoryId: string | null;
  applyToSame?: boolean;
}): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;
  const res = await assignMerchant({
    familyId: who.familyId,
    transactionId: input.transactionId,
    categoryId: input.categoryId,
    applyToSame: input.applyToSame ?? true,
  });
  if ("error" in res) return res;
  refresh(who.familyId);
  return { ok: true, message: res.count > 1 ? `שויכו ${res.count} תנועות מאותו מקום.` : undefined };
}

export async function setMappingExcluded(input: {
  familyId?: string;
  transactionId: string;
  excluded: boolean;
}): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;
  await prisma.mappingTransaction.updateMany({
    where: { id: input.transactionId, familyId: who.familyId },
    data: { excluded: input.excluded, excludeReason: input.excluded ? "הוצא ידנית מהחישוב." : null },
  });
  refresh(who.familyId);
  return { ok: true };
}

export async function addCashEstimate(input: {
  familyId?: string;
  description: string;
  amount: number;
  categoryId: string;
}): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;
  const description = input.description.trim() || "מזומן";
  if (!Number.isFinite(input.amount) || input.amount <= 0) return { error: "צריך סכום חודשי." };
  const category = await prisma.budgetCategory.findFirst({
    where: { id: input.categoryId, familyId: who.familyId },
  });
  if (!category) return { error: "צריך לבחור קטגוריה." };

  await prisma.mappingTransaction.create({
    data: {
      familyId: who.familyId,
      source: "cash",
      occurredAt: new Date(),
      description: description.slice(0, 200),
      merchantKey: "מזומן",
      amount: input.amount,
      categoryId: category.id,
    },
  });
  refresh(who.familyId);
  return { ok: true };
}

export async function removeCashEstimate(input: { familyId?: string; id: string }): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;
  await prisma.mappingTransaction.deleteMany({
    where: { id: input.id, familyId: who.familyId, source: "cash" },
  });
  refresh(who.familyId);
  return { ok: true };
}

export async function removeMappingUpload(input: { familyId?: string; uploadId: string }): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;
  await prisma.mappingUpload.deleteMany({ where: { id: input.uploadId, familyId: who.familyId } });
  refresh(who.familyId);
  return { ok: true };
}

// "Take the mapping as the plan": every category gets its monthly average,
// rounded to 50. With onlyEmpty, categories that already have a plan stay.
export async function applyMappingToPlan(input: { familyId?: string; onlyEmpty: boolean }): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;
  const overview = await getMappingOverview(who.familyId);
  if (overview.transactionCount === 0 && overview.cash.length === 0) {
    return { error: "עוד אין מיפוי. קודם מעלים קבצים מהבנק או מוסיפים מזומן." };
  }
  const round = (n: number) => Math.round(n / 50) * 50;
  let changed = 0;
  await prisma.$transaction(async (tx) => {
    for (const l of overview.expenseLines) {
      if (l.monthly <= 0 || (input.onlyEmpty && l.plannedAmount > 0)) continue;
      await tx.budgetCategory.update({ where: { id: l.id }, data: { plannedAmount: round(l.monthly) } });
      changed++;
    }
    for (const l of overview.incomeLines) {
      if (l.monthly <= 0 || (input.onlyEmpty && l.plannedAmount > 0)) continue;
      await tx.incomeCategory.update({ where: { id: l.id }, data: { plannedAmount: round(l.monthly) } });
      changed++;
    }
  });
  refresh(who.familyId);
  revalidatePath("/dashboard");
  return { ok: true, message: changed ? `${updatedText(changed)} לפי המיפוי.` : "לא היה מה לעדכן." };
}

// One number, typed in the plan screen.
export async function setPlannedAmount(input: {
  familyId?: string;
  kind: "expense" | "income";
  categoryId: string;
  amount: number;
}): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;
  if (!Number.isFinite(input.amount) || input.amount < 0) return { error: "הסכום לא תקין." };
  const where = { id: input.categoryId, familyId: who.familyId };
  const res =
    input.kind === "expense"
      ? await prisma.budgetCategory.updateMany({ where, data: { plannedAmount: input.amount } })
      : await prisma.incomeCategory.updateMany({ where, data: { plannedAmount: input.amount } });
  if (res.count === 0) return { error: "הקטגוריה לא נמצאה." };
  refresh(who.familyId);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Financial picture (תמונת מצב): monthly and annual lines
// ---------------------------------------------------------------------------

const MAX_AMOUNT = 100_000_000;

function cleanAmount(v: unknown): number | null | "bad" {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return "bad";
  return Math.round(n * 100) / 100;
}

export async function savePictureLine(input: {
  familyId?: string;
  id: string;
  amount?: number | null;
  targetAmount?: number | null;
  priority?: number | null;
  notes?: string | null;
  whenText?: string | null;
}): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;

  const data: Record<string, unknown> = {};
  if ("amount" in input) {
    const a = cleanAmount(input.amount);
    if (a === "bad") return { error: "הסכום לא תקין." };
    data.amount = a ?? 0;
  }
  if ("targetAmount" in input) {
    const t = cleanAmount(input.targetAmount);
    if (t === "bad") return { error: "היעד לא תקין." };
    data.targetAmount = t;
  }
  if ("priority" in input) {
    const pr = input.priority;
    if (pr !== null && pr !== undefined && ![1, 2, 3].includes(pr)) return { error: "סדר העדיפות לא תקין." };
    data.priority = pr ?? null;
  }
  if ("notes" in input) data.notes = input.notes?.trim().slice(0, 300) || null;
  if ("whenText" in input) data.whenText = input.whenText?.trim().slice(0, 60) || null;

  const res = await prisma.pictureLine.updateMany({ where: { id: input.id, familyId: who.familyId }, data });
  if (res.count === 0) return { error: "השורה לא נמצאה." };
  refresh(who.familyId);
  return { ok: true };
}

export async function addPictureLine(input: {
  familyId?: string;
  period: "monthly" | "annual";
  kind: "income" | "expense";
  groupName: string;
  subGroup?: string;
  name: string;
}): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;
  const name = input.name.trim().slice(0, 80);
  if (!name) return { error: "צריך לכתוב שם לשורה." };
  if (!["monthly", "annual"].includes(input.period) || !["income", "expense"].includes(input.kind)) {
    return { error: "השורה לא תקינה." };
  }

  const subGroup = input.subGroup ?? "";
  const dup = await prisma.pictureLine.findFirst({
    where: { familyId: who.familyId, period: input.period, kind: input.kind, groupName: input.groupName, subGroup, name },
  });
  if (dup) return { error: "כבר יש שורה בשם הזה כאן." };

  const last = await prisma.pictureLine.findFirst({
    where: { familyId: who.familyId, period: input.period, kind: input.kind, groupName: input.groupName, subGroup },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  await prisma.pictureLine.create({
    data: {
      familyId: who.familyId,
      period: input.period,
      kind: input.kind,
      groupName: input.groupName,
      subGroup,
      name,
      sortOrder: (last?.sortOrder ?? 9000) + 1,
    },
  });
  refresh(who.familyId);
  return { ok: true };
}

export async function removePictureLine(input: { familyId?: string; id: string }): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;
  await prisma.pictureLine.deleteMany({ where: { id: input.id, familyId: who.familyId } });
  refresh(who.familyId);
  return { ok: true };
}

export async function setHouseholdSize(input: { familyId?: string; size: number | null }): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;
  const size = input.size;
  if (size !== null && (!Number.isInteger(size) || size < 1 || size > 30)) return { error: "מספר הנפשות לא תקין." };
  await prisma.family.update({ where: { id: who.familyId }, data: { householdSize: size } });
  refresh(who.familyId);
  return { ok: true };
}

// "Take the picture as the plan": each budget category gets what we decided
// (the goal where we set one, otherwise what it is today), per month. The
// annual picture counts one twelfth. With onlyEmpty, existing plans stay.
export async function applyPictureToPlan(input: { familyId?: string; onlyEmpty: boolean }): Promise<Result> {
  const who = await resolveFamily(input.familyId);
  if ("error" in who) return who;
  await ensurePictureLines(who.familyId);
  const picture = await getPicture(who.familyId);
  if (!picture.hasData) return { error: "עוד לא מילאתם את תמונת המצב. קודם ממלאים סכומים." };

  const [expenseCats, incomeCats] = await Promise.all([
    prisma.budgetCategory.findMany({ where: { familyId: who.familyId, isActive: true } }),
    prisma.incomeCategory.findMany({ where: { familyId: who.familyId, isActive: true } }),
  ]);
  const round = (n: number) => Math.round(n / 10) * 10;

  // A picture line whose category was renamed or removed goes to "שונות", so no amount is lost.
  function fold(map: Map<string, { now: number; target: number }>, names: string[], fallback: string) {
    const out = new Map<string, number>();
    for (const [name, t] of map) {
      const key = names.includes(name) ? name : names.includes(fallback) ? fallback : null;
      if (!key) continue;
      out.set(key, (out.get(key) ?? 0) + t.target);
    }
    return out;
  }
  const expenseByName = fold(picture.categoryExpense, expenseCats.map((c) => c.name), "שונות (הוצאות)");
  const incomeByName = fold(picture.categoryIncome, incomeCats.map((c) => c.name), "שונות (הכנסות)");

  let changed = 0;
  await prisma.$transaction(async (tx) => {
    for (const c of expenseCats) {
      const value = expenseByName.get(c.name);
      if (value === undefined || value <= 0 || (input.onlyEmpty && Number(c.plannedAmount) > 0)) continue;
      await tx.budgetCategory.update({ where: { id: c.id }, data: { plannedAmount: round(value) } });
      changed++;
    }
    for (const c of incomeCats) {
      const value = incomeByName.get(c.name);
      if (value === undefined || value <= 0 || (input.onlyEmpty && Number(c.plannedAmount) > 0)) continue;
      await tx.incomeCategory.update({ where: { id: c.id }, data: { plannedAmount: round(value) } });
      changed++;
    }
  });
  refresh(who.familyId);
  revalidatePath("/dashboard");
  return { ok: true, message: changed ? `${updatedText(changed)} לפי תמונת המצב.` : "לא היה מה לעדכן." };
}
