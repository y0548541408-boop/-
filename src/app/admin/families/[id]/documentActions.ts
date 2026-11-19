"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";
import { createAdminClient, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";

export type DocumentResult = { error: string } | { ok: true };
export type DocumentUploadSlot = { error: string } | { bucket: string; path: string; token: string };

async function ownedFamily(familyId: string) {
  const advisor = await getCurrentAdvisor();
  if (!advisor) return null;
  return prisma.family.findFirst({ where: { id: familyId, advisorId: advisor.id } });
}

// Step 1: a one-time upload slot. The file goes straight to storage, not through
// the server, so large scans are not cut off by the request size limit.
export async function prepareDocumentUpload(input: {
  familyId: string;
  filename: string;
  tag: string;
}): Promise<DocumentUploadSlot> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };
  if (!input.tag.trim()) return { error: "צריך לכתוב תגית למסמך." };
  if (!input.filename.trim()) return { error: "לא נבחר קובץ." };

  const path = `${input.familyId}/${Date.now()}-${input.filename}`;
  const { data, error } = await createAdminClient().storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "לא הצלחתי להכין העלאה. נסה שוב." };
  return { bucket: DOCUMENTS_BUCKET, path, token: data.token };
}

// Step 2: the file is in storage. Record it, so it shows in the family's list.
export async function confirmDocumentUpload(input: {
  familyId: string;
  path: string;
  filename: string;
  tag: string;
}): Promise<DocumentResult> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };
  if (!input.path.startsWith(`${input.familyId}/`)) return { error: "נתיב לא תקין." };

  await prisma.document.create({
    data: {
      familyId: input.familyId,
      filename: input.filename,
      tag: input.tag.trim(),
      storagePath: input.path,
      status: "cleared",
    },
  });
  revalidatePath(`/admin/families/${input.familyId}`);
  return { ok: true };
}
