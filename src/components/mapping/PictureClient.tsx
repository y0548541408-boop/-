"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  savePictureLine,
  addPictureLine,
  removePictureLine,
  setHouseholdSize,
  applyPictureToPlan,
} from "@/app/mapping/actions";

const shekel = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

type Line = {
  id: string;
  name: string;
  amount: number;
  targetAmount: number | null;
  priority: number | null;
  notes: string | null;
  whenText: string | null;
};

// One line of the picture: the name, the amount today, and (under "פרטים")
// the new goal, the priority and a note. Every field saves when you leave it.
export function PictureLineRow({
  familyId,
  line,
  hint,
  showWhen,
}: {
  familyId?: string;
  line: Line;
  hint?: string;
  showWhen?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(line.amount ? String(line.amount) : "");
  const [target, setTarget] = useState(line.targetAmount !== null ? String(line.targetAmount) : "");
  const [notes, setNotes] = useState(line.notes ?? "");
  const [when, setWhen] = useState(line.whenText ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When the line changes from the other side (the advisor or the family), show it here too.
  const [seen, setSeen] = useState({ a: line.amount, t: line.targetAmount, n: line.notes, w: line.whenText });
  if (seen.a !== line.amount || seen.t !== line.targetAmount || seen.n !== line.notes || seen.w !== line.whenText) {
    setSeen({ a: line.amount, t: line.targetAmount, n: line.notes, w: line.whenText });
    setAmount(line.amount ? String(line.amount) : "");
    setTarget(line.targetAmount !== null ? String(line.targetAmount) : "");
    setNotes(line.notes ?? "");
    setWhen(line.whenText ?? "");
  }

  function save(
    patch: Partial<{
      amount: number | null;
      targetAmount: number | null;
      priority: number | null;
      notes: string | null;
      whenText: string | null;
    }>
  ) {
    setError(null);
    start(async () => {
      const res = await savePictureLine({ familyId, id: line.id, ...patch });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
      router.refresh();
    });
  }

  const hasDetails = line.targetAmount !== null || !!line.notes || !!line.whenText;

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold leading-snug">{line.name}</p>
          {hint && <p className="text-base leading-snug text-ru-muted">{hint}</p>}
          {line.targetAmount !== null && line.targetAmount !== line.amount && (
            <p className="text-base font-bold text-brand-mand">היעד: {shekel(line.targetAmount)}</p>
          )}
        </div>
        <label className="flex shrink-0 items-center gap-1 rounded-xl border border-ru-line bg-ru-bg px-2 focus-within:border-ru-blue">
          <span className="text-ru-muted">₪</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            aria-label={`סכום עבור ${line.name}`}
            value={amount}
            placeholder="0"
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => {
              const next = amount === "" ? 0 : Number(amount);
              if (next !== line.amount) save({ amount: next });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="min-h-12 w-24 bg-transparent font-num text-xl font-bold outline-none"
          />
        </label>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="min-h-11 pe-3 text-base font-bold text-ru-blue"
        >
          {open ? "סגירה" : hasDetails ? "יעד והערות ✓" : "יעד והערות"}
        </button>
        <span className="text-base text-ru-muted">{pending ? "שומר..." : saved ? "נשמר ✓" : ""}</span>
      </div>

      {open && (
        <div className="mb-1 space-y-4 rounded-2xl bg-ru-bg p-4">
          <label className="block">
            <span className="text-base font-bold">היעד החדש שלנו</span>
            <span className="mt-0.5 block text-base text-ru-muted">
              כמה זה צריך להיות אחרי השינוי. באותו סוג כמו השורה: בחודש בחודשית, בשנה בשנתית.
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={target}
              placeholder="עוד לא קבענו"
              onChange={(e) => setTarget(e.target.value)}
              onBlur={() => {
                const next = target === "" ? null : Number(target);
                if (next !== line.targetAmount) save({ targetAmount: next });
              }}
              className="mt-1 min-h-12 w-full rounded-xl border border-ru-line bg-white px-3 font-num text-lg"
            />
          </label>

          {showWhen && (
            <label className="block">
              <span className="text-base font-bold">זמן משוער</span>
              <input
                value={when}
                placeholder="למשל: אדר, לפני פסח"
                onChange={(e) => setWhen(e.target.value)}
                onBlur={() => {
                  if (when !== (line.whenText ?? "")) save({ whenText: when });
                }}
                className="mt-1 min-h-12 w-full rounded-xl border border-ru-line bg-white px-3 text-lg"
              />
            </label>
          )}

          <label className="block">
            <span className="text-base font-bold">הערות</span>
            <span className="mt-0.5 block text-base text-ru-muted">
              מה חשוב לדעת על השורה, למשל: אפשר להוזיל, מתי זה חוזר, מה צריך לעשות כדי להגיע ליעד.
            </span>
            <textarea
              rows={2}
              value={notes}
              placeholder="כתבו כאן"
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== (line.notes ?? "")) save({ notes });
              }}
              className="mt-1 w-full rounded-xl border border-ru-line bg-white px-3 py-2 text-lg"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              if (!window.confirm(`להסיר את השורה "${line.name}"?`)) return;
              start(async () => {
                await removePictureLine({ familyId, id: line.id });
                router.refresh();
              });
            }}
            className="min-h-11 text-base text-ru-muted underline hover:text-ru-pink"
          >
            הסרת השורה
          </button>
        </div>
      )}
      {error && <p className="text-sm text-ru-pink">{error}</p>}
    </div>
  );
}

export function AddPictureLine({
  familyId,
  period,
  kind,
  groupName,
  subGroup,
}: {
  familyId?: string;
  period: "monthly" | "annual";
  kind: "income" | "expense";
  groupName: string;
  subGroup?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 min-h-12 w-full rounded-xl border-2 border-dashed border-ru-line text-base font-bold text-ru-blue"
      >
        ＋ שורה חדשה
      </button>
    );
  }

  return (
    <form
      className="mt-1 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await addPictureLine({ familyId, period, kind, groupName, subGroup, name });
          if ("error" in res) {
            setError(res.error);
            return;
          }
          setName("");
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="שם השורה"
        className="min-h-12 min-w-0 flex-1 rounded-xl border border-ru-line bg-ru-bg px-3 text-base"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-xl bg-ru-blue px-4 font-bold text-white disabled:opacity-60"
      >
        {pending ? "..." : "הוספה"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="min-h-12 px-2 text-ru-muted">
        ביטול
      </button>
      {error && <p className="basis-full text-sm text-ru-pink">{error}</p>}
    </form>
  );
}

export function HouseholdSize({ familyId, size }: { familyId?: string; size: number | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(size ? String(size) : "");
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-base font-bold">כמה נפשות בבית?</span>
      <input
        type="number"
        inputMode="numeric"
        min="1"
        max="30"
        value={value}
        disabled={pending}
        placeholder="למשל 5"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const next = value === "" ? null : Number(value);
          if (next === size) return;
          start(async () => {
            await setHouseholdSize({ familyId, size: next });
            router.refresh();
          });
        }}
        className="min-h-12 w-24 rounded-xl border border-ru-line bg-ru-bg px-3 text-center font-num text-lg font-bold"
      />
    </label>
  );
}

// Turns the picture into the plan: each category gets what we decided.
export function ApplyPictureToPlan({ familyId }: { familyId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run(onlyEmpty: boolean) {
    if (!onlyEmpty && !window.confirm("לדרוס את כל התכנון הקיים בסכומים מתמונת המצב?")) return;
    start(async () => {
      const res = await applyPictureToPlan({ familyId, onlyEmpty });
      setMsg("error" in res ? res.error : res.message ?? null);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 rounded-3xl bg-ru-blue-soft p-4">
      <p className="text-lg font-bold text-ru-blue">מתמונת המצב לתכנון</p>
      <p className="text-base">
        כל קטגוריה מקבלת את מה שהחלטנו: היעד החדש, ואם לא קבענו יעד אז הסכום של היום. סכומים שנתיים נכנסים לפי חלק אחד מ-12.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(true)}
          className="min-h-12 rounded-2xl bg-ru-blue px-4 font-bold text-white disabled:opacity-60"
        >
          {pending ? "ממלא..." : "למלא את מה שריק בתכנון"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(false)}
          className="min-h-12 rounded-2xl bg-white px-4 font-bold text-ru-blue disabled:opacity-60"
        >
          למלא הכל מחדש
        </button>
      </div>
      {msg && <p className="mt-2 text-base font-bold">{msg}</p>}
    </div>
  );
}
