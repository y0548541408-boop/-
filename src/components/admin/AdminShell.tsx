import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { LogoMark } from "@/components/Logo";

// The advisor's workspace. On a computer: a side menu on the right and a wide
// working area. On a phone: the same screens in one column, with a top bar.
export type AdminSection = "clients" | "leads" | "questionnaires";

const SECTIONS: { id: AdminSection; label: string; href: string; icon: React.ReactNode }[] = [
  {
    id: "clients",
    label: "לקוחות",
    href: "/admin",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5M16 4.5a3.5 3.5 0 010 7M21.5 20c0-3-1.8-4.8-4.5-5.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "leads",
    label: "לידים",
    href: "/admin/leads",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    id: "questionnaires",
    label: "שאלונים",
    href: "/admin/mortgage",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M7 3h8l4 4v14H7z" strokeLinejoin="round" />
        <path d="M10 12h6M10 16h4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function AdminShell({
  active,
  advisorName,
  children,
  wide = true,
}: {
  active: AdminSection;
  advisorName: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="client-app min-h-screen bg-brand-cream text-ru-ink">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-64 flex-col border-l border-ru-line bg-white px-4 py-6 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <LogoMark size={36} />
          <span className="font-wordmark text-lg leading-tight text-brand-teal">שרמן משכנתאות<br />וכלכלת המשפחה</span>
        </div>
        <p className="mt-6 px-2 text-sm text-ru-muted">שלום, {advisorName}</p>
        <nav aria-label="ניהול" className="mt-3 space-y-1">
          {SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              aria-current={s.id === active ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-bold transition-colors ${
                s.id === active ? "bg-brand-teal text-white" : "text-ru-ink/75 hover:bg-brand-cream"
              }`}
            >
              {s.icon}
              {s.label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="mt-auto">
          <button type="submit" className="min-h-11 w-full rounded-xl px-3 text-start text-sm text-ru-muted hover:bg-brand-cream">
            התנתקות
          </button>
        </form>
      </aside>

      <div className="lg:pe-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ru-line bg-brand-cream/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-wordmark text-base text-brand-teal">ניהול לקוחות</span>
          </div>
          <nav aria-label="ניהול" className="flex gap-1">
            {SECTIONS.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                aria-current={s.id === active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-full px-3 text-sm font-bold ${
                  s.id === active ? "bg-brand-teal text-white" : "text-ru-ink/70"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className={`mx-auto px-4 pb-16 pt-6 lg:px-10 lg:pt-10 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
