// Logo per the brand guide "שרמן משכנתאות וכלכלת המשפחה": a house icon with
// the letter ש, the word "שרמן" beside it and "משכנתאות וכלכלת המשפחה" under it.
// Shown on its own, without a name/title line next to it.

const GREEN = "#1F5F5B";
const ACCENT = "#C8734A";

export function ShermanMark({ size = 44, color = GREEN, accent = ACCENT }: { size?: number; color?: string; accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path
        d="M6 30 L32 8 L58 30"
        fill="none"
        stroke={accent}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 27 V54 a3 3 0 0 0 3 3 H48 a3 3 0 0 0 3 -3 V27"
        fill="none"
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="32"
        y="50"
        textAnchor="middle"
        fontFamily="var(--font-wordmark), serif"
        fontWeight="700"
        fontSize="26"
        fill={color}
      >
        ש
      </text>
    </svg>
  );
}

export function ShermanLogo({
  markSize = 46,
  light = false,
  className = "",
}: {
  markSize?: number;
  light?: boolean;
  className?: string;
}) {
  const main = light ? "#FFFFFF" : GREEN;
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`} aria-label="שרמן – משכנתאות וכלכלת המשפחה">
      <ShermanMark size={markSize} color={main} />
      <div className="leading-none">
        <div className="font-wordmark font-bold" style={{ color: main, fontSize: markSize * 0.62 }}>
          שרמן
        </div>
        <div className="mt-1 font-medium" style={{ color: light ? "#F7F2E8" : ACCENT, fontSize: Math.max(10, markSize * 0.24) }}>
          משכנתאות וכלכלת המשפחה
        </div>
      </div>
    </div>
  );
}
