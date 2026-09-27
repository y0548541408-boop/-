"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";

async function assertLeadOwnedByAdvisor(leadId: string) {
  const advisor = await getCurrentAdvisor();
  if (!advisor) return { error: "יש להתחבר מחדש." as const, advisor: null };

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, advisorId: advisor.id },
  });
  if (!lead) return { error: "ליד לא נמצא." as const, advisor: null };

  return { error: null, advisor, lead };
}

export async function createLead(formData: FormData): Promise<void> {
  const advisor = await getCurrentAdvisor();
  if (!advisor) {
    console.error("createLead: not an advisor");
    return;
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName || !email) {
    console.error("createLead: missing required field");
    return;
  }

  await prisma.lead.create({
    data: {
      advisorId: advisor.id,
      fullName,
      email,
      phone: phone || null,
    },
  });

  revalidatePath("/admin/leads");
}

export async function updateLeadStatus(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const status = String(formData.get("status") ?? "");

  const { error: ownError } = await assertLeadOwnedByAdvisor(leadId);
  if (ownError) {
    console.error("updateLeadStatus:", ownError);
    return;
  }

  const validStatuses = ["new", "contacted", "scheduled", "converted", "lost"];
  if (!validStatuses.includes(status)) {
    console.error("updateLeadStatus: invalid status");
    return;
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: status as "new" | "contacted" | "scheduled" | "converted" | "lost" },
  });

  revalidatePath("/admin/leads");
}

export async function convertLeadToFamily(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");

  const { error: ownError, advisor, lead } = await assertLeadOwnedByAdvisor(leadId);
  if (ownError || !advisor || !lead) {
    console.error("convertLeadToFamily:", ownError);
    return;
  }

  const family = await prisma.family.create({
    data: {
      advisorId: advisor.id,
      displayName: lead.fullName,
      status: "onboarding",
      onboardingToken: randomUUID(),
    },
  });

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "converted" },
  });

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  redirect(`/admin/families/${family.id}`);
}
