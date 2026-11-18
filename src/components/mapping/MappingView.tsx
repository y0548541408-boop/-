import Link from "next/link";
import type { MappingOverview } from "@/lib/mapping";
import { MappingUploader, UploadRow, UnassignedRow, ExcludedRow, CashSection } from "./MappingClient";

type Cat = { id: string; name: string };

const shekel = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
const day = (d: Date) => d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit", timeZone: "UTC" });
const monthName = (d: Date) => d.toLocaleDateString("he-IL", { month: "long", year: "numeric", timeZone: "UTC" });

function Step({ n, title, children, hint }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-3xl bg-white p-5 shadow-[0_4px_20px_rgba(11,95,88,0.07)]">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ru-blue font-num text-sm font-bold text-white">
          {n}
        </span>
        <h2 className="font-display text-xl">{title}</h2>
      </div>
      {hint && <p className="mt-2 text-base text-ru-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function MappingView({
  overview,
  expenseCategories,
  incomeCategories,
  familyId,
  planHref,
}: {
  overview: MappingOverview;
  expenseCategories: Cat[];
  incomeCategories: Cat[];
  familyId?: string;
  planHref: string;
}) {
  const hasData = overview.transactionCount > 0 || overview.cash.length > 0;
  const maxLine = Math.max(1, ...overview.expenseLines.map((l) => l.monthly));
  const shownExpenses = overview.expenseLines.filter((l) => l.monthly !== 0);
  const shownIncomes = overview.incomeLines.filter((l) => l.monthly !== 0);
  const net = overview.totalIncomeMonthly - overview.totalExpenseMonthly;
  const unassignedExpenseItems = overview.unassigned.filter((u) => !u.isIncome);
  const unassignedIncomeItems = overview.unassigned.filter((u) => u.isIncome);

  return (
    <div>
      {hasData && (
        <div className="mt-5 rounded-3xl bg-ru-blue p-5 text-white shadow-[0_8px_24px_rgba(11,95,88,0.3)]">
          <p className="text-base text-white/80">
            {overview.months > 0 && overview.firstDate && overview.lastDate
              ? `ממוצע לחודש, לפי ${overview.months} חודשים (${monthName(overview.firstDate)} עד ${monthName(overview.lastDate)})`
              : "ממוצע לחודש"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-white/75">יצא בחודש</p>
              <p className="font-num text-3xl font-bold">{shekel(overview.totalExpenseMonthly)}</p>
            </div>
            <div>
              <p className="text-sm text-white/75">נכנס בחודש</p>
              <p className="font-num text-3xl font-bold">{shekel(overview.totalIncomeMonthly)}</p>
            </div>
          </div>
          <p className={`mt-3 rounded-2xl px-4 py-2.5 text-base font-bold ${net < 0 ? "bg-brand-mand" : "bg-white/15"}`}>
            {net < 0 ? `בממוצע יצא ${shekel(-net)} יותר ממה שנכנס` : `בממוצע נשארו ${shekel(net)} בחודש`}
          </p>
          {overview.unassigned.length > 0 && (
            <p className="mt-2 text-sm text-white/80">
              עוד {overview.unassigned.length} מקומות לא שויכו. הם כבר בתוך הסכום, אבל עוד לא בקטגוריה.
            </p>
          )}
        </div>
      )}

      <Step
        n={1}
        title="מעלים את הפירוט"
        hint="פירוט עובר ושב ופירוט כרטיסי אשראי, של 3 חודשים אחורה לפחות. אפשר כמה קבצים ביחד."
      >
        <MappingUploader familyId={familyId} />
        <details className="mt-3 rounded-2xl bg-ru-bg px-4 py-3 text-base">
          <summary className="cursor-pointer font-bold text-ru-blue">איך מורידים את הקובץ?</summary>
          <ul className="mt-2 list-disc space-y-1.5 ps-5">
            <li>
              <b>בנק:</b> באתר הבנק נכנסים לעובר ושב, ואז לתנועות בחשבון. בוחרים תאריכים ולוחצים על ייצוא לאקסל.
            </li>
            <li>
              <b>כרטיס אשראי:</b> באתר של חברת האשראי (ישראכרט, כאל, מקס) נכנסים לפירוט החיובים. בוחרים חודש ולוחצים על ייצוא לאקסל. עושים את זה לכל חודש.
            </li>
            <li>צריך קובץ אקסל. קובץ PDF לא מתאים.</li>
            <li>החיוב החודשי של האשראי מופיע גם בעובר ושב. המערכת מזהה אותו, ולא סופרת אותו פעמיים.</li>
          </ul>
        </details>
        {overview.uploads.length > 0 && (
          <div className="mt-4 divide-y divide-ru-line border-t border-ru-line">
            {overview.uploads.map((u) => (
              <UploadRow key={u.id} familyId={familyId} upload={u} />
            ))}
          </div>
        )}
      </Step>

      <Step
        n={2}
        title="משייכים את מה שלא זוהה"
        hint={
          overview.unassigned.length
            ? "בוחרים קטגוריה פעם אחת לכל מקום. כל הקניות באותו מקום משתייכות ביחד, והמערכת זוכרת את זה לפעם הבאה."
            : undefined
        }
      >
        {overview.transactionCount === 0 ? (
          <p className="text-base text-ru-muted">אחרי שמעלים קובץ, כאן יופיעו המקומות שהמערכת לא הצליחה לשייך לבד.</p>
        ) : overview.unassigned.length === 0 ? (
          <p className="rounded-2xl bg-ru-green-soft px-4 py-3 text-base font-bold">הכל שויך. אפשר להמשיך.</p>
        ) : (
          <div className="space-y-3">
            {unassignedExpenseItems.slice(0, 40).map((u) => (
              <UnassignedRow key={u.id} familyId={familyId} item={u} categories={expenseCategories} />
            ))}
            {unassignedIncomeItems.slice(0, 15).map((u) => (
              <UnassignedRow key={u.id} familyId={familyId} item={u} categories={incomeCategories} />
            ))}
            {overview.unassigned.length > 55 && (
              <p className="text-sm text-ru-muted">
                מוצגים הגדולים ביותר. אחרי שמשייכים אותם, יופיעו הבאים בתור.
              </p>
            )}
          </div>
        )}
      </Step>

      <Step n={3} title="מוסיפים מזומן" hint="מה שמשלמים במזומן לא מופיע בבנק. מספיקה הערכה: כמה בערך בחודש.">
        <CashSection familyId={familyId} categories={expenseCategories} items={overview.cash} />
      </Step>

      {hasData && (
        <section className="mt-6">
          <h2 className="font-display text-2xl text-ru-blue">לאן הלך הכסף</h2>
          <p className="text-base text-ru-muted">ממוצע לחודש בכל קטגוריה</p>
          <div className="mt-3 space-y-2.5">
            {shownExpenses.map((l) => (
              <div key={l.id} className="rounded-2xl bg-white px-4 py-3 shadow-[0_2px_12px_rgba(11,95,88,0.06)]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold">{l.name}</span>
                  <span className="font-num font-bold">{shekel(l.monthly)}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-ru-blue-soft">
                  <div className="h-full rounded-full bg-ru-blue" style={{ width: `${Math.max(2, (l.monthly / maxLine) * 100)}%` }} />
                </div>
                {l.cashMonthly > 0 && <p className="mt-1 text-sm text-ru-muted">כולל {shekel(l.cashMonthly)} מזומן</p>}
              </div>
            ))}
            {overview.unassignedExpenseMonthly > 0 && (
              <div className="rounded-2xl border-2 border-dashed border-ru-line px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">עוד לא שויך</span>
                  <span className="font-num font-bold">{shekel(overview.unassignedExpenseMonthly)}</span>
                </div>
              </div>
            )}
          </div>

          {shownIncomes.length > 0 && (
            <>
              <h3 className="mt-6 font-display text-xl text-ru-blue">הכנסות</h3>
              <div className="mt-2 space-y-2">
                {shownIncomes.map((l) => (
                  <div key={l.id} className="flex items-baseline justify-between rounded-2xl bg-white px-4 py-3 shadow-[0_2px_12px_rgba(11,95,88,0.06)]">
                    <span className="font-bold">{l.name}</span>
                    <span className="font-num font-bold text-ru-green">{shekel(l.monthly)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <Link
            href={planHref}
            className="mt-6 flex min-h-14 items-center justify-center rounded-2xl bg-brand-mand px-5 text-lg font-bold text-white shadow-[0_6px_18px_rgba(255,106,43,0.35)]"
          >
            מכאן לתכנון: כמה מוציאים מעכשיו
          </Link>

          {overview.excluded.length > 0 && (
            <details className="mt-6 rounded-3xl bg-white p-5 shadow-[0_4px_20px_rgba(11,95,88,0.07)]">
              <summary className="cursor-pointer text-base font-bold">
                {overview.excluded.length} תנועות לא נספרו (חיובי אשראי ודומיהם)
              </summary>
              <div className="mt-3 divide-y divide-ru-line">
                {overview.excluded.slice(0, 60).map((x) => (
                  <ExcludedRow
                    key={x.id}
                    familyId={familyId}
                    item={{ ...x, occurredAt: day(x.occurredAt) }}
                  />
                ))}
              </div>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
