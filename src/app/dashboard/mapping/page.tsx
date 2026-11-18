import { redirect } from "next/navigation";
import { getCurrentFamilyMember } from "@/lib/currentMember";
import MappingScreen, { parseTab } from "@/components/mapping/MappingScreen";
import DashboardNav from "../DashboardNav";

export default async function MappingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const member = await getCurrentFamilyMember();
  if (!member) redirect("/login");

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-44 pt-6 lg:ps-64 lg:pb-12 text-ru-ink">
      <div className="mx-auto max-w-md lg:max-w-5xl">
        <MappingScreen
          familyId={member.familyId}
          basePath="/dashboard/mapping"
          planHref="/dashboard/plan"
          tab={parseTab(tab)}
        />
        <DashboardNav />
      </div>
    </main>
  );
}
