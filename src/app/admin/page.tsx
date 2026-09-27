import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdvisor } from "@/lib/advisor";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/app/login/actions";

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
  });

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-brand-navy">
              שלום, {advisor.fullName}
            </h1>
            <p className="text-sm text-gray-500">הלקוחות שלך</p>
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
              className="block rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm shadow-brand-navy/5 transition hover:border-brand-navy/25"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-brand-navy">
                  {family.displayName}
                </span>
                <span className="rounded-full bg-brand-gold/15 px-2 py-0.5 text-xs font-medium text-brand-navy">
                  {STATUS_LABEL[family.status] ?? family.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
