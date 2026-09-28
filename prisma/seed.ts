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

  // Categories match Israel's real Excel tracker exactly (both names and
  // fixed/variable split), so the demo family looks like his real one.
  const categories: { name: string; type: "fixed" | "variable"; plannedAmount: number }[] = [
    { name: "הוצאות קבועות", type: "fixed", plannedAmount: 4500 },
    { name: "מעשרות", type: "fixed", plannedAmount: 1000 },
    { name: "החזרי חובות", type: "fixed", plannedAmount: 800 },
    { name: "חיסכון לשנתי", type: "fixed", plannedAmount: 500 },
    { name: "אוכל", type: "variable", plannedAmount: 2500 },
    { name: "אוכל בחוץ", type: "variable", plannedAmount: 600 },
    { name: "ביגוד והנעלה", type: "variable", plannedAmount: 400 },
    { name: "דלק רכב קו", type: "variable", plannedAmount: 500 },
    { name: "פנאי", type: "variable", plannedAmount: 300 },
    { name: "רכישות קטנות", type: "variable", plannedAmount: 200 },
    { name: "שונות (הוצאות)", type: "variable", plannedAmount: 200 },
  ];

  const oldPlaceholderNames = ["שכירות / משכנתא", "ביטוחים", "סופר", "מסעדות", "תחבורה"];
  await prisma.budgetCategory.updateMany({
    where: { familyId: family.id, name: { in: oldPlaceholderNames } },
    data: { isActive: false },
  });

  for (const category of categories) {
    await prisma.budgetCategory.upsert({
      where: { familyId_name: { familyId: family.id, name: category.name } },
      update: { isActive: true },
      create: { familyId: family.id, ...category },
    });
  }

  const incomeCategories: { name: string; plannedAmount: number }[] = [
    { name: "משכורת בעל", plannedAmount: 6000 },
    { name: "משכורת אשה", plannedAmount: 5000 },
    { name: "כולל", plannedAmount: 1500 },
    { name: "קצבת ילדים", plannedAmount: 700 },
    { name: "הורים", plannedAmount: 0 },
    { name: "שונות (הכנסות)", plannedAmount: 0 },
  ];

  for (const category of incomeCategories) {
    await prisma.incomeCategory.upsert({
      where: { familyId_name: { familyId: family.id, name: category.name } },
      update: {},
      create: { familyId: family.id, ...category },
    });
  }

  const meetingSummaries: {
    title: string;
    meetingDate: Date;
    summary: string;
    nextFocus: string | null;
  }[] = [
    {
      title: "פגישה 1 - מיפוי הוצאות",
      meetingDate: new Date("2026-09-05"),
      summary:
        "עברנו יחד על כל ההוצאות הקבועות והמשתנות של המשפחה, ובנינו יחד את התקציב החודשי הראשון. זיהינו שההוצאה על מסעדות גבוהה משמעותית מהתכנון המקורי.",
      nextFocus:
        "בפגישה הבאה נתמקד בהגדלת ההכנסה: נבדוק מיצוי זכויות (מענק עבודה, הנחת ארנונה) ואפשרויות להכנסה נוספת.",
    },
    {
      title: "פגישה 2 - הגדלת הכנסה ומיצוי זכויות",
      meetingDate: new Date("2026-09-19"),
      summary:
        "בדקנו זכאות למענק עבודה ולהנחת ארנונה, ומילאנו יחד את הטפסים הנדרשים. דיברנו גם על אפשרות להיקף משרה נוסף.",
      nextFocus:
        "בפגישה הבאה נתחיל לבנות את קרן החירום: נגדיר יעד חיסכון חודשי ונבחר את המסלול המתאים.",
    },
  ];

  for (const meeting of meetingSummaries) {
    const existing = await prisma.meetingSummary.findFirst({
      where: { familyId: family.id, title: meeting.title },
    });
    if (!existing) {
      await prisma.meetingSummary.create({
        data: { familyId: family.id, ...meeting },
      });
    }
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
    "Seeded advisor + test family + family member + budget/income categories + meeting summaries + onboarding lead."
  );
}

main().finally(() => prisma.$disconnect());
