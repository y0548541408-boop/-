"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatShekel } from "../RiseCard";
import { addToGoal, deleteGoal, saveGoal, type Result } from "./actions";

type Goal = {
  id: string;
  title: string;
  target: number;
  current: number;
  percent: number;
  targetDate: string | null;
  monthlyNeeded: number | null;
};

const CARD = "rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]";
const INPUT = "rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base";

function useAction() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<Result>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onDone?.();
      router.refresh();
    });
  }
  return { isPending, error, run };
}

function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { isPending, error, run } = useAction();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [target, setTarget] = useState(goal ? String(goal.target) : "");
  const [current, setCurrent] = useState(goal ? String(goal.current) : "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");

  return (
    <form
      className={`${CARD} space-y-3`}
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveGoal({
              id: goal?.id,
              title,
              target: Number(target),
              current: current ? Number(current) : 0,
              targetDate: targetDate || undefined,
            }),
          onClose
        );
      }}
    >
      <h3 className="text-lg font-bold">{goal ? "עריכת יעד" : "יעד חדש"}</h3>
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder='למשל "קרן חירום" או "דירה"'
        className={`${INPUT} w-full`}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          required
          type="number"
          inputMode="decimal"
          min="1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="סכום היעד"
          className={INPUT}
        />
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="כבר נחסך"
          className={INPUT}
        />
      </div>
      <label className="block text-xs text-ru-muted">
        עד מתי (לא חובה)
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className={`${INPUT} mt-1 w-full`}
        />
      </label>
      {error && <p className="text-sm font-semibold text-ru-pink">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-full bg-ru-blue px-4 py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(91,123,255,0.35)] disabled:opacity-50"
        >
          {isPending ? "שומר..." : goal ? "שמירה" : "הוספת יעד"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-ru-blue-soft px-4 py-3 text-sm text-ru-ink/70"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const { isPending, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState("");

  if (editing) return <GoalForm goal={goal} onClose={() => setEditing(false)} />;

  const done = goal.current >= goal.target;
  const width = Math.min(goal.percent, 100);

  return (
    <div className={CARD}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-bold">{goal.title}</h3>
        <span className={`shrink-0 text-sm font-bold ${done ? "text-ru-green" : "text-ru-blue"}`}>
          {done ? "הושג ✓" : `${goal.percent.toFixed(0)}%`}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-xs text-ru-muted">נחסך</p>
          <p className="text-lg font-bold text-ru-green">{formatShekel(goal.current)}</p>
        </div>
        <div className="text-left">
          <p className="text-xs text-ru-muted">יעד</p>
          <p className="text-lg">{formatShekel(goal.target)}</p>
        </div>
      </div>
      <div className="mt-3 h-3.5 w-full overflow-hidden rounded-full bg-ru-green-soft">
        <div className="h-full rounded-full bg-ru-green" style={{ width: `${width}%` }} />
      </div>

      {(goal.targetDate || goal.monthlyNeeded) && (
        <p className="mt-2.5 text-xs text-ru-muted">
          {goal.targetDate && `עד ${new Date(goal.targetDate).toLocaleDateString("he-IL")}`}
          {goal.monthlyNeeded !== null && ` · צריך לשים בצד ${formatShekel(goal.monthlyNeeded)} בחודש`}
        </p>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addToGoal({ id: goal.id, amount: Number(amount) }), () => setAmount(""));
        }}
      >
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="כמה הוספתם?"
          className={`${INPUT} min-w-0 flex-1 !py-2.5`}
        />
        <button
          type="submit"
          disabled={isPending || !amount}
          className="shrink-0 rounded-full bg-ru-green px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          הוספה
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {confirming ? (
          <>
            <span className="font-semibold">למחוק את היעד?</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => deleteGoal({ id: goal.id }))}
              className="rounded-full bg-ru-pink px-3 py-1 font-bold text-white disabled:opacity-50"
            >
              כן
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-ru-blue-soft px-3 py-1 text-ru-ink/70"
            >
              ביטול
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setEditing(true)} className="font-semibold text-ru-blue">
              עריכה
            </button>
            <button type="button" onClick={() => setConfirming(true)} className="text-ru-muted">
              מחיקה
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-ru-pink">{error}</p>}
    </div>
  );
}

export default function Goals({ goals }: { goals: Goal[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold">יעדים ומטרות</h2>
      <div className="space-y-3">
        {goals.length === 0 && !adding && (
          <p className="text-sm text-ru-muted">
            יעד הוא משהו שחוסכים אליו: קרן חירום, דירה, רכב, חתונה. מוסיפים אחד ורואים כמה חסר.
          </p>
        )}
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
        {adding ? (
          <GoalForm onClose={() => setAdding(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full rounded-full bg-white px-5 py-3.5 text-base font-bold text-ru-blue shadow-[0_2px_14px_rgba(46,46,46,0.07)]"
          >
            ＋ הוספת יעד
          </button>
        )}
      </div>
    </section>
  );
}
