"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  uploadMappingFile,
  assignMappingCategory,
  setMappingExcluded,
  addCashEstimate,
  removeCashEstimate,
  removeMappingUpload,
} from "@/app/mapping/actions";

type Cat = { id: string; name: string };

const shekel = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

// ---------------------------------------------------------------------------
// Upload: several files at once, sent one by one so big statements still fit.
// ---------------------------------------------------------------------------
export function MappingUploader({ familyId }: { familyId?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<{ ok: boolean; text: string }[]>([]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setLines([]);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      if (familyId) fd.append("familyId", familyId);
      try {
        const res = await uploadMappingFile(fd);
        setLines((l) => [...l, "error" in res ? { ok: false, text: res.error } : { ok: true, text: res.message ?? file.name }]);
      } catch {
        setLines((l) => [...l, { ok: false, text: `${file.name}: ההעלאה נכשלה. אולי הקובץ גדול מדי.` }]);
      }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <label
        className={`flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand-mand px-5 py-4 text-center text-base font-bold text-white shadow-[0_6px_18px_rgba(255,106,43,0.35)] ${
          busy ? "opacity-60" : ""
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M12 16V4M7 9l5-5 5 5M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {busy ? "קורא את הקבצים..." : "העלאת קבצים מהבנק ומהאשראי"}
        <input
          ref={input}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.html,.htm,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="sr-only"
          disabled={busy}
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
      {lines.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {lines.map((l, i) => (
            <li key={i} className={`rounded-xl px-3 py-2 ${l.ok ? "bg-ru-green-soft text-ru-ink" : "bg-ru-pink-soft text-ru-ink"}`}>
              {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UploadRow({
  familyId,
  upload,
}: {
  familyId?: string;
  upload: { id: string; filename: string; source: string; rowCount: number; uploadedBy: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="truncate font-bold" dir="auto">{upload.filename}</p>
        <p className="text-ru-muted">
          {upload.source === "credit" ? "פירוט אשראי" : "עובר ושב"} · {upload.rowCount} תנועות ·{" "}
          {upload.uploadedBy === "advisor" ? "הועלה על ידי ישראל" : "הועלה על ידיכם"}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`להסיר את הקובץ ${upload.filename} ואת כל התנועות שלו מהמיפוי?`)) return;
          start(async () => {
            await removeMappingUpload({ familyId, uploadId: upload.id });
            router.refresh();
          });
        }}
        className="min-h-11 shrink-0 rounded-full px-3 text-ru-muted hover:text-ru-pink"
      >
        {pending ? "..." : "הסרה"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unassigned merchants: one choice covers every purchase at that place.
// ---------------------------------------------------------------------------
export function UnassignedRow({
  familyId,
  item,
  categories,
}: {
  familyId?: string;
  item: { id: string; description: string; isIncome: boolean; count: number; total: number; source: string };
  categories: Cat[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(11,95,88,0.07)]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 font-bold" dir="auto">{item.description}</p>
        <p className={`shrink-0 font-num font-bold ${item.isIncome ? "text-ru-green" : ""}`}>
          {item.isIncome ? "+" : ""}
          {shekel(item.total)}
        </p>
      </div>
      <p className="text-sm text-ru-muted">
        {item.isIncome ? "הכנסה" : item.source === "credit" ? "אשראי" : "עובר ושב"}
        {item.count > 1 ? ` · ${item.count} פעמים` : ""}
      </p>
      <select
        aria-label={`קטגוריה עבור ${item.description}`}
        disabled={pending}
        defaultValue=""
        onChange={(e) => {
          const categoryId = e.target.value;
          if (!categoryId) return;
          setError(null);
          start(async () => {
            const res =
              categoryId === "__skip__"
                ? await setMappingExcluded({ familyId, transactionId: item.id, excluded: true })
                : await assignMappingCategory({ familyId, transactionId: item.id, categoryId });
            if ("error" in res) setError(res.error);
            router.refresh();
          });
        }}
        className="mt-3 min-h-12 w-full rounded-xl border border-ru-line bg-ru-bg px-3 text-base"
      >
        <option value="">{pending ? "שומר..." : item.isIncome ? "לאיזו הכנסה זה שייך?" : "לאיזו קטגוריה זה שייך?"}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value="__skip__">לא לספור (העברה בין חשבונות, החזר וכו׳)</option>
      </select>
      {error && <p className="mt-2 text-sm text-ru-pink">{error}</p>}
    </div>
  );
}

export function ExcludedRow({
  familyId,
  item,
}: {
  familyId?: string;
  item: { id: string; description: string; amount: number; occurredAt: string; reason: string | null };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate font-bold" dir="auto">{item.description}</p>
        <p className="text-ru-muted">
          {item.occurredAt} · {shekel(item.amount)}
          {item.reason ? ` · ${item.reason}` : ""}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await setMappingExcluded({ familyId, transactionId: item.id, excluded: false });
            router.refresh();
          })
        }
        className="min-h-11 shrink-0 rounded-full bg-ru-blue-soft px-3 font-bold text-ru-blue"
      >
        {pending ? "..." : "לספור"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cash: a monthly estimate per line ("מזומן לשוק, בערך 800 בחודש").
// ---------------------------------------------------------------------------
export function CashSection({
  familyId,
  categories,
  items,
}: {
  familyId?: string;
  categories: Cat[];
  items: { id: string; description: string; amount: number; categoryName: string | null }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await addCashEstimate({ familyId, description, amount: Number(amount), categoryId });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setDescription("");
      setAmount("");
      router.refresh();
    });
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-4 divide-y divide-ru-line">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <p className="font-bold">{c.description}</p>
                <p className="text-ru-muted">{c.categoryName ?? "בלי קטגוריה"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-num font-bold">{shekel(c.amount)} לחודש</span>
                <button
                  type="button"
                  aria-label={`הסרת ${c.description}`}
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await removeCashEstimate({ familyId, id: c.id });
                      router.refresh();
                    })
                  }
                  className="min-h-11 rounded-full px-2 text-ru-muted hover:text-ru-pink"
                >
                  הסרה
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={add} className="space-y-2.5">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="על מה? למשל: שוק, דמי כיס, ספר"
          className="min-h-12 w-full rounded-xl border border-ru-line bg-ru-bg px-3 text-base"
        />
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="בערך כמה בחודש"
            className="min-h-12 w-1/2 rounded-xl border border-ru-line bg-ru-bg px-3 text-base"
          />
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="min-h-12 w-1/2 rounded-xl border border-ru-line bg-ru-bg px-3 text-base"
          >
            <option value="">קטגוריה</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-ru-pink">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded-2xl bg-ru-blue px-4 font-bold text-white disabled:opacity-60"
        >
          {pending ? "שומר..." : "הוספת מזומן"}
        </button>
      </form>
    </div>
  );
}
