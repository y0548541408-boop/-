"use server";

import { prisma } from "@/lib/prisma";

export type OnboardingResponses = {
  fullName: string;
  phone: string;
  spouseName: string;
  childrenCount: number;
  incomeSelf: number;
  incomeSpouse: number;
  incomeOther: number;
  rentOrMortgage: number;
  loanPayments: number;
  creditCardDebt: number;
  hasEmergencyFund: boolean;
  emergencyFundAmount: number | null;
  mainGoal: string;
  biggestConcern: string;
};

type ActionResult = { error: string } | { ok: true };

export async function submitOnboarding(
  token: string,
  data: OnboardingResponses
): Promise<ActionResult> {
  if (!data.fullName.trim()) return { error: "יש להזין שם מלא." };
  if (!data.phone.trim()) return { error: "יש להזין מספר טלפון." };

  const family = await prisma.family.findUnique({ where: { onboardingToken: token } });
  if (!family) return { error: "הקישור אינו תקין. פנו ליועץ שלכם." };

  await prisma.onboardingQuestionnaire.create({
    data: {
      familyId: family.id,
      responses: data,
    },
  });

  return { ok: true };
}
