"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";
import { sendClientQuestionnaireEmail } from "@/lib/email";
import { getQuestionnaire, isKind } from "@/lib/questionnaires";

export type SendQuestionnaireResult =
  | { error: string }
  | { ok: true; sent: number; failed: number; link: string };

const ISRAEL = "Asia/Jerusalem";

// The form gives a date and time in Israel with no zone. Turn it into a real moment,
// whatever the server's own zone is.
function israelToDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ISRAEL,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const shown = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
  return new Date(guess - (shown - guess));
}

function meetingLabel(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: ISRAEL,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// Creates a questionnaire for the family and emails it to each family member who has
// an email address. The client fills it through the link, with no login.
export async function sendQuestionnaireToFamily(formData: FormData): Promise<SendQuestionnaireResult> {
  const advisor = await getCurrentAdvisor();
  if (!advisor) return { error: "יש להתחבר מחדש." };

  const familyId = String(formData.get("familyId") ?? "");
  const kindRaw = String(formData.get("kind") ?? "");
  const meetingRaw = String(formData.get("meetingAt") ?? "").trim();
  const meetingPlace = String(formData.get("meetingPlace") ?? "").trim().slice(0, 200);
  if (!isKind(kindRaw)) return { error: "בחרו סוג שאלון." };

  const meetingAt = meetingRaw ? israelToDate(meetingRaw) : null;
  if (meetingRaw && !meetingAt) return { error: "תאריך הפגישה לא תקין." };

  const family = await prisma.family.findFirst({
    where: { id: familyId, advisorId: advisor.id, archivedAt: null },
    include: { members: { orderBy: { createdAt: "asc" } } },
  });
  if (!family) return { error: "המשפחה לא נמצאה." };

  // One email per address, so a shared inbox does not get the link twice.
  const seen = new Set<string>();
  const recipients = family.members.filter((m) => {
    const address = m.email?.trim().toLowerCase();
    if (!address || seen.has(address)) return false;
    seen.add(address);
    return true;
  });
  if (recipients.length === 0) {
    return { error: "אין מייל לאף אחד מבני המשפחה. מוסיפים מייל בגישה לאזור האישי, ואז שולחים שוב." };
  }

  const primary = family.members.find((m) => m.role === "primary") ?? family.members[0];
  const token = randomUUID();
  await prisma.mortgageQuestionnaire.create({
    data: {
      advisorId: advisor.id,
      familyId: family.id,
      kind: kindRaw,
      clientName: primary?.fullName ?? family.displayName,
      clientPhone: primary?.phone ?? null,
      token,
      meetingAt,
      meetingPlace: meetingPlace || null,
    },
  });

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const link = `${proto}://${host}/q/${token}`;

  const questionnaire = getQuestionnaire(kindRaw);
  const label = meetingAt ? meetingLabel(meetingAt) : null;
  const paragraphs =
    kindRaw === "finance"
      ? [
          "שמח מאוד שבחרתם להצטרף לליווי הכלכלי. ההחלטה לנהל את הכסף בצורה מודעת ומתוכננת היא צעד שמשתלם לאורך זמן, וכאן מתחילים לבנות את הצמיחה שלכם.",
          "כדי שנוכל להפיק את המקסימום כבר מהפגישה הראשונה, אשמח שתמלאו את שאלון ההיכרות והמיפוי. בשאלון נבין את התמונה הכלכלית שלכם: מה יש לכם, מה המטרות, ומה הסיכון שמתאים לכם. אם יש מסמכים שכדאי לצרף, השאלון יפרט אותם.",
          "קבלת הנתונים מראש תאפשר לי לבחון לעומק את האפשרויות לפני שנפגשים. כך בפגישה נוכל להתמקד באסטרטגיה ובתוכנית שמתאימה לכם, במקום לבזבז זמן על איסוף פרטים.",
        ]
      : [`לקראת הפגישה שלנו אשמח שתמלאו את השאלון. ${questionnaire.welcome}`];

  // Each send is separate: one bad address must not stop the others.
  let sent = 0;
  let failed = 0;
  for (const member of recipients) {
    const firstName = member.fullName.trim().split(/\s+/)[0] ?? member.fullName;
    const result = await sendClientQuestionnaireEmail({
      to: member.email!.trim(),
      firstName,
      title: questionnaire.title,
      paragraphs,
      link,
      meetingLabel: label,
      meetingPlace: meetingPlace || null,
    }).catch((e: unknown) => ({ error: String(e) }));
    if ("error" in result) {
      failed++;
      console.error("sendQuestionnaireToFamily email:", result.error);
    } else {
      sent++;
    }
  }

  revalidatePath(`/admin/families/${family.id}`);
  return { ok: true, sent, failed, link };
}
