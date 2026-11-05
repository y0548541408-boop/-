"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";

export async function createMortgageQuestionnaire(formData: FormData): Promise<void> {
  const advisor = await getCurrentAdvisor();
  if (!advisor) {
    console.error("createMortgageQuestionnaire: not an advisor");
    return;
  }

  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientPhone = String(formData.get("clientPhone") ?? "").trim();
  if (!clientName) return;

  await prisma.mortgageQuestionnaire.create({
    data: {
      advisorId: advisor.id,
      clientName,
      clientPhone: clientPhone || null,
      token: randomUUID(),
    },
  });

  revalidatePath("/admin/mortgage");
}

export async function deleteMortgageQuestionnaire(formData: FormData): Promise<void> {
  const advisor = await getCurrentAdvisor();
  if (!advisor) return;
  const id = String(formData.get("id") ?? "");
  await prisma.mortgageQuestionnaire.deleteMany({ where: { id, advisorId: advisor.id, status: "sent" } });
  revalidatePath("/admin/mortgage");
}
