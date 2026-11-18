"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";
import { createAdminClient, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";
import { analyzeFamilyDocuments } from "@/lib/gemini";

export type InsightResult = { error: string } | { ok: true; count: number; skipped: number };

// File types the AI can read directly. Anything else is skipped and counted.
const READABLE: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const MAX_FILES = 12;

async function ownedFamily(familyId: string) {
  const advisor = await getCurrentAdvisor();
  if (!advisor) return null;
  return prisma.family.findFirst({ where: { id: familyId, advisorId: advisor.id } });
}

// Reads the family's documents and stores what the AI found, for the advisor only.
// Earlier insights that the advisor has not dismissed are replaced by the new run.
export async function generateInsights(input: { familyId: string }): Promise<InsightResult> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };

  const docs = await prisma.document.findMany({
    where: { familyId: input.familyId },
    orderBy: { createdAt: "desc" },
  });

  const readable = docs.filter((d) => {
    const ext = d.filename.split(".").pop()?.toLowerCase() ?? "";
    return !d.isPasswordProtected && READABLE[ext];
  });
  const skipped = docs.length - readable.length;
  if (readable.length === 0) return { error: "אין מסמכים שאפשר לנתח (PDF או תמונה, בלי סיסמה)." };

  const admin = createAdminClient();
  const files: { name: string; mimeType: string; data: ArrayBuffer }[] = [];
  for (const doc of readable.slice(0, MAX_FILES)) {
    const ext = doc.filename.split(".").pop()?.toLowerCase() ?? "";
    const { data, error } = await admin.storage.from(DOCUMENTS_BUCKET).download(doc.storagePath);
    if (error || !data) continue;
    files.push({ name: doc.filename, mimeType: READABLE[ext], data: await data.arrayBuffer() });
  }
  if (files.length === 0) return { error: "לא הצלחתי לקרוא את המסמכים. נסה שוב." };

  let drafts;
  try {
    drafts = await analyzeFamilyDocuments({ files });
  } catch (err) {
    return { error: err instanceof Error ? err.message.slice(0, 300) : "הניתוח נכשל." };
  }

  await prisma.$transaction([
    prisma.advisorInsight.deleteMany({ where: { familyId: input.familyId, dismissed: false } }),
    prisma.advisorInsight.createMany({
      data: drafts.map((d) => ({
        familyId: input.familyId,
        severity: d.severity,
        title: d.title,
        detail: d.detail,
      })),
    }),
  ]);

  revalidatePath(`/admin/families/${input.familyId}`);
  return { ok: true, count: drafts.length, skipped };
}

export async function dismissInsight(input: { familyId: string; id: string }): Promise<InsightResult> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };
  await prisma.advisorInsight.updateMany({
    where: { id: input.id, familyId: input.familyId },
    data: { dismissed: true },
  });
  revalidatePath(`/admin/families/${input.familyId}`);
  return { ok: true, count: 0, skipped: 0 };
}
