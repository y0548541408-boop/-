"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";
import { createAdminClient, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";
import { analyzePensionReport, type PensionDraftItem } from "@/lib/gemini";
import { recordNetWorthSnapshot } from "@/lib/netWorth";
import { ASSET_GROUPS } from "@/lib/netWorthGroups";

export type PensionResult = { error: string } | { ok: true };
export type PensionDraft = { error: string } | { items: PensionDraftItem[] };

async function ownedFamily(familyId: string) {
  const advisor = await getCurrentAdvisor();
  if (!advisor) return null;
  return prisma.family.findFirst({ where: { id: familyId, advisorId: advisor.id } });
}

// Step 1: a one-time upload slot, so the PDF goes straight to storage.
export async function preparePensionUpload(input: { familyId: string; filename: string }): Promise<
  { error: string } | { bucket: string; path: string; token: string }
> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };
  if (!input.filename.toLowerCase().endsWith(".pdf")) return { error: "צריך קובץ PDF מהמסלקה." };

  const path = `${input.familyId}/pension/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
  const { data, error } = await createAdminClient().storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "לא הצלחתי להכין העלאה. נסה שוב." };
  return { bucket: DOCUMENTS_BUCKET, path, token: data.token };
}

// Step 2: read the uploaded report and return a draft. Nothing is saved yet.
export async function analyzePensionUpload(input: { familyId: string; path: string }): Promise<PensionDraft> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };
  if (!input.path.startsWith(`${input.familyId}/pension/`)) return { error: "נתיב לא תקין." };

  const { data, error } = await createAdminClient().storage.from(DOCUMENTS_BUCKET).download(input.path);
  if (error || !data) return { error: "לא הצלחתי לקרוא את הקובץ." };

  try {
    const items = await analyzePensionReport({ pdf: await data.arrayBuffer(), displayName: "pension-report" });
    if (items.length === 0) return { error: "לא מצאתי יתרות בדוח. בדוק שזה דוח מהמסלקה." };
    return { items };
  } catch (err) {
    return { error: err instanceof Error ? err.message.slice(0, 300) : "הניתוח נכשל." };
  }
}

// Step 3: only after the advisor approved the draft, the balances become assets.
export async function savePensionItems(input: {
  familyId: string;
  items: { name: string; group: string; value: number }[];
}): Promise<PensionResult> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };

  const rows = input.items
    .map((i) => ({ name: i.name.trim(), group: i.group, value: Math.round(i.value) }))
    .filter((i) => i.name && i.value > 0 && (ASSET_GROUPS as readonly string[]).includes(i.group));
  if (rows.length === 0) return { error: "אין פריטים לשמירה." };

  await prisma.netWorthItem.createMany({
    data: rows.map((r) => ({ familyId: input.familyId, kind: "asset" as const, group: r.group, name: r.name, value: r.value })),
  });
  await recordNetWorthSnapshot(input.familyId);
  revalidatePath(`/admin/families/${input.familyId}`);
  return { ok: true };
}
