import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { getCurrentAdvisor } from "@/lib/advisor";
import { prisma } from "@/lib/prisma";
import { ShermanLogo } from "@/components/ShermanLogo";
import { createMortgageQuestionnaire, deleteMortgageQuestionnaire } from "./actions";
import ShareLink from "./ShareLink";

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
    <main className="min-h-screen bg-sh-cream px-4 py-8 text-sh-ink">
      <div className="mx-auto max-w-2xl">
        <Link href="/admin" className="text-xs text-sh-ink/50 underline">
          ← חזרה ללקוחות
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <ShermanLogo markSize={38} />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-sh-green">שאלוני משכנתא</h1>
        <p className="mt-1 text-sm text-sh-ink/65">
          יוצרים קישור ללקוח, שולחים לו בוואטסאפ, וכשהוא מסיים מגיע אליך מייל עם דוח מפורט.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "נשלחו", value: items.length },
            { label: "מולאו", value: submitted },
            { label: "ממתינים", value: items.length - submitted },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl bg-white p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-sh-green">{k.value}</div>
              <div className="text-xs text-sh-ink/55">{k.label}</div>
            </div>
          ))}
        </div>

        <form action={createMortgageQuestionnaire} className="mt-5 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="text-sm font-semibold text-sh-green">שאלון חדש ללקוח</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              name="clientName"
              required
              placeholder="שם הלקוח"
              className="rounded-xl border border-sh-cream-dark px-3 py-2.5 text-sm focus:border-sh-green focus:outline-none"
            />
            <input
              name="clientPhone"
              type="tel"
              dir="ltr"
              placeholder="טלפון (לוואטסאפ)"
              className="rounded-xl border border-sh-cream-dark px-3 py-2.5 text-right text-sm focus:border-sh-green focus:outline-none"
            />
            <button type="submit" className="rounded-xl bg-sh-green px-5 py-2.5 text-sm font-semibold text-white hover:bg-sh-green-dark">
              יצירת קישור
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-2.5">
          {items.length === 0 && <p className="py-6 text-center text-sm text-sh-ink/45">עדיין לא נוצרו שאלונים.</p>}
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-sh-ink">{item.clientName}</div>
                  <div className="mt-0.5 text-xs text-sh-ink/50">
                    נוצר {item.createdAt.toLocaleDateString("he-IL")}
                    {item.submittedAt && ` · מולא ${item.submittedAt.toLocaleDateString("he-IL")}`}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    item.status === "submitted" ? "bg-sh-mint text-sh-green" : "bg-sh-cream-dark text-sh-ink/60"
                  }`}
                >
                  {item.status === "submitted" ? "מולא" : "ממתין למילוי"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {item.status === "submitted" ? (
                  <Link
                    href={`/admin/mortgage/${item.id}`}
                    className="rounded-lg bg-sh-accent px-4 py-1.5 text-xs font-semibold text-white hover:brightness-95"
                  >
                    לדוח המפורט
                  </Link>
                ) : (
                  <ShareLink url={`${base}/mortgage/${item.token}`} clientName={item.clientName} phone={item.clientPhone} />
                )}
                {item.status !== "submitted" && (
                  <form action={deleteMortgageQuestionnaire}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className="text-xs text-sh-ink/40 hover:text-sh-ink/70">
                      ביטול הקישור
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
