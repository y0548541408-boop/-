import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdvisor } from "@/lib/advisor";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/app/login/actions";
import { Logo } from "@/components/Logo";

const STATUS_LABEL: Record<string, string> = {
  lead: "ליד",
  onboarding: "בקליטה",
  active: "פעיל",
  paused: "מושהה",
  graduated: "סיים תהליך",
};

export default async function AdminPage() {
  const advisor = await getCurrentAdvisor();
  if (!advisor) redirect("/dashboard");

  const families = await prisma.family.findMany({
    where: { advisorId: advisor.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { meetingSummaries: true } },
    },
  });

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8">
      <div className="mx-auto max-w-md">
        <Logo size={15} markSize={22} />
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-brand-teal">
              שלום, {advisor.fullName}
            </h1>
            <nav className="mt-1 flex gap-3 text-sm">
              <span className="font-medium text-brand-teal">לקוחות</span>
              <Link href="/admin/leads" className="text-gray-400 hover:text-brand-teal">
                לידים
              </Link>
            </nav>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-xs text-gray-400 underline">
              התנתקות
            </button>
          </form>
        </div>

        <div className="mt-5 space-y-2">
          {families.length === 0 && (
            <p className="text-center text-sm text-gray-400">עדיין אין לקוחות במערכת.</p>
          )}
          {families.map((family) => (
            <Link
              key={family.id}
              href={`/admin/families/${family.id}`}
              className="block rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5 transition hover:border-brand-teal/25"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-brand-teal">
                  {family.displayName}
                </span>
                <span className="rounded-full bg-brand-terracotta/15 px-2 py-0.5 text-xs font-medium text-brand-teal">
                  {STATUS_LABEL[family.status] ?? family.status}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {family._count.meetingSummaries} פגישות
                </span>
                {family.hasDebt && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                    חוב פתוח
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
