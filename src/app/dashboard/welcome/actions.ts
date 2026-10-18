"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentFamilyMember } from "@/lib/currentMember";

type Entry = { id: string; amount: number };

export type WelcomeResult = { error: string } | { ok: true };

function validAmount(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value < 1e9;
}

// Saves the budget the client typed in the welcome steps and marks the family
// as welcomed. Passing nothing is the "skip for now" path.
export async function completeWelcome(input: {
  income: Entry[];
  expenses: Entry[];
  goal?: { title: string; target: number };
}): Promise<WelcomeResult> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };
  const familyId = member.familyId;

  const entries = [...input.income, ...input.expenses];
  if (entries.some((e) => !validAmount(e.amount))) return { error: "יש סכום שלא תקין." };

  let goal: { title: string; target: number } | null = null;
  if (input.goal && input.goal.title.trim() && input.goal.target > 0) {
    if (!validAmount(input.goal.target)) return { error: "סכום היעד לא תקין." };
    goal = { title: input.goal.title.trim(), target: input.goal.target };
  }

  await prisma.$transaction([
    ...input.income.map((e) =>
      prisma.incomeCategory.updateMany({
        where: { id: e.id, familyId },
        data: { plannedAmount: e.amount },
      })
    ),
    ...input.expenses.map((e) =>
      prisma.budgetCategory.updateMany({
        where: { id: e.id, familyId },
        data: { plannedAmount: e.amount },
      })
    ),
    ...(goal
      ? [prisma.goal.create({ data: { familyId, title: goal.title, targetAmount: goal.target } })]
      : []),
    prisma.family.update({ where: { id: familyId }, data: { welcomedAt: new Date() } }),
  ]);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
