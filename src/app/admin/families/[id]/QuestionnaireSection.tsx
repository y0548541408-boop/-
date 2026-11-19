"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendQuestionnaireToFamily } from "./questionnaireActions";

export type SentQuestionnaire = {
  id: string;
  title: string;
  submitted: boolean;
  createdAt: string;
  submittedAt: string | null;
  meetingLabel: string | null;
  meetingPlace: string | null;
  link: string;
};

export default function QuestionnaireSection({
  familyId,
  kinds,
  hasRecipients,
  questionnaires,
}: {
  familyId: string;
  kinds: { value: string; title: string }[];
  hasRecipients: boolean;
  questionnaires: SentQuestionnaire[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function send(formData: FormData) {
    setError(null);
    setMessage(null);
    formData.set("familyId", familyId);
    startTransition(async () => {
      const result = await sendQuestionnaireToFamily(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setMessage(
        result.failed === 0
          ? `השאלון נשלח במייל ל-${result.sent} ${result.sent === 1 ? "כתובת" : "כתובות"}.`
          : `נשלח ל-${result.sent}, ולא הצלחנו לשלוח ל-${result.failed}. אפשר להעתיק את הקישור ולשלוח בוואטסאפ.`
      );
      router.refresh();
    });
  }

  async function copyLink(q: SentQuestionnaire) {
    try {
      await navigator.clipboard.writeText(q.link);
      setCopied(q.id);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
      <h2 className="text-base font-semibold text-brand-teal">שאלון ללקוח</h2>
      <p className="mt-1 text-sm text-gray-500">
        שולחים את השאלון במייל יחד עם מועד הפגישה והמיקום. הלקוח לוחץ על הקישור וממלא בלי סיסמה. כשהוא מסיים, התשובות מופיעות כאן.
      </p>

      {questionnaires.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {questionnaires.map((q) => (
            <div key={q.id} className="rounded-xl bg-gray-50 p-3.5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-gray-800">{q.title}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    q.submitted ? "bg-brand-teal/10 text-brand-teal" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {q.submitted ? `מולא ${q.submittedAt ?? ""}` : "ממתין למילוי"}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                נשלח {q.createdAt}
                {q.meetingLabel && ` · פגישה: ${q.meetingLabel}`}
                {q.meetingPlace && ` · ${q.meetingPlace}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {q.submitted ? (
                  <Link
                    href={`/admin/mortgage/${q.id}`}
                    className="inline-flex min-h-10 items-center rounded-lg bg-brand-teal px-4 text-sm font-medium text-white"
                  >
                    לדוח המפורט
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => copyLink(q)}
                    className="min-h-10 rounded-lg border border-gray-200 px-4 text-sm text-gray-600"
                  >
                    {copied === q.id ? "הקישור הועתק ✓" : "העתקת הקישור"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasRecipients ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          כדי לשלוח שאלון צריך מייל לפחות לאחד מבני המשפחה. מוסיפים אותו בגישה לאזור האישי.
        </p>
      ) : (
        <form action={send} className="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700">שליחת שאלון חדש</p>
          <fieldset>
            <legend className="sr-only">סוג השאלון</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {kinds.map((k, i) => (
                <label key={k.value} className="relative cursor-pointer">
                  <input type="radio" name="kind" value={k.value} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="flex min-h-12 items-center justify-center rounded-xl border-2 border-gray-200 px-3 text-center text-sm font-medium text-gray-700 peer-checked:border-brand-teal peer-checked:bg-brand-teal peer-checked:text-white">
                    {k.title}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm text-gray-600">
            מועד הפגישה (לא חובה)
            <input
              type="datetime-local"
              name="meetingAt"
              dir="ltr"
              className="mt-1 min-h-12 w-full rounded-lg border border-gray-200 px-3 text-base"
            />
          </label>
          <label className="block text-sm text-gray-600">
            מיקום הפגישה (לא חובה)
            <input
              type="text"
              name="meetingPlace"
              maxLength={200}
              placeholder="למשל: במשרד, ברחוב ... או בזום"
              className="mt-1 min-h-12 w-full rounded-lg border border-gray-200 px-3 text-base"
            />
          </label>
          <p className="text-xs text-gray-500">
            המייל יישלח לכל מי שיש לו מייל בגישה לאזור האישי. בלי מועד, המייל יכתוב שהמועד יקבע בהמשך.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-brand-teal">{message}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="min-h-12 w-full rounded-lg bg-brand-teal px-3 text-base font-medium text-white hover:bg-brand-teal-dark disabled:opacity-50"
          >
            {isPending ? "שולח..." : "שליחת השאלון במייל ללקוח"}
          </button>
        </form>
      )}
    </div>
  );
}
