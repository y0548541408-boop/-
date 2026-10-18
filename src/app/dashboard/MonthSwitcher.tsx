import Link from "next/link";
import { formatMonthParam, isCurrentMonth, shiftMonth } from "@/lib/month";

export default function MonthSwitcher({
  month,
  basePath,
}: {
  month: Date;
  basePath: string;
}) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  const atCurrent = isCurrentMonth(month);
  const label = month.toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  return (
    <div className="mt-5 flex items-center justify-between">
      <Link
        href={`${basePath}?month=${formatMonthParam(prev)}`}
        aria-label="חודש קודם"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-ru-blue shadow-[0_1px_6px_rgba(46,46,46,0.08)]"
      >
        ›
      </Link>
      <div className="text-center">
        <p className="text-xl font-bold text-ru-ink">{label}</p>
        {!atCurrent && (
          <Link href={basePath} className="text-xs font-medium text-ru-blue">
            חזרה לחודש הנוכחי
          </Link>
        )}
      </div>
      <Link
        href={`${basePath}?month=${formatMonthParam(next)}`}
        aria-label="חודש הבא"
        aria-disabled={atCurrent}
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl shadow-[0_1px_6px_rgba(46,46,46,0.08)] ${
          atCurrent ? "pointer-events-none opacity-30" : "text-ru-blue"
        }`}
      >
        ‹
      </Link>
    </div>
  );
}
