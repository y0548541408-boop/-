"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";
import { createAdminClient, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";

export type ArchiveResult = { error: string } | { ok: true };

async function ownedFamily(familyId: string) {
  const advisor = await getCurrentAdvisor();
  if (!advisor) return null;
  return prisma.family.findFirst({ where: { id: familyId, advisorId: advisor.id } });
}

// Archiving hides the client from the main list. Nothing is deleted, and the
// client can still sign in; the family can be restored at any time.
export async function archiveFamily(input: { familyId: string }): Promise<ArchiveResult> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };
  await prisma.family.update({ where: { id: input.familyId }, data: { archivedAt: new Date() } });
  revalidatePath("/admin");
  revalidatePath(`/admin/families/${input.familyId}`);
  return { ok: true };
}

export async function restoreFamily(input: { familyId: string }): Promise<ArchiveResult> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };
  await prisma.family.update({ where: { id: input.familyId }, data: { archivedAt: null } });
  revalidatePath("/admin");
  revalidatePath(`/admin/families/${input.familyId}`);
  return { ok: true };
}

// Form-friendly wrappers, so the clients list can use plain buttons.
export async function archiveFromForm(formData: FormData): Promise<void> {
  await archiveFamily({ familyId: String(formData.get("familyId") ?? "") });
}

export async function restoreFromForm(formData: FormData): Promise<void> {
  await restoreFamily({ familyId: String(formData.get("familyId") ?? "") });
}

// Permanent delete. Only for an archived family, and only when the advisor types
// the family's exact name. Removes the family's files from storage too.
export async function deleteFamilyPermanently(input: { familyId: string; confirmName: string }): Promise<ArchiveResult> {
  const family = await ownedFamily(input.familyId);
  if (!family) return { error: "יש להתחבר מחדש." };
  if (!family.archivedAt) return { error: "קודם מעבירים את המשפחה לארכיון." };
  if (input.confirmName.trim() !== family.displayName.trim()) {
    return { error: "השם שהוקלד לא זהה לשם המשפחה. לא נמחק כלום." };
  }

  const [documents, recordings] = await Promise.all([
    prisma.document.findMany({ where: { familyId: family.id }, select: { storagePath: true } }),
    prisma.meetingRecording.findMany({ where: { familyId: family.id }, select: { storagePath: true } }),
  ]);
  const paths = [...documents.map((d) => d.storagePath), ...recordings.map((r) => r.storagePath)];

  const admin = createAdminClient();
  if (paths.length > 0) {
    await admin.storage.from(DOCUMENTS_BUCKET).remove(paths);
  }
  // Pension reports are stored without a database row, so list that folder too.
  const { data: pensionFiles } = await admin.storage.from(DOCUMENTS_BUCKET).list(`${family.id}/pension`);
  if (pensionFiles && pensionFiles.length > 0) {
    await admin.storage.from(DOCUMENTS_BUCKET).remove(pensionFiles.map((f) => `${family.id}/pension/${f.name}`));
  }

  await prisma.family.delete({ where: { id: family.id } });
  revalidatePath("/admin");
  return { ok: true };
}
