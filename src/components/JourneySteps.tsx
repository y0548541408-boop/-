import Link from "next/link";

const STEPS = [
  { n: 1, title: "איפה אנחנו", href: "/dashboard/mapping" },
  { n: 2, title: "לאן רוצים להגיע", href: "/dashboard/networth" },
  { n: 3, title: "מה עושים בשביל זה", href: "/dashboard/plan" },
] as const;

// The three stops of the process: where we are (mapping), where we want to go
// (the savings goals), and what we do about it (the plan). Shown to the client.
export default function JourneySteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol aria-label="שלבי התהליך" className="mt-4 grid grid-cols-3 gap-2">
      {STEPS.map((s) => {
        const active = s.n === current;
        const done = s.n < current;
        return (
          <li key={s.n}>
            <Link
              href={s.href}
              aria-current={active ? "step" : undefined}
              className={`block rounded-2xl px-2 py-2.5 text-center transition-colors ${
                active ? "bg-ru-blue text-white" : done ? "bg-ru-green-soft text-ru-ink" : "bg-white text-ru-ink/75"
              }`}
            >
              <span className="block text-sm font-bold opacity-80">שלב {s.n}</span>
              <span className="block text-base font-bold leading-tight">{s.title}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
