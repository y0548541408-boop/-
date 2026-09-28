import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTaskReminderEmail } from "@/lib/email";

const REMINDER_COOLDOWN_HOURS = 48;
const LOOKAHEAD_DAYS = 3;

export async function sendDueTaskReminders(
  baseUrl: string
): Promise<{ sent: number; skipped: number }> {
  const now = new Date();
  const lookahead = new Date(now.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
  const cooldownCutoff = new Date(now.getTime() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000);

  const candidateTasks = await prisma.task.findMany({
    where: {
      status: "open",
      deadline: { lt: lookahead },
      family: { portalActive: true },
    },
    include: {
      family: { include: { members: true } },
      notifications: {
        where: { type: "task_reminder", sentAt: { gte: cooldownCutoff } },
      },
    },
  });

  const dueTasks = candidateTasks.filter((task) => task.notifications.length === 0);

  const tasksByFamily = new Map<string, typeof dueTasks>();
  for (const task of dueTasks) {
    const list = tasksByFamily.get(task.familyId) ?? [];
    list.push(task);
    tasksByFamily.set(task.familyId, list);
  }

  const admin = createAdminClient();
  let sent = 0;
  let skipped = 0;

  for (const tasks of tasksByFamily.values()) {
    const family = tasks[0].family;

    for (const member of family.members) {
      const { data, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: member.email,
        options: { redirectTo: `${baseUrl}/auth/confirm` },
      });

      if (linkError || !data) {
        skipped++;
        continue;
      }

      const result = await sendTaskReminderEmail({
        to: member.email,
        memberName: member.fullName,
        familyName: family.displayName,
        tasks: tasks.map((t) => ({
          title: t.title,
          deadline: t.deadline,
          isOverdue: t.deadline < now,
        })),
        actionLink: data.properties.action_link,
      });

      if ("error" in result) {
        skipped++;
        continue;
      }

      sent++;
    }

    await prisma.notificationLog.createMany({
      data: tasks.map((task) => ({
        familyId: task.familyId,
        channel: "email" as const,
        type: "task_reminder" as const,
        relatedTaskId: task.id,
      })),
    });
  }

  return { sent, skipped };
}
