import type { ReactNode } from "react";

type Tone = "blue" | "green" | "pink";

const TONES: Record<Tone, { text: string; bar: string; track: string }> = {
  blue: { text: "text-ru-blue", bar: "bg-ru-blue", track: "bg-ru-blue-soft" },
  green: { text: "text-ru-green", bar: "bg-ru-green", track: "bg-ru-green-soft" },
  pink: { text: "text-ru-pink", bar: "bg-ru-pink", track: "bg-ru-pink-soft" },
};

export function formatShekel(value: number): string {
  return `₪${value.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
}

// One budget line in the RiseUp pattern: big title, the real number
// (colored, bold) beside the expected one (gray), and a thick rounded bar.
export default function RiseCard({
  title,
  actualLabel,
  actual,
  expectedLabel,
  expected,
  percent,
  tone,
  size = "md",
  footer,
  remaining,
}: {
  title: string;
  actualLabel: string;
  actual: number;
  expectedLabel: string;
  expected: ReactNode;
  percent: number;
  tone: Tone;
  size?: "md" | "lg";
  footer?: ReactNode;
  // Budget left to spend. Shown prominently so the client always knows where they stand.
  remaining?: number;
}) {
  const t = TONES[tone];
  const width = Math.max(0, Math.min(percent, 100));
  const over = remaining !== undefined && remaining < 0;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className={`font-bold text-ru-ink ${size === "lg" ? "text-xl" : "text-lg"}`}>{title}</h3>
        {remaining !== undefined && (
          <div
            className={`shrink-0 rounded-2xl px-3 py-1.5 text-left ${
              over ? "bg-ru-pink-soft text-ru-pink" : "bg-ru-green-soft text-ru-green"
            }`}
          >
            <p className="text-[11px] font-semibold leading-tight">{over ? "חריגה" : "יתרה לשימוש"}</p>
            <p className="text-lg font-bold leading-tight">{formatShekel(Math.abs(remaining))}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-ru-muted">{actualLabel}</p>
          <p className={`text-lg font-bold ${t.text}`}>{formatShekel(actual)}</p>
        </div>
        <div className="text-left">
          <p className="text-xs text-ru-muted">{expectedLabel}</p>
          <div className="text-lg text-ru-ink">{expected}</div>
        </div>
      </div>

      <div className={`mt-3 h-3.5 w-full overflow-hidden rounded-full ${t.track}`}>
        <div
          className={`h-full rounded-full transition-all ${t.bar}`}
          style={{ width: `${width}%` }}
        />
      </div>

      {footer && <div className="mt-2.5 text-xs text-ru-muted">{footer}</div>}
    </div>
  );
}
