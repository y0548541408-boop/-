import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import FamilyAccess from "./FamilyAccess";
import { getCurrentAdvisor } from "@/lib/advisor";
import { prisma } from "@/lib/prisma";
import { getFamilyTasks } from "@/lib/tasks";
import {
  addMeetingSummary,
  toggleFamilyDebt,
  setFamilyBudgetOnly,
  addTask,
} from "./actions";
import AdminShell from "@/components/admin/AdminShell";
import DocumentRow from "./DocumentRow";
import RecordingSection, { type RecordingView } from "./RecordingSection";
import InsightsSection, { type InsightView } from "./InsightsSection";
import PensionSection from "./PensionSection";
import { archiveFromForm, restoreFromForm } from "./archiveActions";
import DeleteFamilyForm from "./DeleteFamilyForm";
import DocumentUploadForm from "./DocumentUploadForm";
import QuestionnaireSection from "./QuestionnaireSection";
import OnboardingAnswers from "./OnboardingAnswers";
import { KINDS, QUESTIONNAIRES, getQuestionnaire } from "@/lib/questionnaires";

// Recording analysis runs in the background after the upload; give it room.
export const maxDuration = 300;

const STUCK_AFTER_MS = 12 * 60 * 1000;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

function addDays(from: string, days: number): string {
  const date = new Date(`${from}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDay(date);
}

function toRecordingView(
  r: {
    id: string;
    filename: string;
    meetingDate: Date;
    status: string;
    errorMessage: string | null;
    draftTitle: string | null;
    draftSummary: string | null;
    draftNextFocus: string | null;
    draftTasks: unknown;
    updatedAt: Date;
  },
  today: string
): RecordingView {
  const rawTasks = Array.isArray(r.draftTasks) ? (r.draftTasks as Record<string, unknown>[]) : [];
  return {
    id: r.id,
    filename: r.filename,
    meetingDate: isoDay(r.meetingDate),
    status: r.status as RecordingView["status"],
    stuck: r.status === "processing" && Date.now() - r.updatedAt.getTime() > STUCK_AFTER_MS,
    errorMessage: r.errorMessage,
    draftTitle: r.draftTitle ?? "",
    draftSummary: r.draftSummary ?? "",
    draftNextFocus: r.draftNextFocus ?? "",
    draftTasks: rawTasks.map((t) => ({
      title: String(t.title ?? ""),
      description: String(t.description ?? ""),
      deadline: addDays(today, Number(t.deadlineDays) || 7),
    })),
  };
}

const TASK_TYPE_LABEL: Record<string, string> = {
  savings: "חיסכון",
  habit: "הרגל",
};

export default async function AdminFamilyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const advisor = await getCurrentAdvisor();
  if (!advisor) redirect("/dashboard");

  const family = await prisma.family.findFirst({
    where: { id, advisorId: advisor.id },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      meetingSummaries: { orderBy: { meetingDate: "desc" } },
      members: { orderBy: { createdAt: "asc" } },
      recordings: { where: { status: { not: "discarded" } }, orderBy: { createdAt: "desc" } },
      advisorInsights: { where: { dismissed: false }, orderBy: { createdAt: "desc" } },
      mortgageQuestionnaires: { orderBy: { createdAt: "desc" } },
      questionnaires: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
  });

  if (!family) redirect("/admin");

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const appOrigin = `${proto}://${host}`;
  const loginUrl = `${appOrigin}/login`;

  const tasks = await getFamilyTasks(family.id);
  const today = isoDay(new Date());
  const recordings = family.recordings.map((r) => toRecordingView(r, today));
  const showOnboardingLink =
    family.onboardingToken &&
    (family.status === "lead" || family.status === "onboarding");

  return (
    <AdminShell active="clients" advisorName={advisor.fullName} wide={false}>
      <div>
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="text-sm text-ru-muted underline">
            ← חזרה ללקוחות
          </Link>
          <form action={family.archivedAt ? restoreFromForm : archiveFromForm}>
            <input type="hidden" name="familyId" value={family.id} />
            <button type="submit" className="text-sm font-bold text-ru-muted underline hover:text-ru-ink">
              {family.archivedAt ? "החזר מהארכיון" : "העבר לארכיון"}
            </button>
          </form>
        </div>
        {family.archivedAt && <DeleteFamilyForm familyId={family.id} displayName={family.displayName} />}
        <h1 className="mt-2 text-xl font-semibold text-brand-teal">
          {family.displayName}
        </h1>

        <div className="mt-3 flex items-center justify-between rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
          <span className="text-sm text-gray-700">
            מצב תשלום:{" "}
            <span
              className={`font-medium ${
                family.hasDebt ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {family.hasDebt ? "יש חוב" : "מסודר"}
            </span>
          </span>
          <form action={toggleFamilyDebt}>
            <input type="hidden" name="familyId" value={family.id} />
            <input
              type="hidden"
              name="nextValue"
              value={family.hasDebt ? "false" : "true"}
            />
            <button
              type="submit"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-brand-teal/30"
            >
              {family.hasDebt ? "סמן כמסודר" : "סמן כבעל חוב"}
            </button>
          </form>
        </div>

        <div className="mt-3 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700">
              סוג גישה:{" "}
              <span className="font-medium text-brand-teal">
                {family.budgetOnly ? "תקציב בלבד" : "ליווי מלא"}
              </span>
            </span>
            <form action={setFamilyBudgetOnly}>
              <input type="hidden" name="familyId" value={family.id} />
              <input
                type="hidden"
                name="nextValue"
                value={family.budgetOnly ? "false" : "true"}
              />
              <button
                type="submit"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-brand-teal/30"
              >
                {family.budgetOnly ? "הפעל ליווי מלא" : "עבור לתקציב בלבד"}
              </button>
            </form>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {family.budgetOnly
              ? "הלקוח רואה רק את התקציב והדוחות. בלי משימות, פגישות, מסמכים ושווי נקי."
              : "הלקוח רואה את הכל: תקציב, שווי נקי ויעדים, משימות ופגישות."}
          </p>
        </div>

        <FamilyAccess
          familyId={family.id}
          loginUrl={loginUrl}
          appOrigin={appOrigin}
          members={family.members.map((m) => ({
            id: m.id,
            fullName: m.fullName,
            email: m.email,
            phone: m.phone,
            role: m.role,
            accessToken: m.accessToken,
          }))}
        />

        <QuestionnaireSection
          familyId={family.id}
          kinds={KINDS.map((k) => ({ value: k, title: QUESTIONNAIRES[k].title }))}
          hasRecipients={family.members.some((m) => !!m.email)}
          questionnaires={family.mortgageQuestionnaires.map((q) => ({
            id: q.id,
            title: getQuestionnaire(q.kind).title,
            submitted: q.status === "submitted",
            createdAt: q.createdAt.toLocaleDateString("he-IL"),
            submittedAt: q.submittedAt ? q.submittedAt.toLocaleDateString("he-IL") : null,
            meetingLabel: q.meetingAt
              ? q.meetingAt.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
              : null,
            meetingPlace: q.meetingPlace,
            link: `${appOrigin}/q/${q.token}`,
          }))}
        />

        <Link
          href={`/admin/families/${family.id}/mapping`}
          className="mt-3 flex items-center justify-between rounded-2xl border border-brand-mand/40 bg-brand-mand/10 p-4 text-sm font-medium text-brand-teal"
        >
          <span>
            המיפוי של המשפחה
            <span className="block text-xs font-normal text-brand-teal/70">
              תמונת מצב חודשית ושנתית, פירוט מהבנק ותכנון
            </span>
          </span>
          <span aria-hidden>←</span>
        </Link>

        {showOnboardingLink && (
          <div className="mt-3 rounded-2xl border border-brand-terracotta/30 bg-brand-terracotta/10 p-4 text-sm text-brand-teal">
            <p className="font-medium">קישור לשאלון קליטה</p>
            <p className="mt-1 break-all text-xs text-brand-teal/70">
              /onboarding/{family.onboardingToken}
            </p>
          </div>
        )}

        {family.questionnaires[0] && (
          <OnboardingAnswers
            responses={(family.questionnaires[0].responses ?? {}) as Record<string, unknown>}
            submittedAt={family.questionnaires[0].submittedAt.toLocaleDateString("he-IL")}
          />
        )}

        <PensionSection familyId={family.id} />

        <InsightsSection
          familyId={family.id}
          insights={family.advisorInsights.map((i) => ({
            id: i.id,
            severity: i.severity as InsightView["severity"],
            title: i.title,
            detail: i.detail,
            createdAt: isoDay(i.createdAt),
          }))}
        />

        <RecordingSection familyId={family.id} today={today} recordings={recordings} />

        <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
          <h2 className="text-sm font-semibold text-brand-teal">מסמכים</h2>

          {family.documents.length > 0 && (
            <div className="mt-3">
              {family.documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  familyId={family.id}
                  storagePath={doc.storagePath}
                  filename={doc.filename}
                  tag={doc.tag}
                  date={doc.createdAt.toLocaleDateString("he-IL")}
                />
              ))}
            </div>
          )}

          <DocumentUploadForm familyId={family.id} />
        </div>

        <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
          <h2 className="text-sm font-semibold text-brand-teal">סיכומים שפורסמו ללקוח</h2>

          {family.meetingSummaries.length > 0 && (
            <div className="mt-3 space-y-3">
              {family.meetingSummaries.map((meeting) => (
                <div key={meeting.id} className="rounded-lg bg-gray-50 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-gray-800">
                      {meeting.title}
                    </span>
                    <span className="text-xs text-gray-400">
                      {meeting.meetingDate.toLocaleDateString("he-IL")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{meeting.summary}</p>
                  {meeting.nextFocus && (
                    <p className="mt-1 text-xs font-medium text-brand-teal">
                      הבא בתור: {meeting.nextFocus}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <details className="mt-4 border-t border-gray-100 pt-4">
            <summary className="cursor-pointer text-xs font-medium text-gray-600">הוספה ידנית (בלי AI)</summary>
          <form
            action={addMeetingSummary}
            className="mt-3 space-y-2"
          >
            <input type="hidden" name="familyId" value={family.id} />
            <input
              type="text"
              name="title"
              required
              placeholder='כותרת (למשל "פגישה 3 - קרן חירום")'
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="date"
              name="meetingDate"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <textarea
              name="summary"
              required
              rows={3}
              placeholder="על מה דיברנו בפגישה"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <textarea
              name="nextFocus"
              rows={2}
              placeholder="על מה נתמקד בפגישה הבאה (יוצג ללקוח באזור האישי)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white hover:bg-brand-teal-dark"
            >
              הוספת סיכום
            </button>
          </form>
          </details>
        </div>

        <div id="tasks" className="mt-5 scroll-mt-6 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
          <h2 className="text-sm font-semibold text-brand-teal">משימות</h2>

          {tasks.length > 0 && (
            <div className="mt-3 space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium text-gray-800">{task.title}</span>
                    <span
                      className={`text-xs ${
                        task.status === "done"
                          ? "text-emerald-600"
                          : task.isOverdue
                            ? "text-red-600"
                            : "text-gray-400"
                      }`}
                    >
                      {task.status === "done"
                        ? "הושלם"
                        : task.deadline.toLocaleDateString("he-IL")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {TASK_TYPE_LABEL[task.taskType]}
                    {task.description && ` · ${task.description}`}
                  </p>
                </div>
              ))}
            </div>
          )}

          <form
            action={addTask}
            className="mt-4 space-y-2 border-t border-gray-100 pt-4"
          >
            <input type="hidden" name="familyId" value={family.id} />
            <input
              type="text"
              name="title"
              required
              placeholder='כותרת (למשל "פתיחת קרן חירום")'
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <textarea
              name="description"
              rows={2}
              placeholder="פירוט (אופציונלי)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="date"
                name="deadline"
                required
                className="w-1/2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <select
                name="taskType"
                className="w-1/2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                defaultValue="habit"
              >
                <option value="habit">הרגל</option>
                <option value="savings">חיסכון</option>
              </select>
            </div>
            <input
              type="number"
              name="savingsAmountAnnual"
              step="0.01"
              placeholder="חיסכון שנתי משוער (₪, למשימת חיסכון בלבד)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="url"
              name="toolboxLink"
              placeholder="קישור לכלי (אופציונלי)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="url"
              name="videoUrl"
              placeholder="קישור לסרטון (אופציונלי)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white hover:bg-brand-teal-dark"
            >
              הוספת משימה
            </button>
          </form>
        </div>
      </div>
    </AdminShell>
  );
}
