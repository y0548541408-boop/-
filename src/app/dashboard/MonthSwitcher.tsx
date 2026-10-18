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
    <div className="mt-3 flex items-center justify-between rounded-xl border border-brand-teal/10 bg-white px-2 py-1.5 shadow-sm">
      <Link
        href={`${basePath}?month=${formatMonthParam(prev)}`}
        aria-label="חודש קודם"
        className="rounded-lg px-3 py-1.5 text-lg text-brand-teal hover:bg-gray-50"
      >
        ›
      </Link>
      <div className="text-center">
        <p className="text-sm font-semibold text-brand-teal">{label}</p>
        {!atCurrent && (
          <Link href={basePath} className="text-xs text-gray-400 underline">
            חזרה לחודש הנוכחי
          </Link>
        )}
      </div>
      <Link
        href={`${basePath}?month=${formatMonthParam(next)}`}
        aria-label="חודש הבא"
        aria-disabled={atCurrent}
        className={`rounded-lg px-3 py-1.5 text-lg ${
          atCurrent ? "pointer-events-none text-gray-200" : "text-brand-teal hover:bg-gray-50"
        }`}
      >
        ‹
      </Link>
    </div>
  );
}
