import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFamilyTransactionLog } from "@/lib/transactions";
import DashboardNav from "../DashboardNav";
import TransactionRow from "./TransactionRow";

export default async function TransactionsPage() {
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

  const entries = await getFamilyTransactionLog(member.familyId, { limit: 200 });

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-semibold text-brand-navy">יומן תנועות</h1>
        <p className="text-sm text-gray-500">כל ההכנסות וההוצאות שלכם, מהחדש לישן</p>
        <DashboardNav />

        <div className="mt-4 space-y-2">
          {entries.length === 0 && (
            <p className="mt-8 text-center text-sm text-gray-400">עדיין אין תנועות רשומות.</p>
          )}
          {entries.map((e) => (
            <TransactionRow key={`${e.kind}-${e.id}`} entry={e} />
          ))}
        </div>
      </div>
    </main>
  );
}
