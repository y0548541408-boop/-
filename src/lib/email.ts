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
    <div dir="rtl" style="font-family:Georgia,'Times New Roman',serif;max-width:480px;margin:0 auto;padding:8px;">
      <div style="font-size:15px;font-weight:700;color:#1B4D3E;margin-bottom:20px;">כלכלת המשפחה</div>
      <p style="font-family:Arial,sans-serif;color:#374151;font-size:15px;">שלום ${input.memberName},</p>
      <p style="font-family:Arial,sans-serif;color:#374151;font-size:15px;">רגע לפני שממשיכים ביום — הנה מה שעדיין פתוח אצלכם:</p>
      <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">${taskRows}</table>
      <p style="margin-top:24px;">
        <a href="${input.actionLink}"
           style="font-family:Arial,sans-serif;background:#1B4D3E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-size:14px;">
          כניסה לאזור האישי
        </a>
      </p>
      <p style="font-family:Arial,sans-serif;color:#9CA3AF;font-size:12.5px;margin-top:28px;">בהצלחה,<br/>כלכלת המשפחה</p>
    </div>`;

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: `תזכורת קטנה: ${input.tasks.length} משימות מחכות לך`,
    html,
  });

  if (error) return { error: error.message };
  return { ok: true };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Sent to the advisor when a client submits the pre-consultation mortgage
// questionnaire. Colors follow the brand guide (green #1F5F5B, accent #C8734A).
export async function sendMortgageSubmittedEmail(input: {
  to: string;
  clientName: string;
  reportLink: string;
}): Promise<{ ok: true } | { error: string }> {
  const name = escapeHtml(input.clientName);
  const html = `
    <div dir="rtl" style="background:#F7F2E8;padding:24px 8px;">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;font-family:Arial,sans-serif;color:#1B2B2A;">
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1F5F5B;">שרמן</div>
        <div style="font-size:12px;color:#C8734A;margin-bottom:22px;">משכנתאות וכלכלת המשפחה</div>
        <p style="font-size:16px;margin:0 0 8px;"><strong>${name}</strong> מילא/ה את השאלון לפני ייעוץ המשכנתא.</p>
        <p style="font-size:14px;color:#1B2B2A;opacity:.75;margin:0 0 22px;">הדוח המפורט מחכה לך: תמונת מצב, נקודות לתשומת לב, וכל התשובות.</p>
        <a href="${input.reportLink}" style="background:#1F5F5B;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;display:inline-block;font-size:14px;font-weight:600;">לצפייה בדוח</a>
        <p style="font-family:Georgia,serif;color:#C8734A;font-size:14px;margin-top:28px;">חותמים בראש שקט.</p>
      </div>
    </div>`;

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: `שאלון משכנתא חדש: ${input.clientName}`,
    html,
  });

  if (error) return { error: error.message };
  return { ok: true };
}
