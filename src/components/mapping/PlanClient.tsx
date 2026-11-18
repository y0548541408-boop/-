"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPlannedAmount, applyMappingToPlan, applyPictureToPlan } from "@/app/mapping/actions";

const shekel = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

// One plan line: the past (from the mapping) beside the number we decide on.
export function PlanLine({
  familyId,
  kind,
  id,
  name,
  mapped,
  planned,
  hasMapping,
  source = "bank",
}: {
  familyId?: string;
  kind: "expense" | "income";
  id: string;
  name: string;
  mapped: number;
  planned: number;
  hasMapping: boolean;
  source?: "picture" | "bank";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(planned ? String(planned) : "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show a change made from the other side (advisor or family).
  const [seenPlanned, setSeenPlanned] = useState(planned);
  if (seenPlanned !== planned) {
    setSeenPlanned(planned);
    setValue(planned ? String(planned) : "");
  }

  function save(next: string) {
    const amount = next === "" ? 0 : Number(next);
    if (amount === planned) return;
    setError(null);
    start(async () => {
      const res = await setPlannedAmount({ familyId, kind, categoryId: id, amount });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      router.refresh();
    });
  }

  const diff = planned - mapped;
  return (
    <div className="rounded-2xl bg-white px-4 py-3.5 shadow-[0_2px_12px_rgba(11,95,88,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{name}</p>
          {hasMapping && mapped > 0 && (
            <p className="text-sm text-ru-muted">
              {source === "picture" ? "בתמונת המצב" : kind === "expense" ? "עד היום יצא" : "עד היום נכנס"}{" "}
              <span className="font-num">{shekel(mapped)}</span> בחודש
            </p>
          )}
        </div>
        <label className="flex shrink-0 items-center gap-1 rounded-xl border border-ru-line bg-ru-bg px-2 focus-within:border-ru-blue">
          <span className="text-ru-muted">₪</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="50"
            aria-label={`תכנון חודשי עבור ${name}`}
            value={value}
            placeholder="0"
            onChange={(e) => setValue(e.target.value)}
            onBlur={(e) => save(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="min-h-12 w-24 bg-transparent font-num text-lg font-bold outline-none"
          />
        </label>
      </div>
      <div className="mt-1.5 flex min-h-5 items-center justify-between gap-2 text-sm">
        <span>
          {hasMapping && planned > 0 && mapped > 0 && Math.abs(diff) >= 50 && (
            <span className={kind === "expense" ? (diff < 0 ? "text-ru-green" : "text-brand-mand") : "text-ru-muted"}>
              {kind === "expense"
                ? diff < 0
                  ? `חוסכים ${shekel(-diff)} בחודש לעומת היום`
                  : `${shekel(diff)} יותר ממה שיצא עד היום`
                : diff < 0
                  ? `${shekel(-diff)} פחות מהממוצע`
                  : `${shekel(diff)} יותר מהממוצע`}
            </span>
          )}
          {hasMapping && mapped > 0 && !planned && (
            <button
              type="button"
              onClick={() => {
                const v = String(Math.round(mapped / 50) * 50);
                setValue(v);
                save(v);
              }}
              className="font-bold text-ru-blue underline"
            >
              לקחת את {shekel(Math.round(mapped / 50) * 50)} מהמיפוי
            </button>
          )}
        </span>
        <span className="text-ru-muted">{pending ? "שומר..." : saved ? "נשמר ✓" : ""}</span>
      </div>
      {error && <p className="text-sm text-ru-pink">{error}</p>}
    </div>
  );
}

export function FillFromMapping({ familyId, source = "bank" }: { familyId?: string; source?: "picture" | "bank" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run(onlyEmpty: boolean) {
    if (!onlyEmpty && !window.confirm("לדרוס את כל התכנון הקיים בממוצעים מהמיפוי?")) return;
    start(async () => {
      const res =
        source === "picture"
          ? await applyPictureToPlan({ familyId, onlyEmpty })
          : await applyMappingToPlan({ familyId, onlyEmpty });
      setMsg("error" in res ? res.error : res.message ?? null);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-3xl bg-ru-blue-soft p-4">
      <p className="text-base font-bold text-ru-blue">נקודת התחלה מהירה</p>
      <p className="text-base">{source === "picture" ? "ממלאים את התכנון לפי תמונת המצב: היעד החדש שקבענו, ואם אין יעד אז הסכום של היום." : "ממלאים את התכנון לפי מה שיצא עד היום, ואז מורידים איפה שאפשר."}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(true)}
          className="min-h-12 rounded-2xl bg-ru-blue px-4 font-bold text-white disabled:opacity-60"
        >
          {pending ? "ממלא..." : "למלא את מה שריק"}
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
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}
