import Link from "next/link";
import type { Picture, PictureGroup } from "@/lib/picture";
import type { MappingOverview } from "@/lib/mapping";
import { GROUP_HELP, LINE_HINTS, G } from "@/lib/pictureTemplate";
import { PictureLineRow, AddPictureLine, HouseholdSize, ApplyPictureToPlan } from "./PictureClient";

export type MappingTab = "monthly" | "annual" | "assets" | "summary";

const TABS: { id: MappingTab; label: string }[] = [
  { id: "monthly", label: "חודשי" },
  { id: "annual", label: "שנתי" },
  { id: "assets", label: "נכסים מול התחייבויות" },
  { id: "summary", label: "סיכום" },
];

// Money, with the minus sign in the right place inside Hebrew text.
function money(n: number): string {
  const r = Math.round(n);
  return `${r < 0 ? "-" : ""}₪${Math.abs(r).toLocaleString("he-IL")}`;
}

export function MappingTabs({ active, basePath }: { active: MappingTab; basePath: string }) {
  return (
    <nav aria-label="חלקי המיפוי" className="mt-5 grid grid-cols-2 gap-1 rounded-3xl bg-white p-1.5 shadow-[0_1px_6px_rgba(11,95,88,0.08)] sm:flex sm:rounded-full">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={`${basePath}?tab=${t.id}`}
          aria-current={t.id === active ? "page" : undefined}
          className={`flex min-h-12 flex-1 items-center justify-center rounded-full px-2 text-center text-lg font-bold transition-colors ${
            t.id === active ? "bg-ru-blue text-white" : "text-ru-ink/70"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

function GroupCard({
  familyId,
  group,
  period,
  kind,
  defaultOpen,
  title,
  showWhen,
}: {
  familyId?: string;
  group: PictureGroup;
  period: "monthly" | "annual";
  kind: "income" | "expense";
  defaultOpen: boolean;
  title?: string;
  showWhen?: boolean;
}) {
  const help = GROUP_HELP[group.groupName];
  const showTarget = Math.round(group.total.target) !== Math.round(group.total.now);
  return (
    <details
      open={defaultOpen}
      className="group rounded-3xl bg-white shadow-[0_4px_20px_rgba(11,95,88,0.07)] [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <span className="min-w-0">
          <span className="block font-display text-2xl leading-tight text-ru-blue">{title ?? group.groupName}</span>
          <span className="block text-base text-ru-muted">
            {group.lines.length === 0 ? "אין שורות עדיין" : group.lines.length === 1 ? "שורה אחת" : `${group.lines.length} שורות`}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-end">
          <span>
            <span className={`block font-num text-2xl font-bold ${group.isDeduction ? "text-ru-pink" : ""}`}>
              {group.isDeduction && group.total.now ? "-" : ""}
              {money(group.total.now)}
            </span>
            {showTarget && <span className="block text-base font-bold text-brand-mand">יעד {money(group.total.target)}</span>}
          </span>
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-ru-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-ru-line px-5 pb-4 pt-2">
        {help && <p className="py-2 text-lg text-ru-muted">{help}</p>}
        <div className="divide-y divide-ru-line">
          {group.lines.map((l) => (
            <PictureLineRow
              key={l.id}
              familyId={familyId}
              line={l}
              hint={LINE_HINTS[l.name]}
              showWhen={showWhen}
            />
          ))}
        </div>
        <AddPictureLine
          familyId={familyId}
          period={period}
          kind={kind}
          groupName={group.groupName}
          subGroup={group.subGroup || undefined}
        />
      </div>
    </details>
  );
}

function HeadlineCard({
  title,
  incomeLabel,
  income,
  expenseLabel,
  expense,
  note,
}: {
  title: string;
  incomeLabel: string;
  income: number;
  expenseLabel: string;
  expense: number;
  note?: string;
}) {
  const diff = income - expense;
  return (
    <div className="mt-5 rounded-3xl bg-gradient-to-br from-ru-blue to-brand-teal-dark p-5 text-white shadow-[0_8px_24px_rgba(11,95,88,0.3)]">
      <p className="text-lg text-white/85">{title}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <p className="text-base text-white/80">{incomeLabel}</p>
          <p className="font-num text-2xl font-bold">{money(income)}</p>
        </div>
        <div>
          <p className="text-base text-white/80">{expenseLabel}</p>
          <p className="font-num text-2xl font-bold">{money(expense)}</p>
        </div>
        <div>
          <p className="text-base text-white/80">הפער</p>
          <p className={`font-num text-2xl font-bold ${diff < 0 ? "text-brand-mand" : ""}`}>{money(diff)}</p>
        </div>
      </div>
      <p className="mt-4 text-lg text-white/90">
        {diff < 0 ? `חסרים ${money(-diff)} בחודש` : `נשארים ${money(diff)} בחודש`}
      </p>
      {note && <p className="mt-2 text-base text-white/85">{note}</p>}
    </div>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mt-8 mb-3">
      <h2 className="font-display text-3xl text-ru-blue">{children}</h2>
      {sub && <p className="text-lg text-ru-muted">{sub}</p>}
    </div>
  );
}

// The husband and wife groups are shown by their first names when the family has them.
type Names = { husband: string | null; wife: string | null };
function groupTitle(groupName: string, names: Names): string | undefined {
  if (groupName === G.husband && names.husband) return names.husband;
  if (groupName === G.wife && names.wife) return names.wife;
  return undefined;
}

export function MonthlyPicture({ picture, familyId, names }: { picture: Picture; familyId?: string; names: Names }) {
  const s = picture.summary;
  return (
    <div>
      <HeadlineCard
        title="תמונת מצב חודשית"
        incomeLabel="הכנסות"
        income={s.monthlyIncome.now}
        expenseLabel="הוצאות (כולל חובות)"
        expense={s.monthlyExpenseNoDebt.now + s.monthlyDebts.now}
        note={s.monthlyDebts.now ? `מתוכם ${money(s.monthlyDebts.now)} החזרי חובות בחודש.` : undefined}
      />
      <p className="mt-3 text-lg">
        ממלאים כמה זה היום, בערך. לא צריך להיות מדויק, מספיק קרוב. בלחיצה על &quot;יעד והערות&quot; אפשר לכתוב את היעד החדש שלנו ולהוסיף הערה.
      </p>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <div>
          <SectionTitle>הכנסות</SectionTitle>
          <div className="space-y-3">
            {picture.groups.monthlyIncome.map((g, i) => (
              <GroupCard key={g.groupName} familyId={familyId} group={g} period="monthly" kind="income" defaultOpen={i === 0} title={groupTitle(g.groupName, names)} />
            ))}
          </div>
        </div>
        <div>
          <SectionTitle sub="כל מה שיוצא בחודש רגיל">הוצאות</SectionTitle>
          <div className="space-y-3">
            {picture.groups.monthlyExpense.map((g, i) => (
              <GroupCard key={g.groupName} familyId={familyId} group={g} period="monthly" kind="expense" defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnnualPicture({ picture, familyId, names }: { picture: Picture; familyId?: string; names: Names }) {
  const s = picture.summary;
  return (
    <div>
      <HeadlineCard
        title="התמונה השנתית, כמו שהיא היום"
        incomeLabel="נכנס בשנה"
        income={s.annualIncome.now}
        expenseLabel="יוצא בשנה"
        expense={s.annualExpense.now}
        note={`בחלוקה ל-12 זה ${money(s.annualIncome.now / 12)} הכנסה ו-${money(s.annualExpense.now / 12)} הוצאה בכל חודש. את זה אנחנו מוסיפים לתמונה החודשית.`}
      />
      <p className="mt-3 text-lg">
        כאן הדברים שלא קורים כל חודש: ביטוחים, בגדים, חגים וחופשה. כותבים כמה זה עולה בשנה שלמה.
      </p>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
      <div>
      <SectionTitle>הכנסות בשנה</SectionTitle>
      <div className="space-y-3">
        {picture.groups.annualIncome.map((g, i) => (
          <GroupCard
            key={g.groupName}
            familyId={familyId}
            group={g}
            period="annual"
            kind="income"
            defaultOpen={i === 0}
            showWhen
            title={g.groupName === G.productivityLoss ? "חודשים עם פחות הכנסה (יורד מהסכום)" : groupTitle(g.groupName, names)}
          />
        ))}
      </div>

      </div>
      <div>
      <SectionTitle>הוצאות בשנה</SectionTitle>
      <div className="space-y-3">
        {[...picture.groups.annualFixed, ...picture.groups.annualCurrent].map((g, i) => (
          <GroupCard key={g.groupName} familyId={familyId} group={g} period="annual" kind="expense" defaultOpen={i === 0} />
        ))}
      </div>
      </div>
      </div>

      <SectionTitle sub="מה עולה לנו בכל חג ובכל תקופה בשנה">מעגל השנה</SectionTitle>
      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8 lg:gap-y-3 lg:space-y-0">
        {picture.groups.yearCycle.map((g) => (
          <GroupCard
            key={g.subGroup}
            familyId={familyId}
            group={g}
            period="annual"
            kind="expense"
            defaultOpen={false}
            title={g.subGroup}
          />
        ))}
      </div>
    </div>
  );
}

function Row({ label, now, target, strong }: { label: string; now: number | null; target?: number | null; strong?: boolean }) {
  return (
    <tr className={strong ? "border-t-2 border-ru-line font-bold" : ""}>
      <th scope="row" className="py-3 pe-2 text-start text-lg font-normal leading-snug">
        <span className={strong ? "font-bold" : ""}>{label}</span>
      </th>
      <td className="py-3 ps-2 text-end font-num text-lg font-bold">{now === null ? "" : money(now)}</td>
      <td className="py-3 ps-2 text-end font-num text-lg font-bold text-brand-mand">
        {target === undefined || target === null ? "" : money(target)}
      </td>
    </tr>
  );
}

export function PictureSummaryView({
  picture,
  bank,
  familyId,
  planHref,
}: {
  picture: Picture;
  bank: MappingOverview;
  familyId?: string;
  planHref: string;
}) {
  const s = picture.summary;

  // Picture vs. bank, per budget category, per month.
  const bankByName = new Map(bank.expenseLines.map((l) => [l.name, l.monthly]));
  const compare = [...picture.categoryExpense.entries()]
    .map(([name, t]) => ({ name, picture: t.now, bank: bankByName.get(name) ?? 0 }))
    .filter((r) => r.picture > 0 || r.bank > 0)
    .sort((a, b) => Math.max(b.picture, b.bank) - Math.max(a.picture, a.bank));
  const hasBank = bank.transactionCount > 0;

  return (
    <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
      <div>
      <section className="mt-5 rounded-3xl bg-white p-5 shadow-[0_4px_20px_rgba(11,95,88,0.07)]">
        <h2 className="font-display text-3xl text-ru-blue">סיכום תמונת המצב</h2>
        <p className="text-lg text-ru-muted">הכל לחודש. הסכומים השנתיים מחולקים ל-12 ונכנסים פנימה.</p>
        <table className="mt-3 w-full">
          <thead>
            <tr className="text-sm text-ru-muted">
              <th className="text-start font-normal" />
              <th className="text-end font-normal">כיום</th>
              <th className="text-end font-normal text-brand-mand">היעד שלנו</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ru-line">
            <Row label="הכנסות לחודש" now={s.incomePerMonth.now} target={s.incomePerMonth.target} />
            <Row label="הוצאות לחודש" now={s.expensePerMonth.now} target={s.expensePerMonth.target} />
            <Row label="הפרש חודשי" now={s.diffPerMonth.now} target={s.diffPerMonth.target} strong />
            <Row label="החזרי חובות בחודש" now={s.monthlyDebts.now} target={s.monthlyDebts.target} />
            <Row label="הפרש אחרי החזרי חובות" now={s.diffAfterDebts.now} target={s.diffAfterDebts.target} strong />
            <Row label="יתרה בשנה שלמה" now={s.yearBalance.now} target={s.yearBalance.target} />
          </tbody>
        </table>
        <p className="mt-2 text-sm text-ru-muted">
          &quot;היעד שלנו&quot; סופר את היעד החדש בשורות שקבענו להן, ובשאר השורות את הסכום של היום.
        </p>
        {s.diffAfterDebts.now < 0 && (
          <p className="mt-3 rounded-2xl bg-ru-pink-soft px-4 py-3 text-base font-bold">
            היום יוצא בחודש {money(-s.diffAfterDebts.now)} יותר ממה שנכנס. זה בדיוק מה שנעבוד עליו.
          </p>
        )}
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-[0_4px_20px_rgba(11,95,88,0.07)]">
        <HouseholdSize familyId={familyId} size={s.householdSize} />
        {s.perPersonIncome !== null && s.perPersonExpense !== null && (
          <table className="mt-3 w-full">
            <tbody className="divide-y divide-ru-line">
              <Row label="הכנסה לנפש בחודש" now={s.perPersonIncome} />
              <Row label="הוצאה לנפש בחודש" now={s.perPersonExpense} />
            </tbody>
          </table>
        )}
      </section>
      </div>

      <div>
      {compare.length > 0 && (
        <section className="mt-4 rounded-3xl bg-white p-5 shadow-[0_4px_20px_rgba(11,95,88,0.07)]">
          <h2 className="font-display text-3xl text-ru-blue">מה שכתבנו מול הבנק</h2>
          {hasBank ? (
            <p className="text-base text-ru-muted">לכל קטגוריה: מה שכתבנו בתמונה, ומה שיצא בפועל בממוצע בבנק ובאשראי.</p>
          ) : (
            <p className="text-base text-ru-muted">
              כשמעלים פירוט מהבנק, רואים כאן אם מה שכתבנו תואם למה שיצא בפועל.
            </p>
          )}
          <table className="mt-3 w-full">
            <thead>
              <tr className="text-sm text-ru-muted">
                <th className="text-start font-normal" />
                <th className="text-end font-normal">כתבנו</th>
                {hasBank && <th className="text-end font-normal">בבנק</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ru-line">
              {compare.map((r) => {
                const gap = hasBank ? r.bank - r.picture : 0;
                return (
                  <tr key={r.name}>
                    <th scope="row" className="py-2.5 pe-2 text-start text-base font-normal">
                      {r.name}
                      {hasBank && Math.abs(gap) >= 200 && (
                        <span className="block text-sm font-bold text-brand-mand">
                          {gap > 0 ? `בבנק יוצא ${money(gap)} יותר` : `בבנק יוצא ${money(-gap)} פחות`}
                        </span>
                      )}
                    </th>
                    <td className="py-2.5 ps-2 text-end font-num text-base font-bold">{money(r.picture)}</td>
                    {hasBank && <td className="py-2.5 ps-2 text-end font-num text-base font-bold">{money(r.bank)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <ApplyPictureToPlan familyId={familyId} />
      <Link
        href={planHref}
        className="mt-4 flex min-h-14 items-center justify-center rounded-2xl bg-brand-mand px-5 text-lg font-bold text-white shadow-[0_6px_18px_rgba(255,106,43,0.35)]"
      >
        למסך התכנון ←
      </Link>
      </div>
    </div>
  );
}
