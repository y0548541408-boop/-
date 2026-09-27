import { prisma } from "@/lib/prisma";

export type FamilyTaskItem = {
  id: string;
  title: string;
  description: string | null;
  toolboxLink: string | null;
  videoUrl: string | null;
  deadline: Date;
  status: "open" | "done" | "overdue";
  taskType: "savings" | "habit";
  isOverdue: boolean;
};

export async function getFamilyTasks(familyId: string): Promise<FamilyTaskItem[]> {
  const tasks = await prisma.task.findMany({
    where: { familyId },
    orderBy: { deadline: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      toolboxLink: true,
      videoUrl: true,
      deadline: true,
      status: true,
      taskType: true,
    },
  });

  const now = new Date();
  return tasks.map((task) => ({
    ...task,
    isOverdue: task.status === "open" && task.deadline < now,
  }));
}

export async function getFamilyTaskProgress(
  familyId: string
): Promise<{ completed: number; total: number; percent: number }> {
  const total = await prisma.task.count({ where: { familyId } });
  const completed = await prisma.task.count({
    where: { familyId, status: "done" },
  });
  const percent = total > 0 ? (completed / total) * 100 : 0;
  return { completed, total, percent };
}
