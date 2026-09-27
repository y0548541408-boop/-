"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";
import { createAdminClient, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";

async function assertFamilyOwnedByAdvisor(familyId: string) {
  const advisor = await getCurrentAdvisor();
  if (!advisor) return { error: "יש להתחבר מחדש." as const, advisor: null };

  const family = await prisma.family.findFirst({
    where: { id: familyId, advisorId: advisor.id },
  });
  if (!family) return { error: "משפחה לא נמצאה." as const, advisor: null };

  return { error: null, advisor };
}

export async function uploadDocument(formData: FormData): Promise<void> {
  const familyId = String(formData.get("familyId") ?? "");
  const tag = String(formData.get("tag") ?? "").trim();
  const file = formData.get("file");

  const { error: ownError } = await assertFamilyOwnedByAdvisor(familyId);
  if (ownError) {
    console.error("uploadDocument:", ownError);
    return;
  }

  if (!(file instanceof File) || file.size === 0 || !tag) {
    console.error("uploadDocument: missing file or tag");
    return;
  }

  const admin = createAdminClient();
  const storagePath = `${familyId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined });

  if (uploadError) {
    console.error("uploadDocument storage error:", uploadError.message);
    return;
  }

  await prisma.document.create({
    data: {
      familyId,
      filename: file.name,
      tag,
      storagePath,
      status: "cleared",
    },
  });

  revalidatePath(`/admin/families/${familyId}`);
}

export async function getDocumentUrl(
  familyId: string,
  storagePath: string
): Promise<string | null> {
  const { error: ownError } = await assertFamilyOwnedByAdvisor(familyId);
  if (ownError) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 60 * 10);

  if (error) return null;
  return data.signedUrl;
}

export async function addMeetingSummary(formData: FormData): Promise<void> {
  const familyId = String(formData.get("familyId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const meetingDate = String(formData.get("meetingDate") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  const nextFocus = String(formData.get("nextFocus") ?? "").trim();

  const { error: ownError } = await assertFamilyOwnedByAdvisor(familyId);
  if (ownError) {
    console.error("addMeetingSummary:", ownError);
    return;
  }

  if (!title || !meetingDate || !summary) {
    console.error("addMeetingSummary: missing required field");
    return;
  }

  await prisma.meetingSummary.create({
    data: {
      familyId,
      title,
      meetingDate: new Date(meetingDate),
      summary,
      nextFocus: nextFocus || null,
    },
  });

  revalidatePath(`/admin/families/${familyId}`);
  revalidatePath("/dashboard");
}

export async function toggleFamilyDebt(formData: FormData): Promise<void> {
  const familyId = String(formData.get("familyId") ?? "");
  const nextValue = String(formData.get("nextValue") ?? "") === "true";

  const { error: ownError } = await assertFamilyOwnedByAdvisor(familyId);
  if (ownError) {
    console.error("toggleFamilyDebt:", ownError);
    return;
  }

  await prisma.family.update({
    where: { id: familyId },
    data: { hasDebt: nextValue },
  });

  revalidatePath(`/admin/families/${familyId}`);
  revalidatePath("/admin");
}

export async function addTask(formData: FormData): Promise<void> {
  const familyId = String(formData.get("familyId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "");
  const taskType = String(formData.get("taskType") ?? "habit");
  const toolboxLink = String(formData.get("toolboxLink") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  const savingsAmountAnnual = String(formData.get("savingsAmountAnnual") ?? "").trim();

  const { error: ownError } = await assertFamilyOwnedByAdvisor(familyId);
  if (ownError) {
    console.error("addTask:", ownError);
    return;
  }

  if (!title || !deadline) {
    console.error("addTask: missing required field");
    return;
  }

  await prisma.task.create({
    data: {
      familyId,
      title,
      description: description || null,
      deadline: new Date(deadline),
      taskType: taskType === "savings" ? "savings" : "habit",
      toolboxLink: toolboxLink || null,
      videoUrl: videoUrl || null,
      savingsAmountAnnual:
        taskType === "savings" && savingsAmountAnnual
          ? savingsAmountAnnual
          : null,
    },
  });

  revalidatePath(`/admin/families/${familyId}`);
  revalidatePath("/dashboard");
}
