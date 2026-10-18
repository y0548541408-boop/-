import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentFamilyMember } from "@/lib/currentMember";
import { ensureDefaultCategories, familyHasNoCategories } from "@/lib/defaultCategories";
import { Logo } from "@/components/Logo";
import WelcomeFlow from "./WelcomeFlow";

export default async function WelcomePage() {
  const member = await getCurrentFamilyMember();
  if (!member) redirect("/login");
  if (member.family.welcomedAt) redirect("/dashboard");

  if (await familyHasNoCategories(member.familyId)) {
    await ensureDefaultCategories(member.familyId);
  }

  const [incomeCategories, expenseCategories] = await Promise.all([
    prisma.incomeCategory.findMany({
      where: { familyId: member.familyId, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.budgetCategory.findMany({
      where: { familyId: member.familyId, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-16 pt-6 text-ru-ink">
      <div className="mx-auto max-w-md">
        <Logo size={15} markSize={22} />
        <WelcomeFlow
          firstName={member.fullName.split(" ")[0]}
          incomeCategories={incomeCategories}
          fixedCategories={expenseCategories.filter((c) => c.type === "fixed")}
          variableCategories={expenseCategories.filter((c) => c.type === "variable")}
        />
      </div>
    </main>
  );
}
