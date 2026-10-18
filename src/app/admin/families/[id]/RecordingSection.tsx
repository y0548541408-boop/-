"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  discardRecording,
  prepareRecordingUpload,
  publishRecording,
  retryRecording,
  startRecordingProcessing,
  type RecordingResult,
} from "./recordingActions";

export type RecordingView = {
  id: string;
  filename: string;
  meetingDate: string; // YYYY-MM-DD
  status: "processing" | "ready" | "failed" | "published";
  stuck: boolean; // processing for too long: probably the background job died
  errorMessage: string | null;
  draftTitle: string;
  draftSummary: string;
  draftNextFocus: string;
  draftTasks: { title: string; description: string; deadline: string }[];
};

const FIELD = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm";
const BUTTON =
  "rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white hover:bg-brand-teal-dark disabled:opacity-50";
const GHOST_BUTTON =
  "rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-brand-teal/30 disabled:opacity-50";

function UploadForm({ familyId, today }: { familyId: string; today: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(today);
  const [stage, setStage] = useState<"idle" | "uploading" | "starting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setStage("uploading");

    try {
      const prepared = await prepareRecordingUpload({ familyId, filename: file.name });
      if ("error" in prepared) throw new Error(prepared.error);

      const { error: uploadError } = await createClient()
        .storage.from(prepared.bucket)
        .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: prepared.mimeType });
      if (uploadError) throw new Error(`ההעלאה נכשלה: ${uploadError.message}`);

      setStage("starting");
      const started = await startRecordingProcessing({
        familyId,
        path: prepared.path,
        filename: file.name,
        mimeType: prepared.mimeType,
        meetingDate: date,
      });
      if ("error" in started) throw new Error(started.error);

      setFile(null);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש. נסה שוב.");
    } finally {
      setStage("idle");
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <input
        type="file"
        accept="audio/*,.m4a,.mp3,.wav,.aac,.ogg,.opus,.flac"
        required
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full text-sm text-gray-600 file:ml-3 file:rounded-lg file:border-0 file:bg-brand-teal/5 file:px-3 file:py-2 file:text-brand-teal"
      />
      <label className="block text-xs text-gray-500">
        תאריך הפגישה
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={`${FIELD} mt-1`}
        />
      </label>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <button type="submit" disabled={stage !== "idle" || !file} className={`${BUTTON} w-full`}>
        {stage === "uploading"
          ? "מעלה את ההקלטה... (בהקלטה ארוכה זה לוקח דקה)"
          : stage === "starting"
            ? "מתחיל עיבוד..."
            : "העלאה והכנת סיכום ומשימות"}
      </button>
    </form>
  );
}

function ReviewForm({ familyId, recording }: { familyId: string; recording: RecordingView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(recording.draftTitle);
  const [summary, setSummary] = useState(recording.draftSummary);
  const [nextFocus, setNextFocus] = useState(recording.draftNextFocus);
  const [tasks, setTasks] = useState(recording.draftTasks);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<RecordingResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function updateTask(index: number, patch: Partial<RecordingView["draftTasks"][number]>) {
    setTasks(tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-medium text-brand-teal">
        טיוטה מוכנה. עבור עליה ותקן לפי הצורך, ורק אחרי הפרסום הלקוח יראה אותה.
      </p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className={FIELD} aria-label="כותרת" />
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        rows={9}
        className={FIELD}
        aria-label="סיכום"
      />
      <textarea
        value={nextFocus}
        onChange={(e) => setNextFocus(e.target.value)}
        rows={2}
        placeholder="על מה נתמקד בפגישה הבאה (לא חובה)"
        className={FIELD}
      />

      <h3 className="pt-1 text-xs font-semibold text-gray-700">משימות ללקוח ({tasks.length})</h3>
      {tasks.map((task, i) => (
        <div key={i} className="space-y-1.5 rounded-lg bg-gray-50 p-2">
          <input
            value={task.title}
            onChange={(e) => updateTask(i, { title: e.target.value })}
            placeholder="כותרת המשימה"
            className={FIELD}
          />
          <input
            value={task.description}
            onChange={(e) => updateTask(i, { description: e.target.value })}
            placeholder="פירוט"
            className={FIELD}
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={task.deadline}
              onChange={(e) => updateTask(i, { deadline: e.target.value })}
              className={FIELD}
            />
            <button
              type="button"
              onClick={() => setTasks(tasks.filter((_, j) => j !== i))}
              className={GHOST_BUTTON}
            >
              הסר
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setTasks([...tasks, { title: "", description: "", deadline: tasks[0]?.deadline ?? recording.meetingDate }])
        }
        className={GHOST_BUTTON}
      >
        ＋ הוספת משימה
      </button>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            run(() => publishRecording({ familyId, id: recording.id, title, summary, nextFocus, tasks }))
          }
          className={`${BUTTON} flex-1`}
        >
          {isPending ? "מפרסם..." : "פרסום ללקוח (סיכום + משימות)"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => discardRecording({ familyId, id: recording.id }))}
          className={GHOST_BUTTON}
        >
          השלך
        </button>
      </div>
    </div>
  );
}

function RecordingCard({ familyId, recording }: { familyId: string; recording: RecordingView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<RecordingResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) setError(result.error);
      router.refresh();
    });
  }

  const date = new Date(`${recording.meetingDate}T12:00:00`).toLocaleDateString("he-IL");

  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-medium text-gray-800">{recording.filename}</span>
        <span className="shrink-0 text-xs text-gray-400">{date}</span>
      </div>

      {recording.status === "processing" && (
        <div className="mt-2 text-xs text-gray-600">
          {recording.stuck ? (
            <>
              <p className="font-medium text-red-600">העיבוד נתקע. אפשר לנסות שוב.</p>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => retryRecording({ familyId, id: recording.id }))}
                className={`${GHOST_BUTTON} mt-1.5`}
              >
                נסה שוב
              </button>
            </>
          ) : (
            <p>מקשיב להקלטה ומכין סיכום ומשימות... זה לוקח כמה דקות, אפשר להמשיך לעבוד.</p>
          )}
        </div>
      )}

      {recording.status === "failed" && (
        <div className="mt-2 text-xs">
          <p className="font-medium text-red-600">העיבוד נכשל.</p>
          {recording.errorMessage && <p className="mt-0.5 break-words text-gray-500">{recording.errorMessage}</p>}
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => retryRecording({ familyId, id: recording.id }))}
              className={GHOST_BUTTON}
            >
              נסה שוב
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => discardRecording({ familyId, id: recording.id }))}
              className={GHOST_BUTTON}
            >
              השלך
            </button>
          </div>
        </div>
      )}

      {recording.status === "ready" && <ReviewForm familyId={familyId} recording={recording} />}

      {recording.status === "published" && (
        <p className="mt-2 text-xs font-medium text-emerald-600">פורסם ללקוח ✓</p>
      )}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export default function RecordingSection({
  familyId,
  today,
  recordings,
}: {
  familyId: string;
  today: string;
  recordings: RecordingView[];
}) {
  const router = useRouter();
  const processing = recordings.some((r) => r.status === "processing" && !r.stuck);

  // While the AI works in the background, check back every few seconds.
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(timer);
  }, [processing, router]);

  return (
    <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
      <h2 className="text-sm font-semibold text-brand-teal">סיכום והקלטת פגישה (AI)</h2>
      <p className="mt-1 text-xs text-gray-500">
        מעלים הקלטה, המערכת מכינה סיכום ללקוח ורשימת משימות. שום דבר לא מגיע ללקוח לפני שאתה מאשר.
      </p>

      {recordings.length > 0 && (
        <div className="mt-3 space-y-2">
          {recordings.map((r) => (
            <RecordingCard key={r.id} familyId={familyId} recording={r} />
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-1">
        <UploadForm familyId={familyId} today={today} />
      </div>
    </div>
  );
}
