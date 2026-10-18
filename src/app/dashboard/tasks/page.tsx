import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getFamilyMeetingSummaries } from "@/lib/meetings";
import { getFamilyTasks, getFamilyTaskProgress, getFamilySavingsProgress } from "@/lib/tasks";
import { getFamilyDocuments } from "@/lib/documents";
import { completeTask } from "../actions";
import DocumentRow from "../DocumentRow";
import DashboardNav from "../DashboardNav";
import RiseCard, { formatShekel } from "../RiseCard";
import SubTabs, { TASKS_REPORTS_TABS } from "../SubTabs";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.familyMember.findUnique({
    where: { authUserId: user.id },
  });
  if (!member) redirect("/login");

  const [meetingSummaries, tasks, taskProgress, savingsProgress, documents] = await Promise.all([
    getFamilyMeetingSummaries(member.familyId),
    getFamilyTasks(member.familyId),
    getFamilyTaskProgress(member.familyId),
    getFamilySavingsProgress(member.familyId),
    getFamilyDocuments(member.familyId),
  ]);

  const openTasks = tasks.filter((t) => t.status !== "done");
  const nextFocus = meetingSummaries.find((m) => m.nextFocus)?.nextFocus;
  const isEmpty =
    meetingSummaries.length === 0 &&
    tasks.length === 0 &&
    documents.length === 0 &&
    !savingsProgress;

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-32 pt-6 text-ru-ink">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-bold">משימות ודוחות</h1>
        <p className="text-sm text-ru-muted">מה סיכמנו, ומה הצעד הבא</p>

        <DashboardNav />
        <SubTabs items={TASKS_REPORTS_TABS} active="/dashboard/tasks" />

        {isEmpty && (
          <p className="mt-10 text-center text-sm text-ru-muted">
            עוד אין כאן כלום. אחרי הפגישה הראשונה יופיעו כאן הסיכום והמשימות.
          </p>
        )}

        {nextFocus && (
          <div className="mt-5 rounded-3xl bg-ru-blue p-5 text-white shadow-[0_6px_20px_rgba(91,123,255,0.35)]">
            <p className="text-xs font-semibold text-white/80">על מה נתמקד בפגישה הבאה</p>
            <p className="mt-1 text-base font-medium leading-relaxed">{nextFocus}</p>
          </div>
        )}

        {(taskProgress.total > 0 || savingsProgress) && (
          <div className="mt-6 space-y-3">
            {taskProgress.total > 0 && (
              <div className="rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold">התקדמות במשימות</h3>
                  <span className="text-sm font-semibold text-ru-blue">
                    {taskProgress.completed} מתוך {taskProgress.total}
                  </span>
                </div>
                <div className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-ru-blue-soft">
                  <div
                    className="h-full rounded-full bg-ru-blue"
                    style={{ width: `${Math.min(taskProgress.percent, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {savingsProgress && (
              <RiseCard
                title="חיסכון שנתי מהמשימות"
                actualLabel="הושג"
                actual={savingsProgress.achieved}
                expectedLabel="יעד"
                expected={formatShekel(savingsProgress.target)}
                percent={savingsProgress.percent}
                tone="green"
              />
            )}
          </div>
        )}

        {openTasks.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-bold">המשימות שלי</h2>
            <div className="space-y-3">
              {openTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-bold">{task.title}</span>
                    <span
                      className={`shrink-0 text-xs ${
                        task.isOverdue ? "font-semibold text-ru-pink" : "text-ru-muted"
                      }`}
                    >
                      {task.isOverdue ? "באיחור · " : ""}
                      {task.deadline.toLocaleDateString("he-IL")}
                    </span>
                  </div>
                  {task.description && (
                    <p className="mt-1 text-sm text-ru-ink/70">{task.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {task.toolboxLink && (
                      <a
                        href={task.toolboxLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-ru-blue underline"
                      >
                        כלי
                      </a>
                    )}
                    {task.videoUrl && (
                      <a
                        href={task.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-ru-blue underline"
                      >
                        סרטון
                      </a>
                    )}
                  </div>
                  <form action={completeTask} className="mt-3">
                    <input type="hidden" name="id" value={task.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-ru-blue px-4 py-2 text-xs font-bold text-white"
                    >
                      סמן כהושלם
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {meetingSummaries.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-bold">סיכומי הפגישות שלנו</h2>
            <div className="space-y-3">
              {meetingSummaries.map((meeting) => (
                <div
                  key={meeting.id}
                  className="rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold">{meeting.title}</span>
                    <span className="text-xs text-ru-muted">
                      {meeting.meetingDate.toLocaleDateString("he-IL")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ru-ink/70">{meeting.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {documents.length > 0 && (
          <div className="mt-8 rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]">
            <h2 className="text-lg font-bold">המסמכים וההקלטות שלנו</h2>
            <div className="mt-2">
              {documents.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  storagePath={doc.storagePath}
                  filename={doc.filename}
                  tag={doc.tag}
                  date={doc.createdAt.toLocaleDateString("he-IL")}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
