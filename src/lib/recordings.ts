import { prisma } from "@/lib/prisma";
import { createAdminClient, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";
import { analyzeMeetingRecording } from "@/lib/gemini";

// Runs the AI analysis for one recording and stores the draft (or the error).
// Safe to call again for a failed recording.
export async function processRecording(recordingId: string): Promise<void> {
  const recording = await prisma.meetingRecording.findUnique({ where: { id: recordingId } });
  if (!recording) return;

  await prisma.meetingRecording.update({
    where: { id: recordingId },
    data: { status: "processing", errorMessage: null },
  });

  try {
    const { data, error } = await createAdminClient()
      .storage.from(DOCUMENTS_BUCKET)
      .download(recording.storagePath);
    if (error || !data) throw new Error(`הורדת ההקלטה נכשלה: ${error?.message ?? "קובץ חסר"}`);

    const draft = await analyzeMeetingRecording({
      audio: await data.arrayBuffer(),
      mimeType: recording.mimeType,
      displayName: recording.id,
    });
    if (!draft.summary) throw new Error("לא הצלחתי להפיק סיכום מההקלטה.");

    await prisma.meetingRecording.update({
      where: { id: recordingId },
      data: {
        status: "ready",
        draftTitle: draft.title,
        draftSummary: draft.summary,
        draftNextFocus: draft.nextFocus || null,
        draftTasks: draft.tasks,
      },
    });
  } catch (err) {
    console.error("processRecording:", err);
    await prisma.meetingRecording.update({
      where: { id: recordingId },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : "שגיאה לא ידועה",
      },
    });
  }
}
