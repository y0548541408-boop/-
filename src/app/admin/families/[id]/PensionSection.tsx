"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ASSET_GROUPS } from "@/lib/netWorthGroups";
import {
  analyzePensionUpload,
  preparePensionUpload,
  savePensionItems,
  type PensionDraft,
} from "./pensionActions";

type Row = { name: string; group: string; value: string; include: boolean };

const BUTTON =
  "rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white hover:bg-brand-teal-dark disabled:opacity-50";
const FIELD = "rounded-lg border border-gray-200 px-2 py-1.5 text-sm";

export default function PensionSection({ familyId }: { familyId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "analyzing" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function analyze() {
    if (!file) return;
    setError(null);
    setDone(null);
    setRows(null);
    setStage("uploading");
    try {
      const prepared = await preparePensionUpload({ familyId, filename: file.name });
      if ("error" in prepared) throw new Error(prepared.error);

      const { error: uploadError } = await createClient()
        .storage.from(prepared.bucket)
        .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: "application/pdf" });
      if (uploadError) throw new Error(`ההעלאה נכשלה: ${uploadError.message}`);

      setStage("analyzing");
      const result: PensionDraft = await analyzePensionUpload({ familyId, path: prepared.path });
      if ("error" in result) throw new Error(result.error);

      setRows(result.items.map((i) => ({ name: i.name, group: i.group, value: String(i.value), include: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "משהו השתבש. נסה שוב.");
    } finally {
      setStage("idle");
    }
  }

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => (prev ? prev.map((r, i) => (i === index ? { ...r, ...patch } : r)) : prev));
  }

  async function save() {
    if (!rows) return;
    const items = rows
      .filter((r) => r.include)
      .map((r) => ({ name: r.name, group: r.group, value: Number(r.value) }));
    if (items.length === 0) return;
    setError(null);
    setStage("saving");
    const res = await savePensionItems({ familyId, items });
    setStage("idle");
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setDone(`נשמרו ${items.length} יתרות בנכסים.`);
    setRows(null);
    setFile(null);
    router.refresh();
  }

  return (
    <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
      <h2 className="text-sm font-semibold text-brand-teal">דוח ממסלקה פנסיונית</h2>
      <p className="mt-0.5 text-xs text-gray-500">
        מעלים PDF, המערכת קוראת את היתרות. אתה בודק ומאשר, ואז הן נכנסות לנכסים של הלקוח.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setRows(null);
            setDone(null);
          }}
          className="text-sm text-gray-600 file:ml-3 file:rounded-lg file:border-0 file:bg-brand-teal/5 file:px-3 file:py-2 file:text-brand-teal"
        />
        <button type="button" onClick={analyze} disabled={!file || stage !== "idle"} className={BUTTON}>
          {stage === "uploading" ? "מעלה..." : stage === "analyzing" ? "קורא את הדוח..." : "קרא את הדוח"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      {done && <p className="mt-2 text-xs font-medium text-brand-teal">{done}</p>}

      {rows && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-600">בדוק את הטיוטה. אפשר לשנות שם, קבוצה וסכום, או לבטל שורה.</p>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_auto_6rem] items-center gap-2 rounded-lg border border-gray-100 p-2">
              <input type="checkbox" checked={r.include} onChange={(e) => update(i, { include: e.target.checked })} />
              <input
                value={r.name}
                onChange={(e) => update(i, { name: e.target.value })}
                className={`${FIELD} min-w-0`}
                aria-label="שם"
              />
              <select value={r.group} onChange={(e) => update(i, { group: e.target.value })} className={FIELD} aria-label="קבוצה">
                {ASSET_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <input
                value={r.value}
                inputMode="numeric"
                onChange={(e) => update(i, { value: e.target.value.replace(/[^\d]/g, "") })}
                className={FIELD}
                aria-label="סכום"
              />
            </div>
          ))}
          <button type="button" onClick={save} disabled={stage !== "idle"} className={`${BUTTON} w-full`}>
            {stage === "saving" ? "שומר..." : "אישור ושמירה לנכסים"}
          </button>
        </div>
      )}
    </div>
  );
}
