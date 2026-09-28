export function LogoMark({ size = 32, color = "#1B4D3E", accent = "#C97B4A" }: { size?: number; color?: string; accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <path d="M 12 46 A 19 19 0 0 1 30 27" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <path d="M 52 46 A 19 19 0 0 0 34 27" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <circle cx="32" cy="15" r="6" fill={accent} />
    </svg>
  );
}

export function Logo({ size = 22, markSize = 28, light = false }: { size?: number; markSize?: number; light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={markSize} color={light ? "#FFFFFF" : "#1B4D3E"} />
      <span className="font-wordmark font-bold" style={{ fontSize: size, color: light ? "#FFFFFF" : "#1B4D3E" }}>
        כלכלת המשפחה
      </span>
    </div>
  );
}
