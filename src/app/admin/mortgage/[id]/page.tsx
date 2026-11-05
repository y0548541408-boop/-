import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentAdvisor } from "@/lib/advisor";
import { prisma } from "@/lib/prisma";
import { parseResponses } from "@/lib/mortgageQuestionnaire";
import MortgageReport from "./MortgageReport";
import FinanceReport from "./FinanceReport";

export default async function MortgageReportPage({ params }: { params: Promise<{ id: string }> }) {
  const advisor = await getCurrentAdvisor();
  if (!advisor) redirect("/dashboard");

  const { id } = await params;
  const item = await prisma.mortgageQuestionnaire.findFirst({ where: { id, advisorId: advisor.id } });
  if (!item) notFound();

  const r = parseResponses(item.responses);
  if (!r) {
    return (
      <main className="min-h-screen bg-sh-cream px-4 py-10 text-center text-sh-ink">
        <p>{item.clientName} עדיין לא מילא/ה את השאלון.</p>
        <Link href="/admin/mortgage" className="mt-3 inline-block text-sm text-sh-green underline">
          חזרה לשאלונים
        </Link>
      </main>
    );
  }

  if (item.kind === "finance") return <FinanceReport clientName={item.clientName} submittedAt={item.submittedAt} r={r} />;
  return <MortgageReport clientName={item.clientName} submittedAt={item.submittedAt} r={r} />;
}
