"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFamilyPermanently } from "./archiveActions";

// Permanent delete: only offered for an archived family, and only after the
// advisor types the family's exact name.
export default function DeleteFamilyForm({ familyId, displayName }: { familyId: string; displayName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await deleteFamilyPermanently({ familyId, confirmName: typed });
    setBusy(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push("/admin");
  }

  if (!open) {
    return (
      <div className="mt-4 text-start">
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-red-600 underline">
          מחיקה סופית של המשפחה
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-700">מחיקה סופית</p>
      <p className="mt-1 text-xs text-red-700">
        כל נתוני המשפחה יימחקו: מסמכים, הקלטות, משימות, סיכומים ונכסים. אי אפשר לשחזר. כדי לאשר, הקלד את שם המשפחה בדיוק: {displayName}
      </p>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className="mt-2 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
        aria-label="שם המשפחה לאישור"
      />
      {error && <p className="mt-2 text-xs font-medium text-red-700">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={busy || typed.trim() !== displayName.trim()}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "מוחק..." : "מחק לצמיתות"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600">
          ביטול
        </button>
      </div>
    </div>
  );
}
