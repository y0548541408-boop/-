import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultCategories, familyHasNoCategories } from "@/lib/defaultCategories";
import DashboardNav from "../DashboardNav";
import CategoryManager, { type ManagedCategory } from "./CategoryManager";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.familyMember.findUnique({ where: { authUserId: user.id } });
  if (!member) redirect("/login");

  if (await familyHasNoCategories(member.familyId)) {
    await ensureDefaultCategories(member.familyId);
  }

  const [expenseRows, incomeRows] = await Promise.all([
    prisma.budgetCategory.findMany({ where: { familyId: member.familyId }, orderBy: { createdAt: "asc" } }),
    prisma.incomeCategory.findMany({ where: { familyId: member.familyId }, orderBy: { createdAt: "asc" } }),
  ]);

  const expense: ManagedCategory[] = expenseRows.map((c) => ({
    id: c.id,
    name: c.name,
    planned: Number(c.plannedAmount),
    type: c.type,
    isActive: c.isActive,
  }));
  const income: ManagedCategory[] = incomeRows.map((c) => ({
    id: c.id,
    name: c.name,
    planned: Number(c.plannedAmount),
    isActive: c.isActive,
  }));

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-32 pt-6 text-ru-ink">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">הקטגוריות שלי</h1>
        <p className="text-sm text-ru-muted">
          מתאימים את התקציב לבית שלכם: מוסיפים, משנים שם, קובעים תקציב ומסירים.
        </p>

        <DashboardNav />

        <CategoryManager
          fixed={expense.filter((c) => c.isActive && c.type === "fixed")}
          variable={expense.filter((c) => c.isActive && c.type === "variable")}
          income={income.filter((c) => c.isActive)}
          hidden={[
            ...expense.filter((c) => !c.isActive).map((category) => ({ kind: "expense" as const, category })),
            ...income.filter((c) => !c.isActive).map((category) => ({ kind: "income" as const, category })),
          ]}
        />
      </div>
    </main>
  );
}
