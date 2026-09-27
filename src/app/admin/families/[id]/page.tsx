import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdvisor } from "@/lib/advisor";
import { prisma } from "@/lib/prisma";
import { uploadDocument, addMeetingSummary } from "./actions";
import DocumentRow from "./DocumentRow";

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

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-8">
      <div className="mx-auto max-w-md">
        <Link href="/admin" className="text-xs text-gray-400 underline">
          ← חזרה ללקוחות
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-brand-navy">
          {family.displayName}
        </h1>

        <div className="mt-5 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm shadow-brand-navy/5">
          <h2 className="text-sm font-semibold text-brand-navy">מסמכים והקלטות</h2>

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
              className="w-full text-sm text-gray-600 file:ml-3 file:rounded-lg file:border-0 file:bg-brand-navy/5 file:px-3 file:py-2 file:text-brand-navy"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark"
            >
              העלאה
            </button>
          </form>
        </div>

        <div className="mt-5 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-sm shadow-brand-navy/5">
          <h2 className="text-sm font-semibold text-brand-navy">סיכומי פגישות</h2>

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
                    <p className="mt-1 text-xs font-medium text-brand-navy">
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
              className="w-full rounded-lg bg-brand-navy px-3 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark"
            >
              הוספת סיכום
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
