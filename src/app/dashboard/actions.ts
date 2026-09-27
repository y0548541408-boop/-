"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getFamilyBudgetSummary } from "@/lib/budget";

type ActionResult =
  | { error: string }
  | { ok: true; overBudget?: { categoryId: string; categoryName: string; overageAmount: number } };

async function getCurrentFamilyMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.familyMember.findUnique({
    where: { authUserId: user.id },
    include: { family: true },
  });
}

export async function addExpense(input: {
  categoryId: string;
  amount: number;
  note?: string;
}): Promise<ActionResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  if (!input.categoryId) return { error: "יש לבחור קטגוריה." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "יש להזין סכום תקין." };
  }

  const category = await prisma.budgetCategory.findFirst({
    where: { id: input.categoryId, familyId: member.familyId },
  });
  if (!category) return { error: "קטגוריה לא נמצאה." };

  await prisma.expense.create({
    data: {
      familyId: member.familyId,
      categoryId: input.categoryId,
      amount: input.amount,
      note: input.note?.trim() || null,
      source: "dashboard",
      occurredAt: new Date(),
      createdById: member.id,
    },
  });

  revalidatePath("/dashboard");

  const summary = await getFamilyBudgetSummary(member.familyId);
  const updated = summary.find((c) => c.id === input.categoryId);

  if (updated && updated.remaining < 0) {
    return {
      ok: true,
      overBudget: {
        categoryId: updated.id,
        categoryName: updated.name,
        overageAmount: Math.abs(updated.remaining),
      },
    };
  }

  return { ok: true };
}

export async function addRecurringExpense(input: {
  categoryId: string;
  name: string;
  amount: number;
}): Promise<ActionResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  if (!input.categoryId) return { error: "יש לבחור קטגוריה." };
  if (!input.name.trim()) return { error: "יש לתת שם להוצאה הקבועה." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "יש להזין סכום תקין." };
  }

  const category = await prisma.budgetCategory.findFirst({
    where: { id: input.categoryId, familyId: member.familyId },
  });
  if (!category) return { error: "קטגוריה לא נמצאה." };

  await prisma.recurringExpense.create({
    data: {
      familyId: member.familyId,
      categoryId: input.categoryId,
      name: input.name.trim(),
      amount: input.amount,
    },
  });

  revalidatePath("/dashboard");

  const summary = await getFamilyBudgetSummary(member.familyId);
  const updated = summary.find((c) => c.id === input.categoryId);

  if (updated && updated.remaining < 0) {
    return {
      ok: true,
      overBudget: {
        categoryId: updated.id,
        categoryName: updated.name,
        overageAmount: Math.abs(updated.remaining),
      },
    };
  }

  return { ok: true };
}

export async function removeRecurringExpense(formData: FormData) {
  const member = await getCurrentFamilyMember();
  if (!member) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.recurringExpense.updateMany({
    where: { id, familyId: member.familyId },
    data: { isActive: false },
  });

  revalidatePath("/dashboard");
}

export async function completeTask(formData: FormData): Promise<void> {
  const member = await getCurrentFamilyMember();
  if (!member) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.task.updateMany({
    where: { id, familyId: member.familyId },
    data: { status: "done", completedAt: new Date() },
  });

  revalidatePath("/dashboard");
}

export async function reallocateBudget(input: {
  fromCategoryId: string;
  toCategoryId: string;
  amount: number;
}): Promise<ActionResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  if (input.fromCategoryId === input.toCategoryId) {
    return { error: "לא ניתן לקזז קטגוריה מעצמה." };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "יש להזין סכום תקין." };
  }

  const categories = await prisma.budgetCategory.findMany({
    where: {
      familyId: member.familyId,
      id: { in: [input.fromCategoryId, input.toCategoryId] },
    },
  });
  if (categories.length !== 2) return { error: "קטגוריה לא נמצאה." };

  await prisma.budgetReallocation.create({
    data: {
      familyId: member.familyId,
      fromCategoryId: input.fromCategoryId,
      toCategoryId: input.toCategoryId,
      amount: input.amount,
    },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}
