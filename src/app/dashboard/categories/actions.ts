"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentFamilyMember } from "@/lib/currentMember";

export type CategoryKind = "expense" | "income";
export type CategoryResult = { error: string } | { ok: true; message?: string };

function refresh() {
  revalidatePath("/dashboard", "layout");
}

function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

async function nameTaken(
  kind: CategoryKind,
  familyId: string,
  name: string,
  exceptId?: string
): Promise<{ id: string; isActive: boolean } | null> {
  const where = { familyId, name, ...(exceptId ? { NOT: { id: exceptId } } : {}) };
  return kind === "expense"
    ? prisma.budgetCategory.findFirst({ where, select: { id: true, isActive: true } })
    : prisma.incomeCategory.findFirst({ where, select: { id: true, isActive: true } });
}

export async function addCategory(input: {
  kind: CategoryKind;
  name: string;
  type?: "fixed" | "variable";
  planned?: number;
}): Promise<CategoryResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  const name = cleanName(input.name);
  if (!name) return { error: "צריך לתת שם לקטגוריה." };
  if (name.length > 40) return { error: "השם ארוך מדי (עד 40 תווים)." };
  const planned = input.planned ?? 0;
  if (!Number.isFinite(planned) || planned < 0) return { error: "התקציב צריך להיות מספר חיובי." };

  const existing = await nameTaken(input.kind, member.familyId, name);
  if (existing?.isActive) return { error: "כבר יש קטגוריה בשם הזה." };

  if (existing) {
    // A hidden category with this name: bring it back instead of duplicating.
    if (input.kind === "expense") {
      await prisma.budgetCategory.update({
        where: { id: existing.id },
        data: { isActive: true, plannedAmount: planned, ...(input.type ? { type: input.type } : {}) },
      });
    } else {
      await prisma.incomeCategory.update({
        where: { id: existing.id },
        data: { isActive: true, plannedAmount: planned },
      });
    }
    refresh();
    return { ok: true, message: "הקטגוריה שהוסתרה בעבר חזרה." };
  }

  if (input.kind === "expense") {
    await prisma.budgetCategory.create({
      data: {
        familyId: member.familyId,
        name,
        type: input.type ?? "variable",
        plannedAmount: planned,
      },
    });
  } else {
    await prisma.incomeCategory.create({
      data: { familyId: member.familyId, name, plannedAmount: planned },
    });
  }
  refresh();
  return { ok: true };
}

export async function renameCategory(input: {
  kind: CategoryKind;
  id: string;
  name: string;
}): Promise<CategoryResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  const name = cleanName(input.name);
  if (!name) return { error: "צריך לתת שם לקטגוריה." };
  if (name.length > 40) return { error: "השם ארוך מדי (עד 40 תווים)." };
  if (await nameTaken(input.kind, member.familyId, name, input.id)) {
    return { error: "כבר יש קטגוריה בשם הזה." };
  }

  const result =
    input.kind === "expense"
      ? await prisma.budgetCategory.updateMany({
          where: { id: input.id, familyId: member.familyId },
          data: { name },
        })
      : await prisma.incomeCategory.updateMany({
          where: { id: input.id, familyId: member.familyId },
          data: { name },
        });
  if (result.count === 0) return { error: "הקטגוריה לא נמצאה." };

  refresh();
  return { ok: true };
}

export async function setCategoryType(input: {
  id: string;
  type: "fixed" | "variable";
}): Promise<CategoryResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  const result = await prisma.budgetCategory.updateMany({
    where: { id: input.id, familyId: member.familyId },
    data: { type: input.type },
  });
  if (result.count === 0) return { error: "הקטגוריה לא נמצאה." };

  refresh();
  return { ok: true };
}

// A category with no history is deleted for good. One with history is only
// hidden, so past months keep adding up correctly.
export async function removeCategory(input: {
  kind: CategoryKind;
  id: string;
}): Promise<CategoryResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };
  const familyId = member.familyId;

  if (input.kind === "expense") {
    const category = await prisma.budgetCategory.findFirst({ where: { id: input.id, familyId } });
    if (!category) return { error: "הקטגוריה לא נמצאה." };

    const [expenses, recurring, reallocations] = await Promise.all([
      prisma.expense.count({ where: { categoryId: category.id } }),
      prisma.recurringExpense.count({ where: { categoryId: category.id } }),
      prisma.budgetReallocation.count({
        where: { OR: [{ fromCategoryId: category.id }, { toCategoryId: category.id }] },
      }),
    ]);

    if (expenses + recurring + reallocations === 0) {
      await prisma.budgetCategory.delete({ where: { id: category.id } });
      refresh();
      return { ok: true, message: "הקטגוריה נמחקה." };
    }
    await prisma.budgetCategory.update({ where: { id: category.id }, data: { isActive: false } });
    refresh();
    return {
      ok: true,
      message: "יש בקטגוריה תנועות, אז היא הוסתרה ולא נמחקה. בחודשים שבהם היו בה תנועות היא תמשיך להופיע, וכך הסיכומים נשארים נכונים.",
    };
  }

  const category = await prisma.incomeCategory.findFirst({ where: { id: input.id, familyId } });
  if (!category) return { error: "הקטגוריה לא נמצאה." };
  const entries = await prisma.income.count({ where: { categoryId: category.id } });
  if (entries === 0) {
    await prisma.incomeCategory.delete({ where: { id: category.id } });
    refresh();
    return { ok: true, message: "הקטגוריה נמחקה." };
  }
  await prisma.incomeCategory.update({ where: { id: category.id }, data: { isActive: false } });
  refresh();
  return {
    ok: true,
    message: "יש בקטגוריה תנועות, אז היא הוסתרה ולא נמחקה. בחודשים שבהם היו בה תנועות היא תמשיך להופיע, וכך הסיכומים נשארים נכונים.",
  };
}

export async function restoreCategory(input: {
  kind: CategoryKind;
  id: string;
}): Promise<CategoryResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  const result =
    input.kind === "expense"
      ? await prisma.budgetCategory.updateMany({
          where: { id: input.id, familyId: member.familyId },
          data: { isActive: true },
        })
      : await prisma.incomeCategory.updateMany({
          where: { id: input.id, familyId: member.familyId },
          data: { isActive: true },
        });
  if (result.count === 0) return { error: "הקטגוריה לא נמצאה." };

  refresh();
  return { ok: true };
}
