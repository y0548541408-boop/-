"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";

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
