"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendMortgageSubmittedEmail } from "@/lib/email";
import type { MortgageResponses, Row, Tables, Values } from "@/lib/mortgageQuestionnaire";

type ActionResult = { error: string } | { ok: true };

const MAX_TEXT = 2000;
const MAX_ROWS = 30;

function cleanValues(input: unknown): Values {
  const out: Values = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof value !== "string" || key.length > 80) continue;
    const trimmed = value.trim().slice(0, MAX_TEXT);
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

function cleanTables(input: unknown): Tables {
  const out: Tables = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, rows] of Object.entries(input as Record<string, unknown>)) {
    if (!Array.isArray(rows)) continue;
    const cleaned: Row[] = rows
      .slice(0, MAX_ROWS)
      .map((row) => cleanValues(row))
      .filter((row) => Object.keys(row).length > 0);
    if (cleaned.length) out[key] = cleaned;
  }
  return out;
}

export async function submitMortgageQuestionnaire(token: string, data: MortgageResponses): Promise<ActionResult> {
  const questionnaire = await prisma.mortgageQuestionnaire.findUnique({
    where: { token },
    include: { advisor: true },
  });
  if (!questionnaire) return { error: "הקישור לא תקין. פנו לישראל שרמן ובקשו קישור חדש." };

  const responses: MortgageResponses = {
    version: 1,
    borrowers: data?.borrowers === 2 ? 2 : 1,
    values: cleanValues(data?.values),
    tables: cleanTables(data?.tables),
  };

  if (!responses.values["b1.fullName"]) return { error: "צריך למלא את השם המלא של הלווה הראשון." };

  await prisma.mortgageQuestionnaire.update({
    where: { id: questionnaire.id },
    data: { responses, status: "submitted", submittedAt: new Date() },
  });

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const reportLink = `${proto}://${host}/admin/mortgage/${questionnaire.id}`;

  // The answers are already saved; a failed notification must not fail the client's submit.
  const mail = await sendMortgageSubmittedEmail({
    to: questionnaire.advisor.email,
    clientName: responses.values["b1.fullName"] || questionnaire.clientName,
    reportLink,
  }).catch((e: unknown) => ({ error: String(e) }));
  if ("error" in mail) console.error("submitMortgageQuestionnaire email:", mail.error);

  return { ok: true };
}
