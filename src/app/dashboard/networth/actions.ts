"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentFamilyMember } from "@/lib/currentMember";
import { getCurrentAdvisor } from "@/lib/advisor";
import { recordNetWorthSnapshot } from "@/lib/netWorth";

export type Result = { error: string } | { ok: true };

function refresh() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
}

// The client edits their own family. The advisor edits a family of theirs when familyId is given.
async function resolveNetWorthFamily(familyId?: string): Promise<{ familyId: string } | { error: string }> {
  if (familyId) {
    const advisor = await getCurrentAdvisor();
    if (!advisor) return { error: "יש להתחבר מחדש." };
    const family = await prisma.family.findFirst({ where: { id: familyId, advisorId: advisor.id }, select: { id: true } });
    if (!family) return { error: "המשפחה לא נמצאה." };
    return { familyId };
  }
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };
  return { familyId: member.familyId };
}

function validAmount(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value < 1e12;
}

export async function saveNetWorthItem(input: {
  id?: string;
  kind: "asset" | "liability";
  group: string;
  name: string;
  value: number;
  familyId?: string;
}): Promise<Result> {
  const who = await resolveNetWorthFamily(input.familyId);
  if ("error" in who) return who;

  const name = input.name.trim();
  const group = input.group.trim();
  if (!name) return { error: "צריך לתת שם." };
  if (!group) return { error: "צריך לבחור סוג." };
  if (!validAmount(input.value)) return { error: "יש להזין סכום תקין." };

  if (input.id) {
    const result = await prisma.netWorthItem.updateMany({
      where: { id: input.id, familyId: who.familyId },
      data: { name, group, value: input.value },
    });
    if (result.count === 0) return { error: "הפריט לא נמצא." };
  } else {
    await prisma.netWorthItem.create({
      data: { familyId: who.familyId, kind: input.kind, group, name, value: input.value },
    });
  }

  await recordNetWorthSnapshot(who.familyId);
  refresh();
  return { ok: true };
}

export async function deleteNetWorthItem(input: { id: string; familyId?: string }): Promise<Result> {
  const who = await resolveNetWorthFamily(input.familyId);
  if ("error" in who) return who;

  const result = await prisma.netWorthItem.deleteMany({
    where: { id: input.id, familyId: who.familyId },
  });
  if (result.count === 0) return { error: "הפריט לא נמצא." };

  await recordNetWorthSnapshot(who.familyId);
  refresh();
  return { ok: true };
}

export async function saveGoal(input: {
  id?: string;
  title: string;
  target: number;
  current: number;
  targetDate?: string;
}): Promise<Result> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  const title = input.title.trim();
  if (!title) return { error: "צריך לתת שם ליעד." };
  if (!validAmount(input.target) || input.target <= 0) return { error: "סכום היעד צריך להיות גדול מאפס." };
  if (!validAmount(input.current)) return { error: "הסכום שנחסך לא תקין." };

  let targetDate: Date | null = null;
  if (input.targetDate) {
    targetDate = new Date(`${input.targetDate}T12:00:00`);
    if (Number.isNaN(targetDate.getTime())) return { error: "תאריך לא תקין." };
  }

  const data = { title, targetAmount: input.target, currentAmount: input.current, targetDate };
  if (input.id) {
    const result = await prisma.goal.updateMany({
      where: { id: input.id, familyId: member.familyId },
      data,
    });
    if (result.count === 0) return { error: "היעד לא נמצא." };
  } else {
    await prisma.goal.create({ data: { familyId: member.familyId, ...data } });
  }

  refresh();
  return { ok: true };
}

export async function addToGoal(input: { id: string; amount: number }): Promise<Result> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };
  if (!Number.isFinite(input.amount) || input.amount === 0) return { error: "יש להזין סכום." };

  const goal = await prisma.goal.findFirst({ where: { id: input.id, familyId: member.familyId } });
  if (!goal) return { error: "היעד לא נמצא." };

  const next = Math.max(Number(goal.currentAmount) + input.amount, 0);
  await prisma.goal.update({ where: { id: goal.id }, data: { currentAmount: next } });

  refresh();
  return { ok: true };
}

export async function deleteGoal(input: { id: string }): Promise<Result> {
  const member = await getCurrentFamilyMember();
  if (!member) return { error: "יש להתחבר מחדש." };

  const result = await prisma.goal.deleteMany({
    where: { id: input.id, familyId: member.familyId },
  });
  if (result.count === 0) return { error: "היעד לא נמצא." };

  refresh();
  return { ok: true };
}
