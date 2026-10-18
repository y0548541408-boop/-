import { prisma } from "@/lib/prisma";

export type GoalItem = {
  id: string;
  title: string;
  target: number;
  current: number;
  percent: number;
  targetDate: Date | null;
  // How much to put aside each month to make the target date (null when no date
  // is set, or the goal is already reached).
  monthlyNeeded: number | null;
};

function monthsUntil(date: Date): number {
  const now = new Date();
  return (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
}

export async function getFamilyGoals(familyId: string): Promise<GoalItem[]> {
  const rows = await prisma.goal.findMany({ where: { familyId }, orderBy: { createdAt: "asc" } });

  return rows.map((g) => {
    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount);
    const left = Math.max(target - current, 0);
    let monthlyNeeded: number | null = null;
    if (g.targetDate && left > 0) {
      monthlyNeeded = left / Math.max(monthsUntil(g.targetDate), 1);
    }
    return {
      id: g.id,
      title: g.title,
      target,
      current,
      percent: target > 0 ? (current / target) * 100 : 0,
      targetDate: g.targetDate,
      monthlyNeeded,
    };
  });
}
