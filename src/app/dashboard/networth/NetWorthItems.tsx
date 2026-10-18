"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatShekel } from "../RiseCard";
import { deleteNetWorthItem, saveNetWorthItem, type Result } from "./actions";

type Item = { id: string; group: string; name: string; value: number };
type Group = { group: string; total: number; items: Item[] };

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

function ItemRow({
  kind,
  item,
  groups,
}: {
  kind: "asset" | "liability";
  item: Item;
  groups: readonly string[];
}) {
  const { isPending, error, run } = useAction();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(item.name);
  const [group, setGroup] = useState(item.group);
  const [value, setValue] = useState(String(item.value));

  if (editing) {
    return (
      <form
        className="space-y-2 border-t border-ru-bg py-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => saveNetWorthItem({ id: item.id, kind, group, name, value: Number(value) }),
            () => setEditing(false)
          );
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} className={`${INPUT} w-full`} />
        <div className="grid grid-cols-2 gap-2">
          <select value={group} onChange={(e) => setGroup(e.target.value)} className={INPUT}>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={INPUT}
          />
        </div>
        {error && <p className="text-sm font-semibold text-ru-pink">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-full bg-ru-blue px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? "שומר..." : "שמירה"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-full border border-ru-blue-soft px-4 py-2.5 text-sm text-ru-ink/70"
          >
            ביטול
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="border-t border-ru-bg py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate">{item.name}</span>
        <span className="shrink-0 font-bold">{formatShekel(item.value)}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
        {confirming ? (
          <>
            <span className="font-semibold">למחוק?</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => deleteNetWorthItem({ id: item.id }))}
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
              עדכון סכום
            </button>
            <button type="button" onClick={() => setConfirming(true)} className="text-ru-muted">
              מחיקה
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-ru-pink">{error}</p>}
    </div>
  );
}

function AddItemForm({ kind, groups }: { kind: "asset" | "liability"; groups: readonly string[] }) {
  const { isPending, error, run } = useAction();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [group, setGroup] = useState<string>(groups[0]);
  const [value, setValue] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-full bg-white px-5 py-3.5 text-base font-bold text-ru-blue shadow-[0_2px_14px_rgba(46,46,46,0.07)]"
      >
        {kind === "asset" ? "＋ הוספת נכס" : "＋ הוספת התחייבות"}
      </button>
    );
  }

  return (
    <form
      className={`${CARD} space-y-3`}
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => saveNetWorthItem({ kind, group, name, value: Number(value) }),
          () => {
            setName("");
            setValue("");
            setOpen(false);
          }
        );
      }}
    >
      <h3 className="text-lg font-bold">{kind === "asset" ? "נכס חדש" : "התחייבות חדשה"}</h3>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={kind === "asset" ? 'למשל "קרן השתלמות - מור"' : 'למשל "משכנתא - בנק לאומי"'}
        className={`${INPUT} w-full`}
      />
      <div className="grid grid-cols-2 gap-2">
        <select value={group} onChange={(e) => setGroup(e.target.value)} className={INPUT}>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <input
          required
          type="number"
          inputMode="decimal"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={kind === "asset" ? "שווי היום" : "יתרה לסילוק"}
          className={INPUT}
        />
      </div>
      {error && <p className="text-sm font-semibold text-ru-pink">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-full bg-ru-blue px-4 py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(91,123,255,0.35)] disabled:opacity-50"
        >
          {isPending ? "שומר..." : "הוספה"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-ru-blue-soft px-4 py-3 text-sm text-ru-ink/70"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

export default function NetWorthItems({
  kind,
  title,
  total,
  groups,
  groupOptions,
}: {
  kind: "asset" | "liability";
  title: string;
  total: number;
  groups: Group[];
  groupOptions: readonly string[];
}) {
  const tone = kind === "asset" ? "text-ru-green" : "text-ru-pink";

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className={`text-lg font-bold ${tone}`}>{formatShekel(total)}</span>
      </div>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.group} className={CARD}>
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="text-base font-bold">{g.group}</h3>
              <span className="text-sm font-semibold text-ru-muted">{formatShekel(g.total)}</span>
            </div>
            {g.items.map((item) => (
              <ItemRow key={item.id} kind={kind} item={item} groups={groupOptions} />
            ))}
          </div>
        ))}
        <AddItemForm kind={kind} groups={groupOptions} />
      </div>
    </section>
  );
}
