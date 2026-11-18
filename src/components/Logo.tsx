// The Sherman brand mark: a bold ש in turquoise under a thin mandarin roof.
export function LogoMark({ size = 32, color = "#0B5F58", accent = "#FF6A2B" }: { size?: number; color?: string; accent?: string }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
      <g transform="translate(20 22) scale(.8)" fill="none" strokeLinejoin="round">
        <path d="M38 54 L100 14 L162 54" stroke={accent} strokeWidth="11" strokeLinecap="round" />
        <path d="M48 76 V128 Q48 162 82 162 H118 Q152 162 152 128 V76" stroke={color} strokeWidth="22" />
        <path d="M100 76 V158" stroke={color} strokeWidth="22" />
      </g>
    </svg>
  );
}

export function Logo({ size = 22, markSize = 28, light = false }: { size?: number; markSize?: number; light?: boolean }) {
  const color = light ? "#FFFFFF" : "#0B5F58";
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={markSize} color={color} />
      <span className="font-wordmark leading-none" style={{ fontSize: size, color }}>
        שרמן · כלכלת המשפחה
      </span>
    </div>
  );
}
