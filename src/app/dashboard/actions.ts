"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getFamilyBudgetSummary } from "@/lib/budget";
import { createAdminClient, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";

type SimpleActionResult = { error: string } | { ok: true };

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

async function resolveBudgetCategoryId(
  familyId: string,
  categoryId: string,
  newCategoryName: string | undefined,
  type: "fixed" | "variable"
): Promise<{ id: string } | { error: string }> {
  if (categoryId !== "__new__") {
    const category = await prisma.budgetCategory.findFirst({
      where: { id: categoryId, familyId },
    });
    if (!category) return { error: "קטגוריה לא נמצאה." };
    return { id: category.id };
  }

  const name = newCategoryName?.trim();
  if (!name) return { error: "יש לתת שם לקטגוריה החדשה." };

  const existing = await prisma.budgetCategory.findFirst({
    where: { familyId, name },
  });
  if (existing) {
    if (!existing.isActive) {
      await prisma.budgetCategory.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return { id: existing.id };
  }

  const created = await prisma.budgetCategory.create({
    data: { familyId, name, type, plannedAmount: 0 },
  });
  return { id: created.id };
}

export async function addExpense(input: {
  categoryId: string;
  newCategoryName?: string;
  amount: number;
  note?: string;
}): Promise<ActionResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  if (!input.categoryId) return { error: "יש לבחור קטגוריה." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "יש להזין סכום תקין." };
  }

  const resolved = await resolveBudgetCategoryId(
    member.familyId,
    input.categoryId,
    input.newCategoryName,
    "variable"
  );
  if ("error" in resolved) return { error: resolved.error };
  const categoryId = resolved.id;

  await prisma.expense.create({
    data: {
      familyId: member.familyId,
      categoryId,
      amount: input.amount,
      note: input.note?.trim() || null,
      source: "dashboard",
      occurredAt: new Date(),
      createdById: member.id,
    },
  });

  revalidatePath("/dashboard");

  const summary = await getFamilyBudgetSummary(member.familyId);
  const updated = summary.find((c) => c.id === categoryId);

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

async function resolveIncomeCategoryId(
  familyId: string,
  categoryId: string,
  newCategoryName: string | undefined
): Promise<{ id: string } | { error: string }> {
  if (categoryId !== "__new__") {
    const category = await prisma.incomeCategory.findFirst({
      where: { id: categoryId, familyId },
    });
    if (!category) return { error: "קטגוריה לא נמצאה." };
    return { id: category.id };
  }

  const name = newCategoryName?.trim();
  if (!name) return { error: "יש לתת שם לקטגוריה החדשה." };

  const existing = await prisma.incomeCategory.findFirst({
    where: { familyId, name },
  });
  if (existing) {
    if (!existing.isActive) {
      await prisma.incomeCategory.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return { id: existing.id };
  }

  const created = await prisma.incomeCategory.create({
    data: { familyId, name, plannedAmount: 0 },
  });
  return { id: created.id };
}

export async function addIncome(input: {
  categoryId: string;
  newCategoryName?: string;
  amount: number;
  note?: string;
}): Promise<SimpleActionResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  if (!input.categoryId) return { error: "יש לבחור קטגוריה." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "יש להזין סכום תקין." };
  }

  const resolved = await resolveIncomeCategoryId(
    member.familyId,
    input.categoryId,
    input.newCategoryName
  );
  if ("error" in resolved) return { error: resolved.error };

  await prisma.income.create({
    data: {
      familyId: member.familyId,
      categoryId: resolved.id,
      amount: input.amount,
      note: input.note?.trim() || null,
      occurredAt: new Date(),
      createdById: member.id,
    },
  });

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getMyDocumentUrl(storagePath: string): Promise<string | null> {
  const member = await getCurrentFamilyMember();
  if (!member) return null;

  const doc = await prisma.document.findFirst({
    where: { storagePath, familyId: member.familyId },
  });
  if (!doc) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 10);

  if (error) return null;
  return data.signedUrl;
}

export async function deleteTransaction(input: {
  id: string;
  kind: "expense" | "income";
}): Promise<SimpleActionResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  if (input.kind === "expense") {
    const result = await prisma.expense.deleteMany({
      where: { id: input.id, familyId: member.familyId },
    });
    if (result.count === 0) return { error: "התנועה לא נמצאה." };
  } else {
    const result = await prisma.income.deleteMany({
      where: { id: input.id, familyId: member.familyId },
    });
    if (result.count === 0) return { error: "התנועה לא נמצאה." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/annual");
  revalidatePath("/dashboard/maaser");
  return { ok: true };
}

export async function updateTransaction(input: {
  id: string;
  kind: "expense" | "income";
  amount: number;
  note: string;
  occurredAt: string; // yyyy-mm-dd
}): Promise<SimpleActionResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "יש להזין סכום תקין." };
  }
  const occurredAt = new Date(input.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) return { error: "תאריך לא תקין." };

  if (input.kind === "expense") {
    const result = await prisma.expense.updateMany({
      where: { id: input.id, familyId: member.familyId },
      data: { amount: input.amount, note: input.note.trim() || null, occurredAt },
    });
    if (result.count === 0) return { error: "התנועה לא נמצאה." };
  } else {
    const result = await prisma.income.updateMany({
      where: { id: input.id, familyId: member.familyId },
      data: { amount: input.amount, note: input.note.trim() || null, occurredAt },
    });
    if (result.count === 0) return { error: "התנועה לא נמצאה." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/annual");
  revalidatePath("/dashboard/maaser");
  return { ok: true };
}

export async function setMaaserRate(ratePercent: 10 | 20): Promise<SimpleActionResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  await prisma.family.update({
    where: { id: member.familyId },
    data: { maaserRatePercent: ratePercent },
  });

  revalidatePath("/dashboard/maaser");
  return { ok: true };
}

export async function recordTithePayment(input: { amount: number; note?: string }): Promise<SimpleActionResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "יש להזין סכום תקין." };
  }

  let titheCategory = await prisma.budgetCategory.findFirst({
    where: { familyId: member.familyId, name: "מעשרות" },
  });
  if (!titheCategory) {
    titheCategory = await prisma.budgetCategory.create({
      data: { familyId: member.familyId, name: "מעשרות", type: "variable", plannedAmount: 0 },
    });
  } else if (!titheCategory.isActive) {
    titheCategory = await prisma.budgetCategory.update({
      where: { id: titheCategory.id },
      data: { isActive: true },
    });
  }

  await prisma.expense.create({
    data: {
      familyId: member.familyId,
      categoryId: titheCategory.id,
      amount: input.amount,
      note: input.note?.trim() || "תשלום מעשר",
      source: "dashboard",
      occurredAt: new Date(),
      createdById: member.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/maaser");
  return { ok: true };
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
