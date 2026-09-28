import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdvisor } from "@/lib/advisor";
import { prisma } from "@/lib/prisma";
import { createLead, updateLeadStatus, convertLeadToFamily } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  new: "חדש",
  contacted: "נוצר קשר",
  scheduled: "נקבעה פגישה",
  converted: "הומר ללקוח",
  lost: "אבוד",
};

export default async function AdminLeadsPage() {
  const advisor = await getCurrentAdvisor();
  if (!advisor) redirect("/dashboard");

  const leads = await prisma.lead.findMany({
    where: { advisorId: advisor.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link href="/admin" className="text-xs text-gray-400 underline">
          ← חזרה ללקוחות
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-brand-teal">לידים</h1>

        <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
          <form action={createLead} className="space-y-2">
            <input
              type="text"
              name="fullName"
              required
              placeholder="שם מלא"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="email"
              name="email"
              required
              placeholder="מייל"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="tel"
              name="phone"
              placeholder="טלפון (אופציונלי)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white hover:bg-brand-teal-dark"
            >
              הוספת ליד
            </button>
          </form>
        </div>

        <div className="mt-5 space-y-2">
          {leads.length === 0 && (
            <p className="text-center text-sm text-gray-400">עדיין אין לידים במערכת.</p>
          )}
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-brand-teal">
                  {lead.fullName}
                </span>
                <span className="rounded-full bg-brand-terracotta/15 px-2 py-0.5 text-xs font-medium text-brand-teal">
                  {STATUS_LABEL[lead.status] ?? lead.status}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                {lead.email}
                {lead.phone && ` · ${lead.phone}`}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <form action={updateLeadStatus} className="flex items-center gap-2">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <select
                    name="status"
                    defaultValue={lead.status}
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                  >
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:border-brand-teal/30"
                  >
                    עדכון
                  </button>
                </form>

                {lead.status !== "converted" && (
                  <form action={convertLeadToFamily}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-brand-teal px-2 py-1 text-xs font-medium text-white hover:bg-brand-teal-dark"
                    >
                      המרה למשפחה
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
