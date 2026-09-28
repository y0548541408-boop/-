import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFamilyMaaserSummary } from "@/lib/maaser";
import DashboardNav from "../DashboardNav";
import MaaserTools from "./MaaserTools";

export default async function MaaserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.familyMember.findUnique({
    where: { authUserId: user.id },
    include: { family: true },
  });
  if (!member) redirect("/login");

  const summary = await getFamilyMaaserSummary(member.familyId);
  const monthLabel = new Date().toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-semibold text-brand-navy">מעשרות</h1>
        <p className="text-sm text-gray-500">מעקב אחר חובת מעשר לפי הכנסה — {monthLabel}</p>
        <DashboardNav />

        <MaaserTools summary={summary} />
      </div>
    </main>
  );
}
