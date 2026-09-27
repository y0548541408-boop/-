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

  console.log("Seeded advisor + test family + family member.");
}

main().finally(() => prisma.$disconnect());
