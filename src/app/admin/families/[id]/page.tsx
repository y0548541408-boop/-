import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdvisor } from "@/lib/advisor";
import { prisma } from "@/lib/prisma";
import { getFamilyTasks } from "@/lib/tasks";
import { uploadDocument, addMeetingSummary, toggleFamilyDebt, addTask } from "./actions";
import DocumentRow from "./DocumentRow";

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
    },
  });

  if (!family) redirect("/admin");

  const tasks = await getFamilyTasks(family.id);
  const showOnboardingLink =
    family.onboardingToken &&
    (family.status === "lead" || family.status === "onboarding");

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link href="/admin" className="text-xs text-gray-400 underline">
          ← חזרה ללקוחות
        </Link>
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

        {showOnboardingLink && (
          <div className="mt-3 rounded-2xl border border-brand-terracotta/30 bg-brand-terracotta/10 p-4 text-sm text-brand-teal">
            <p className="font-medium">קישור לשאלון קליטה</p>
            <p className="mt-1 break-all text-xs text-brand-teal/70">
              /onboarding/{family.onboardingToken}
            </p>
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
          <h2 className="text-sm font-semibold text-brand-teal">מסמכים והקלטות</h2>

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

          <form
            action={uploadDocument}
            className="mt-4 space-y-2 border-t border-gray-100 pt-4"
          >
            <input type="hidden" name="familyId" value={family.id} />
            <input
              type="text"
              name="tag"
              required
              placeholder='תגית (למשל "הקלטת פגישה 3" או "תלוש שכר")'
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              type="file"
              name="file"
              required
              className="w-full text-sm text-gray-600 file:ml-3 file:rounded-lg file:border-0 file:bg-brand-teal/5 file:px-3 file:py-2 file:text-brand-teal"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white hover:bg-brand-teal-dark"
            >
              העלאה
            </button>
          </form>
        </div>

        <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
          <h2 className="text-sm font-semibold text-brand-teal">סיכומי פגישות</h2>

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

          <form
            action={addMeetingSummary}
            className="mt-4 space-y-2 border-t border-gray-100 pt-4"
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
        </div>

        <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
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
    </main>
  );
}
