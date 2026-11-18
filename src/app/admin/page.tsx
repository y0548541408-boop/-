import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdvisor } from "@/lib/advisor";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/components/admin/AdminShell";

const STATUS_LABEL: Record<string, string> = {
  lead: "ליד",
  onboarding: "בקליטה",
  active: "פעיל",
  paused: "מושהה",
  graduated: "סיים תהליך",
};

function StatCard({ label, value, hint, tone = "teal" }: { label: string; value: number; hint: string; tone?: "teal" | "mand" }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(11,95,88,0.07)]">
      <p className="text-sm text-ru-muted">{label}</p>
      <p className={`font-num mt-1 text-4xl font-bold ${tone === "mand" ? "text-brand-mand" : "text-brand-teal"}`}>{value}</p>
      <p className="mt-1 text-sm text-ru-muted">{hint}</p>
    </div>
  );
}

export default async function AdminPage() {
  const advisor = await getCurrentAdvisor();
  if (!advisor) redirect("/dashboard");

  const [families, newLeads, openDebts] = await Promise.all([
    prisma.family.findMany({
      where: { advisorId: advisor.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { meetingSummaries: true } },
        members: { select: { id: true, email: true, phone: true, accessToken: true } },
      },
    }),
    prisma.lead.count({ where: { advisorId: advisor.id, status: "new" } }),
    prisma.family.count({ where: { advisorId: advisor.id, hasDebt: true } }),
  ]);

  const active = families.filter((f) => f.status === "active").length;
  const onboarding = families.filter((f) => f.status === "onboarding" || f.status === "lead").length;

  return (
    <AdminShell active="clients" advisorName={advisor.fullName}>
      <h1 className="font-display text-3xl text-brand-teal">הלקוחות שלך</h1>
      <p className="mt-1 text-base text-ru-muted">כל המשפחות במקום אחד. לוחצים על משפחה כדי לראות את התיק שלה.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard label="משפחות" value={families.length} hint={`${active} פעילות`} />
        <StatCard label="בתהליך קליטה" value={onboarding} hint="ליד או בקליטה" />
        <StatCard label="לידים חדשים" value={newLeads} hint="מחכים לקשר ראשון" tone="mand" />
        <StatCard label="חוב פתוח" value={openDebts} hint="משפחות שצריך לטפל בהן" tone="mand" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-2xl text-brand-teal">משפחות</h2>
        <Link
          href="/admin/leads"
          className="inline-flex min-h-11 items-center rounded-full bg-brand-mand px-5 text-base font-bold text-white"
        >
          לידים חדשים
        </Link>
      </div>

      {families.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-center text-base text-ru-muted">
          עדיין אין משפחות במערכת. מתחילים מהלידים: ממירים ליד למשפחה.
        </p>
      ) : (
        <>
          {/* Computer: a table */}
          <div className="mt-4 hidden overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(11,95,88,0.07)] lg:block">
            <table className="w-full text-base">
              <thead className="bg-brand-cream text-start text-sm text-ru-muted">
                <tr>
                  <th className="px-5 py-3 text-start font-bold">משפחה</th>
                  <th className="px-3 py-3 text-start font-bold">מצב</th>
                  <th className="px-3 py-3 text-start font-bold">גישה</th>
                  <th className="px-3 py-3 text-start font-bold">פגישות</th>
                  <th className="px-3 py-3 text-start font-bold">תשלום</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ru-line">
                {families.map((f) => {
                  const withLink = f.members.filter((m) => m.accessToken).length;
                  return (
                    <tr key={f.id} className="hover:bg-brand-cream/60">
                      <td className="px-5 py-3.5 font-bold">
                        <Link href={`/admin/families/${f.id}`} className="hover:text-brand-teal">{f.displayName}</Link>
                      </td>
                      <td className="px-3 py-3.5">{STATUS_LABEL[f.status] ?? f.status}</td>
                      <td className="px-3 py-3.5 text-ru-muted">{withLink} מתוך {f.members.length} עם קישור</td>
                      <td className="font-num px-3 py-3.5">{f._count.meetingSummaries}</td>
                      <td className="px-3 py-3.5">
                        {f.hasDebt ? <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-sm font-bold text-red-600">חוב פתוח</span> : <span className="text-ru-muted">מסודר</span>}
                      </td>
                      <td className="px-5 py-3.5 text-end">
                        <Link href={`/admin/families/${f.id}/mapping`} className="text-sm font-bold text-brand-teal underline">
                          תקציב
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phone: cards */}
          <div className="mt-4 space-y-2.5 lg:hidden">
            {families.map((f) => (
              <Link
                key={f.id}
                href={`/admin/families/${f.id}`}
                className="block rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(11,95,88,0.07)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-bold">{f.displayName}</span>
                  <span className="rounded-full bg-brand-cream px-2.5 py-0.5 text-sm font-bold text-brand-teal">
                    {STATUS_LABEL[f.status] ?? f.status}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ru-muted">
                  <span>{f._count.meetingSummaries} פגישות</span>
                  {f.hasDebt && <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-600">חוב פתוח</span>}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </AdminShell>
  );
}
