"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PlannedAmountEditor from "../PlannedAmountEditor";
import {
  addCategory,
  renameCategory,
  removeCategory,
  restoreCategory,
  setCategoryType,
  type CategoryKind,
  type CategoryResult,
} from "./actions";

export type ManagedCategory = {
  id: string;
  name: string;
  planned: number;
  type?: "fixed" | "variable";
  isActive: boolean;
};

const CARD = "rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]";
const INPUT = "rounded-2xl border border-ru-blue-soft bg-white px-4 py-3 text-base";

function useRunner() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function run(action: () => Promise<CategoryResult>, onDone?: () => void) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      if (result.message) setMessage({ tone: "ok", text: result.message });
      onDone?.();
      router.refresh();
    });
  }

  return { isPending, message, setMessage, run };
}

function CategoryRow({
  kind,
  category,
  disabled,
  run,
}: {
  kind: CategoryKind;
  category: ManagedCategory;
  disabled: boolean;
  run: (action: () => Promise<CategoryResult>, onDone?: () => void) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(category.name);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={`${CARD} !p-4`}>
      <div className="flex items-center justify-between gap-3">
        {renaming ? (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => renameCategory({ kind, id: category.id, name }),
                () => setRenaming(false)
              );
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className={`${INPUT} min-w-0 flex-1 !py-2`}
            />
            <button
              type="submit"
              disabled={disabled}
              className="rounded-full bg-ru-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              שמור
            </button>
            <button
              type="button"
              onClick={() => {
                setName(category.name);
                setRenaming(false);
              }}
              className="text-xs text-ru-muted"
            >
              ביטול
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="min-w-0 truncate text-start text-lg font-bold hover:text-ru-blue"
            aria-label={`שינוי שם: ${category.name}`}
          >
            {category.name} <span className="text-xs font-normal text-ru-muted">✎</span>
          </button>
        )}
        {!renaming && (
          <PlannedAmountEditor
            kind={kind}
            categoryId={category.id}
            displayAmount={category.planned}
            baseAmount={category.planned}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {kind === "expense" && category.type && (
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              run(() =>
                setCategoryType({
                  id: category.id,
                  type: category.type === "fixed" ? "variable" : "fixed",
                })
              )
            }
            className="rounded-full bg-ru-blue-soft px-3 py-1.5 font-bold text-ru-blue disabled:opacity-50"
          >
            {category.type === "fixed" ? "קבועה · להפוך למשתנה" : "משתנה · להפוך לקבועה"}
          </button>
        )}

        {confirming ? (
          <>
            <span className="font-semibold">למחוק את הקטגוריה?</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => run(() => removeCategory({ kind, id: category.id }), () => setConfirming(false))}
              className="rounded-full bg-ru-pink px-3 py-1.5 font-bold text-white disabled:opacity-50"
            >
              כן
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-ru-blue-soft px-3 py-1.5 text-ru-ink/70"
            >
              ביטול
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-full bg-ru-pink-soft px-3 py-1.5 font-bold text-ru-pink"
          >
            מחיקה
          </button>
        )}
      </div>
    </div>
  );
}

function AddForm({
  kind,
  disabled,
  run,
}: {
  kind: CategoryKind;
  disabled: boolean;
  run: (action: () => Promise<CategoryResult>, onDone?: () => void) => void;
}) {
  const [name, setName] = useState("");
  const [planned, setPlanned] = useState("");
  const [type, setType] = useState<"fixed" | "variable">("variable");

  return (
    <form
      className={`${CARD} space-y-3`}
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => addCategory({ kind, name, planned: planned ? Number(planned) : 0, type }),
          () => {
            setName("");
            setPlanned("");
          }
        );
      }}
    >
      <h3 className="text-lg font-bold">
        {kind === "expense" ? "קטגוריית הוצאה חדשה" : "קטגוריית הכנסה חדשה"}
      </h3>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder={kind === "expense" ? 'למשל "חוגים לילדים"' : 'למשל "הכנסה מטיפולים"'}
        className={`${INPUT} w-full`}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={planned}
          onChange={(e) => setPlanned(e.target.value)}
          placeholder="תקציב חודשי"
          className={INPUT}
        />
        {kind === "expense" && (
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "fixed" | "variable")}
            className={INPUT}
          >
            <option value="variable">הוצאה משתנה</option>
            <option value="fixed">הוצאה קבועה</option>
          </select>
        )}
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-full bg-ru-blue px-4 py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(91,123,255,0.35)] disabled:opacity-50"
      >
        הוספת קטגוריה
      </button>
    </form>
  );
}

function Section({
  title,
  kind,
  categories,
  disabled,
  run,
}: {
  title: string;
  kind: CategoryKind;
  categories: ManagedCategory[];
  disabled: boolean;
  run: (action: () => Promise<CategoryResult>, onDone?: () => void) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <div className="space-y-3">
        {categories.length === 0 && (
          <p className="text-sm text-ru-muted">עוד אין קטגוריות כאן. אפשר להוסיף למטה.</p>
        )}
        {categories.map((c) => (
          <CategoryRow key={c.id} kind={kind} category={c} disabled={disabled} run={run} />
        ))}
        <AddForm kind={kind} disabled={disabled} run={run} />
      </div>
    </section>
  );
}

export default function CategoryManager({
  fixed,
  variable,
  income,
  hidden,
}: {
  fixed: ManagedCategory[];
  variable: ManagedCategory[];
  income: ManagedCategory[];
  hidden: { kind: CategoryKind; category: ManagedCategory }[];
}) {
  const { isPending, message, run } = useRunner();

  return (
    <div>
      {message && (
        <div
          className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${
            message.tone === "error" ? "bg-ru-pink-soft text-ru-pink" : "bg-ru-blue-soft text-ru-blue"
          }`}
        >
          {message.text}
        </div>
      )}

      <Section title="הוצאות קבועות" kind="expense" categories={fixed} disabled={isPending} run={run} />
      <Section title="הוצאות משתנות" kind="expense" categories={variable} disabled={isPending} run={run} />
      <Section title="הכנסות" kind="income" categories={income} disabled={isPending} run={run} />

      {hidden.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-bold">קטגוריות מוסתרות</h2>
          <p className="mb-3 text-xs text-ru-muted">
            הן לא מופיעות בטפסים, אבל התנועות שלהן נשמרות ונספרות בחודשים שבהם הן היו בשימוש.
          </p>
          <div className="space-y-2">
            {hidden.map(({ kind, category }) => (
              <div
                key={`${kind}-${category.id}`}
                className="flex items-center justify-between rounded-3xl bg-white px-5 py-3 shadow-[0_2px_14px_rgba(46,46,46,0.07)]"
              >
                <span className="font-semibold">
                  {category.name}{" "}
                  <span className="text-xs font-normal text-ru-muted">
                    · {kind === "expense" ? "הוצאה" : "הכנסה"}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => restoreCategory({ kind, id: category.id }))}
                  className="rounded-full bg-ru-green-soft px-3 py-1.5 text-xs font-bold text-ru-green disabled:opacity-50"
                >
                  החזרה
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
