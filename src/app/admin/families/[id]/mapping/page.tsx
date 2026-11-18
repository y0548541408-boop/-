import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";
import AdminShell from "@/components/admin/AdminShell";
import MappingScreen, { parseTab } from "@/components/mapping/MappingScreen";

// The advisor's view of a family's mapping: the same screens the client sees,
// so the two of you can fill it in together in the meeting.
export default async function AdminMappingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const advisor = await getCurrentAdvisor();
  if (!advisor) redirect("/dashboard");

  const family = await prisma.family.findFirst({ where: { id, advisorId: advisor.id } });
  if (!family) redirect("/admin");

  return (
    <AdminShell active="clients" advisorName={advisor.fullName}>
      <div>
        <Link href={`/admin/families/${id}`} className="inline-flex min-h-11 items-center text-base text-ru-muted underline">
          ← חזרה למשפחת {family.displayName}
        </Link>
        <MappingScreen
          familyId={id}
          advisorView
          basePath={`/admin/families/${id}/mapping`}
          planHref={`/admin/families/${id}/mapping?tab=summary`}
          tab={parseTab(tab)}
        />
      </div>
    </AdminShell>
  );
}
