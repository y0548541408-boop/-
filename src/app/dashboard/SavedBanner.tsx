"use client";

export type EntryStatus = "saved" | "undone" | null;

export default function SavedBanner({
  status,
  onUndo,
  pending,
  detail,
}: {
  status: EntryStatus;
  onUndo?: () => void;
  pending: boolean;
  // e.g. what's left in the category after this entry
  detail?: string | null;
}) {
  if (!status) return null;

  if (status === "undone") {
    return (
      <div className="mt-3 rounded-2xl bg-ru-blue-soft px-4 py-3 text-sm font-semibold text-ru-blue">
        התנועה בוטלה ונמחקה.
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-ru-green-soft px-4 py-3 text-sm font-semibold text-ru-green">
      <span>
        נשמר ✓ {detail ? <span className="font-bold text-ru-ink">{detail}</span> : "אפשר להוסיף עוד."}
      </span>
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          disabled={pending}
          className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ru-pink disabled:opacity-50"
        >
          טעות? מחיקת התנועה
        </button>
      )}
    </div>
  );
}
