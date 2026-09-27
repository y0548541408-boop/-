"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ActionResult = { error: string } | { ok: true };

export async function submitOnboarding(
  token: string,
  data: Record<string, string | string[]>
): Promise<ActionResult> {
  const contactName = data.contactName;
  const contactPhone = data.contactPhone;
  if (typeof contactName !== "string" || !contactName.trim()) {
    return { error: "יש להזין שם מלא." };
  }
  if (typeof contactPhone !== "string" || !contactPhone.trim()) {
    return { error: "יש להזין מספר טלפון." };
  }

  const family = await prisma.family.findUnique({ where: { onboardingToken: token } });
  if (!family) return { error: "הקישור אינו תקין. פנו ליועץ שלכם." };

  await prisma.onboardingQuestionnaire.create({
    data: {
      familyId: family.id,
      responses: data as Prisma.InputJsonValue,
    },
  });

  return { ok: true };
}
