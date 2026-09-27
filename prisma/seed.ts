import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const advisor = await prisma.advisor.upsert({
    where: { email: "y0548541408@gmail.com" },
    update: {},
    create: {
      fullName: "ישראל שרמן",
      email: "y0548541408@gmail.com",
    },
  });

  const family = await prisma.family.upsert({
    where: { onboardingToken: "test-family" },
    update: {},
    create: {
      advisorId: advisor.id,
      displayName: "משפחת בדיקה",
      status: "active",
      onboardingToken: "test-family",
      portalActive: true,
    },
  });

  await prisma.familyMember.upsert({
    where: {
      familyId_email: { familyId: family.id, email: "y0548541408@gmail.com" },
    },
    update: {},
    create: {
      familyId: family.id,
      fullName: "ישראל (בדיקה)",
      email: "y0548541408@gmail.com",
      role: "primary",
    },
  });

  const categories: { name: string; type: "fixed" | "variable"; plannedAmount: number }[] = [
    { name: "שכירות / משכנתא", type: "fixed", plannedAmount: 4500 },
    { name: "ביטוחים", type: "fixed", plannedAmount: 800 },
    { name: "סופר", type: "variable", plannedAmount: 2500 },
    { name: "מסעדות", type: "variable", plannedAmount: 600 },
    { name: "תחבורה", type: "variable", plannedAmount: 500 },
  ];

  for (const category of categories) {
    await prisma.budgetCategory.upsert({
      where: { familyId_name: { familyId: family.id, name: category.name } },
      update: {},
      create: { familyId: family.id, ...category },
    });
  }

  await prisma.family.upsert({
    where: { onboardingToken: "demo-onboarding" },
    update: {},
    create: {
      advisorId: advisor.id,
      displayName: "משפחת לוי (ליד לדוגמה)",
      status: "onboarding",
      onboardingToken: "demo-onboarding",
      portalActive: false,
    },
  });

  console.log(
    "Seeded advisor + test family + family member + budget categories + onboarding lead."
  );
}

main().finally(() => prisma.$disconnect());
