"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { importPictureWorkbook } from "@/app/mapping/actions";

// The advisor's own workbook (תמונת מצב כלכלית) goes straight into this family's
// picture: monthly and annual tabs. The client sees it on their own mapping screen.
export function PictureImport({ familyId }: { familyId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("familyId", familyId);
    try {
      const res = await importPictureWorkbook(fd);
      setResult("error" in res ? { ok: false, text: res.error } : { ok: true, text: res.message ?? file.name });
    } catch {
      setResult({ ok: false, text: `${file.name}: ההעלאה נכשלה. נסו שוב.` });
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <section className="mt-5 rounded-2xl border border-ru-line bg-white p-4">
      <h2 className="text-lg font-bold text-ru-blue">העלאת תמונת מצב מקובץ אקסל</h2>
      <p className="mt-1 text-sm text-ru-muted">
        מעלים את קובץ תמונת המצב הכלכלית של המשפחה. הסכומים, היעדים וההערות נכנסים לשורות של התמונה החודשית והשנתית.
        שורה שלא הייתה בתבנית נוספת לקבוצה הקרובה. תאים ריקים לא מוחקים מה שכבר מולא באפליקציה.
      </p>
      <label
        className={`mt-3 flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-ru-blue px-5 py-3 text-base font-bold text-white ${
          busy ? "opacity-60" : ""
        }`}
      >
        {busy ? "קורא את הקובץ..." : "בחירת קובץ אקסל"}
        <input
          ref={input}
          type="file"
          accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
      {result && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${result.ok ? "bg-ru-green-soft text-ru-ink" : "bg-ru-pink-soft text-ru-ink"}`}>
          {result.text}
        </p>
      )}
    </section>
  );
}
