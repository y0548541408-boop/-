"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { confirmDocumentUpload, prepareDocumentUpload } from "./documentActions";

const BUTTON =
  "w-full rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white hover:bg-brand-teal-dark disabled:opacity-50";

export default function DocumentUploadForm({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [tag, setTag] = useState("");
  const [stage, setStage] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setStage("uploading");
    try {
      const slot = await prepareDocumentUpload({ familyId, filename: file.name, tag });
      if ("error" in slot) throw new Error(slot.error);

      const { error: uploadError } = await createClient()
        .storage.from(slot.bucket)
        .uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type || undefined });
      if (uploadError) throw new Error(`ההעלאה נכשלה: ${uploadError.message}`);

      setStage("saving");
      const saved = await confirmDocumentUpload({ familyId, path: slot.path, filename: file.name, tag });
      if ("error" in saved) throw new Error(saved.error);

      setFile(null);
      setTag("");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש. נסה שוב.");
    } finally {
      setStage("idle");
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2 border-t border-gray-100 pt-4">
      <input
        type="text"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        required
        placeholder='תגית (למשל "הקלטת פגישה 3" או "תלוש שכר")'
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      <input
        type="file"
        required
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="w-full text-sm text-gray-600 file:ml-3 file:rounded-lg file:border-0 file:bg-brand-teal/5 file:px-3 file:py-2 file:text-brand-teal"
      />
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <button type="submit" disabled={stage !== "idle" || !file || !tag.trim()} className={BUTTON}>
        {stage === "uploading" ? "מעלה את הקובץ..." : stage === "saving" ? "שומר..." : "העלאה"}
      </button>
    </form>
  );
}
