import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
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
      <AdminShell active="questionnaires" advisorName={advisor.fullName} wide={false}>
        <div className="py-10 text-center">
          <p className="text-ru-ink">{item.clientName} עדיין לא מילא/ה את השאלון.</p>
          <Link href="/admin/mortgage" className="mt-3 inline-block text-sm text-brand-teal underline">
            חזרה לשאלונים
          </Link>
        </div>
      </AdminShell>
    );
  }

  if (item.kind === "finance") return <FinanceReport clientName={item.clientName} submittedAt={item.submittedAt} r={r} />;
  return <MortgageReport clientName={item.clientName} submittedAt={item.submittedAt} r={r} />;
}
