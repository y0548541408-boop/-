import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { getCurrentAdvisor } from "@/lib/advisor";
import { prisma } from "@/lib/prisma";
import { createMortgageQuestionnaire, deleteMortgageQuestionnaire } from "./actions";
import ShareLink from "./ShareLink";
import { QUESTIONNAIRES, KINDS, getQuestionnaire } from "@/lib/questionnaires";

export default async function AdminMortgagePage() {
  const advisor = await getCurrentAdvisor();
  if (!advisor) redirect("/dashboard");

  const items = await prisma.mortgageQuestionnaire.findMany({
    where: { advisorId: advisor.id },
    orderBy: { createdAt: "desc" },
  });

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const base = `${proto}://${host}`;

  const submitted = items.filter((i) => i.status === "submitted").length;

  return (
    <AdminShell active="questionnaires" advisorName={advisor.fullName} wide={false}>
      <div>
        <Link href="/admin" className="text-sm text-ru-muted underline">
          ← חזרה ללקוחות
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-brand-teal">שאלונים ללקוחות</h1>
        <p className="mt-1 text-sm text-ru-muted">
          בוחרים סוג שאלון, יוצרים קישור ושולחים ללקוח בוואטסאפ. כשהלקוח מסיים, מגיע אליך מייל עם דוח מפורט.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "נשלחו", value: items.length },
            { label: "מולאו", value: submitted },
            { label: "ממתינים", value: items.length - submitted },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-brand-teal/10 bg-white p-4 text-center shadow-sm shadow-brand-teal/5">
              <div className="text-2xl font-bold text-brand-teal">{k.value}</div>
              <div className="text-sm text-ru-muted">{k.label}</div>
            </div>
          ))}
        </div>

        <form action={createMortgageQuestionnaire} className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5 sm:p-5">
          <h2 className="text-base font-semibold text-brand-teal">שאלון חדש ללקוח</h2>
          <fieldset className="mt-3">
            <legend className="sr-only">סוג השאלון</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {KINDS.map((k, i) => (
                <label key={k} className="relative cursor-pointer">
                  <input type="radio" name="kind" value={k} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="flex min-h-12 items-center justify-center rounded-xl border-2 border-gray-200 px-4 text-center text-base font-medium text-ru-ink peer-checked:border-brand-teal peer-checked:bg-brand-teal peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-brand-teal/30">
                    {QUESTIONNAIRES[k].title}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              name="clientName"
              required
              placeholder="שם הלקוח"
              aria-label="שם הלקוח"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-teal focus:outline-none"
            />
            <input
              name="clientPhone"
              type="tel"
              dir="ltr"
              placeholder="טלפון (לוואטסאפ)"
              aria-label="טלפון הלקוח (לוואטסאפ)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-right text-sm focus:border-brand-teal focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-teal px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-teal-dark"
            >
              יצירת קישור
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-2.5">
          {items.length === 0 && <p className="py-6 text-center text-sm text-ru-muted">עדיין לא נוצרו שאלונים.</p>}
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-ru-ink">{item.clientName}</div>
                  <div className="mt-0.5 text-sm font-medium text-brand-teal">{getQuestionnaire(item.kind).title}</div>
                  <div className="mt-0.5 text-sm text-ru-muted">
                    נוצר {item.createdAt.toLocaleDateString("he-IL")}
                    {item.submittedAt && ` · מולא ${item.submittedAt.toLocaleDateString("he-IL")}`}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-medium ${
                    item.status === "submitted" ? "bg-brand-teal/10 text-brand-teal" : "bg-gray-100 text-ru-muted"
                  }`}
                >
                  {item.status === "submitted" ? "מולא" : "ממתין למילוי"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {item.status === "submitted" ? (
                  <Link
                    href={`/admin/mortgage/${item.id}`}
                    className="rounded-lg bg-brand-teal px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-teal-dark"
                  >
                    לדוח המפורט
                  </Link>
                ) : (
                  <ShareLink
                    url={`${base}/q/${item.token}`}
                    message={getQuestionnaire(item.kind).whatsapp(item.clientName.split(" ")[0], `${base}/q/${item.token}`)}
                    phone={item.clientPhone}
                  />
                )}
                {item.status !== "submitted" && (
                  <form action={deleteMortgageQuestionnaire}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className="min-h-11 px-2 text-sm text-ru-muted hover:text-red-700">
                      ביטול הקישור
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
