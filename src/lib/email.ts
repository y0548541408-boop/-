import { Resend } from "resend";
import type { Digest } from "./questionnaireDigest";

const resend = new Resend(process.env.RESEND_API_KEY);

// clalatmishpaha.com verified in Resend on 2026-09-28 — can now deliver to
// any recipient, not just the account owner. The Supabase Auth SMTP sender
// (login-code emails) is configured separately in the Supabase dashboard
// and needs the same domain update there.
const FROM_ADDRESS = "שרמן משכנתאות וכלכלת המשפחה <noreply@clalatmishpaha.com>";

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
            <strong>${escapeHtml(task.title)}</strong><br />
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
      <p style="font-family:Arial,sans-serif;color:#374151;font-size:15px;">שלום ${escapeHtml(input.memberName)},</p>
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

// Sent to a client (each family member with an email) with the questionnaire link
// and the details of the meeting it prepares for.
export async function sendClientQuestionnaireEmail(input: {
  to: string;
  firstName: string;
  title: string;
  paragraphs: string[];
  link: string;
  meetingLabel: string | null;
  meetingPlace: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const meetingRows = [
    input.meetingLabel ? `<tr><td style="padding:6px 0;color:#6b7280;">מועד הפגישה</td><td style="padding:6px 0;"><strong>${escapeHtml(input.meetingLabel)}</strong></td></tr>` : "",
    input.meetingPlace ? `<tr><td style="padding:6px 0;color:#6b7280;">מיקום</td><td style="padding:6px 0;"><strong>${escapeHtml(input.meetingPlace)}</strong></td></tr>` : "",
  ].join("");
  const meetingBox = meetingRows
    ? `<table style="width:100%;border-collapse:collapse;background:#F7F2E8;border-radius:10px;padding:8px 14px;margin:0 0 22px;">${meetingRows}</table>`
    : `<p style="font-size:14px;color:#1B2B2A;margin:0 0 22px;">את מועד הפגישה נקבע יחד בהמשך.</p>`;

  const html = `
    <div dir="rtl" style="background:#F7F2E8;padding:24px 8px;">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;font-family:Arial,sans-serif;color:#1B2B2A;">
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1F5F5B;">שרמן</div>
        <div style="font-size:12px;color:#A35530;margin-bottom:22px;">משכנתאות וכלכלת המשפחה</div>
        <p style="font-size:16px;margin:0 0 10px;">שלום ${escapeHtml(input.firstName)},</p>
        ${input.paragraphs.map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 18px;">${escapeHtml(p)}</p>`).join("")}
        ${meetingBox}
        <p style="font-size:15px;margin:0 0 22px;">אפשר לעצור באמצע השאלון ולהמשיך אחר כך.</p>
        <a href="${input.link}" style="background:#1F5F5B;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;display:inline-block;font-size:14px;font-weight:600;">למילוי השאלון</a>
        <p style="font-size:13px;color:#6b7280;margin-top:22px;">הקישור אישי לכם. לא צריך סיסמה, ואין צורך להירשם.</p>
        <p style="font-family:Georgia,serif;color:#A35530;font-size:14px;margin-top:24px;">נתראה בפגישה.</p>
      </div>
    </div>`;

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: `${input.title}: לקראת הפגישה`,
    html,
  });

  if (error) return { error: error.message };
  return { ok: true };
}

// Sent to the advisor when a client submits a questionnaire (mortgage or coaching). Colors follow the brand guide (green #1F5F5B, accent #C8734A).
export async function sendQuestionnaireSubmittedEmail(input: {
  title: string;
  to: string;
  clientName: string;
  reportLink: string;
  digest?: Digest;
}): Promise<{ ok: true } | { error: string }> {
  const name = escapeHtml(input.clientName);
  const d = input.digest;
  const section = (heading: string, body: string) =>
    body
      ? `<div style="margin:0 0 18px;"><div style="font-size:13px;font-weight:700;color:#1F5F5B;margin-bottom:6px;">${heading}</div>${body}</div>`
      : "";
  const rowsHtml = (items: { label: string; value: string }[]) =>
    `<table style="width:100%;border-collapse:collapse;font-size:14px;">${items
      .map(
        (r) =>
          `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;color:#6b7280;">${escapeHtml(r.label)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:left;"><strong>${escapeHtml(r.value)}</strong></td></tr>`
      )
      .join("")}</table>`;
  const digestHtml = d
    ? [
        section("פרטי קשר", d.contacts.length ? rowsHtml(d.contacts) : ""),
        section("המספרים", d.figures.length ? rowsHtml(d.figures) : ""),
        section(
          "נקודות לתשומת לב",
          d.insights.length
            ? `<ul style="margin:0;padding-right:18px;font-size:14px;line-height:1.6;">${d.insights.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
            : ""
        ),
        section(
          "במילים שלהם",
          d.notes.map((n) => `<p style="margin:0 0 8px;font-size:14px;line-height:1.6;"><span style="color:#6b7280;">${escapeHtml(n.label)}:</span> ${escapeHtml(n.text)}</p>`).join("")
        ),
      ].join("")
    : "";
  const html = `
    <div dir="rtl" style="background:#F7F2E8;padding:24px 8px;">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;font-family:Arial,sans-serif;color:#1B2B2A;">
        <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#1F5F5B;">שרמן</div>
        <div style="font-size:12px;color:#A35530;margin-bottom:22px;">משכנתאות וכלכלת המשפחה</div>
        <p style="font-size:16px;margin:0 0 8px;"><strong>${name}</strong> מילא/ה את ה${escapeHtml(input.title)}.</p>
        ${digestHtml}
        <p style="font-size:14px;color:#1B2B2A;opacity:.85;margin:0 0 22px;">הדוח המלא מחכה לך: כל התשובות, תמונת מצב וחישובים.</p>
        <a href="${input.reportLink}" style="background:#1F5F5B;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;display:inline-block;font-size:14px;font-weight:600;">לצפייה בדוח</a>
        <p style="font-family:Georgia,serif;color:#A35530;font-size:14px;margin-top:28px;">חותמים בראש שקט.</p>
      </div>
    </div>`;

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: `${input.title}: ${input.clientName}`,
    html,
  });

  if (error) return { error: error.message };
  return { ok: true };
}
