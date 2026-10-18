"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";
import { createAdminClient, DOCUMENTS_BUCKET } from "@/lib/supabase/admin";
import { processRecording } from "@/lib/recordings";

export type RecordingResult = { error: string } | { ok: true };

// Gemini accepts these audio containers. m4a is AAC inside MP4.
const AUDIO_TYPES: Record<string, string> = {
  mp3: "audio/mp3",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  flac: "audio/flac",
};

async function ownedFamily(familyId: string) {
  const advisor = await getCurrentAdvisor();
  if (!advisor) return null;
  return prisma.family.findFirst({ where: { id: familyId, advisorId: advisor.id } });
}

// Step 1: hand the browser a one-time upload slot, so the (large) audio file goes
// straight to storage instead of through the server.
export async function prepareRecordingUpload(input: {
  familyId: string;
  filename: string;
}): Promise<
  | { error: string }
  | { bucket: string; path: string; token: string; mimeType: string }
> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };

  const ext = input.filename.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = AUDIO_TYPES[ext];
  if (!mimeType) return { error: "סוג הקובץ לא נתמך. אפשר: mp3, m4a, wav, aac, ogg, flac." };

  const path = `${input.familyId}/recordings/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await createAdminClient()
    .storage.from(DOCUMENTS_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) return { error: "לא הצלחתי להכין העלאה. נסה שוב." };

  return { bucket: DOCUMENTS_BUCKET, path, token: data.token, mimeType };
}

// Step 2: the file is uploaded. Create the record and run the AI in the background.
export async function startRecordingProcessing(input: {
  familyId: string;
  path: string;
  filename: string;
  mimeType: string;
  meetingDate: string;
}): Promise<RecordingResult> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };
  if (!input.path.startsWith(`${input.familyId}/recordings/`)) return { error: "נתיב לא תקין." };

  const meetingDate = new Date(`${input.meetingDate}T12:00:00`);
  if (Number.isNaN(meetingDate.getTime())) return { error: "תאריך לא תקין." };

  const recording = await prisma.meetingRecording.create({
    data: {
      familyId: input.familyId,
      storagePath: input.path,
      filename: input.filename,
      mimeType: input.mimeType,
      meetingDate,
    },
  });

  after(() => processRecording(recording.id));
  revalidatePath(`/admin/families/${input.familyId}`);
  return { ok: true };
}

export async function retryRecording(input: {
  familyId: string;
  id: string;
}): Promise<RecordingResult> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };
  const recording = await prisma.meetingRecording.findFirst({
    where: { id: input.id, familyId: input.familyId },
  });
  if (!recording) return { error: "ההקלטה לא נמצאה." };

  await prisma.meetingRecording.update({
    where: { id: recording.id },
    data: { status: "processing", errorMessage: null },
  });
  after(() => processRecording(recording.id));
  revalidatePath(`/admin/families/${input.familyId}`);
  return { ok: true };
}

export async function discardRecording(input: {
  familyId: string;
  id: string;
}): Promise<RecordingResult> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };
  await prisma.meetingRecording.updateMany({
    where: { id: input.id, familyId: input.familyId, status: { not: "published" } },
    data: { status: "discarded" },
  });
  revalidatePath(`/admin/families/${input.familyId}`);
  return { ok: true };
}

// Final step: only after the advisor reviewed (and possibly edited) the draft does
// anything reach the client.
export async function publishRecording(input: {
  familyId: string;
  id: string;
  title: string;
  summary: string;
  nextFocus: string;
  tasks: { title: string; description: string; deadline: string }[];
}): Promise<RecordingResult> {
  if (!(await ownedFamily(input.familyId))) return { error: "יש להתחבר מחדש." };

  const title = input.title.trim();
  const summary = input.summary.trim();
  if (!title || !summary) return { error: "צריך כותרת וסיכום." };

  const tasks = input.tasks
    .map((t) => ({
      title: t.title.trim(),
      description: t.description.trim(),
      deadline: new Date(`${t.deadline}T12:00:00`),
    }))
    .filter((t) => t.title);
  if (tasks.some((t) => Number.isNaN(t.deadline.getTime()))) return { error: "יש משימה עם תאריך לא תקין." };

  const recording = await prisma.meetingRecording.findFirst({
    where: { id: input.id, familyId: input.familyId, status: "ready" },
  });
  if (!recording) return { error: "ההקלטה כבר פורסמה או לא מוכנה." };

  await prisma.$transaction([
    prisma.meetingSummary.create({
      data: {
        familyId: input.familyId,
        title,
        meetingDate: recording.meetingDate,
        summary,
        nextFocus: input.nextFocus.trim() || null,
      },
    }),
    ...tasks.map((t) =>
      prisma.task.create({
        data: {
          familyId: input.familyId,
          title: t.title,
          description: t.description || null,
          deadline: t.deadline,
        },
      })
    ),
    prisma.meetingRecording.update({ where: { id: recording.id }, data: { status: "published" } }),
  ]);

  revalidatePath(`/admin/families/${input.familyId}`);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
