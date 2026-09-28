import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// clalatmishpaha.com verified in Resend on 2026-09-28 — can now deliver to
// any recipient, not just the account owner. The Supabase Auth SMTP sender
// (login-code emails) is configured separately in the Supabase dashboard
// and needs the same domain update there.
const FROM_ADDRESS = "כלכלת המשפחה <noreply@clalatmishpaha.com>";

export async function sendTaskReminderEmail(input: {
  to: string;
  memberName: string;
  familyName: string;
  tasks: { title: string; deadline: Date; isOverdue: boolean }[];
  actionLink: string;
}): Promise<{ ok: true } | { error: string }> {
  const taskRows = input.tasks
    .map(
      (task) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">
            <strong>${task.title}</strong><br />
            <span style="color:${task.isOverdue ? "#dc2626" : "#6b7280"};font-size:13px;">
              ${task.isOverdue ? "באיחור · " : "עד "}${task.deadline.toLocaleDateString("he-IL")}
            </span>
          </td>
        </tr>`
    )
    .join("");

  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
      <h2 style="color:#1E2A45;">שלום ${input.memberName},</h2>
      <p style="color:#374151;">יש לך ${input.tasks.length} משימות פתוחות במשפחת ${input.familyName}:</p>
      <table style="width:100%;border-collapse:collapse;">${taskRows}</table>
      <p style="margin-top:24px;">
        <a href="${input.actionLink}"
           style="background:#1E2A45;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
          כניסה לאזור האישי לעדכון
        </a>
      </p>
    </div>`;

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: `תזכורת: ${input.tasks.length} משימות פתוחות בכלכלת המשפחה`,
    html,
  });

  if (error) return { error: error.message };
  return { ok: true };
}
