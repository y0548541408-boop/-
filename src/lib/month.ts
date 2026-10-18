export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// "2026-10" -> first of that month. Anything invalid, or any month in the
// future, falls back to the current month.
export function parseMonthParam(value: string | undefined): Date {
  const current = startOfMonth(new Date());
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return current;
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12) return current;
  const parsed = new Date(year, month - 1, 1);
  return parsed > current ? current : parsed;
}

export function formatMonthParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function isCurrentMonth(date: Date): boolean {
  const current = startOfMonth(new Date());
  return date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth();
}

// Default date for a new entry: today when viewing the current month,
// otherwise the last day of the viewed month.
export function defaultEntryDate(month: Date): string {
  const target = isCurrentMonth(month)
    ? new Date()
    : new Date(month.getFullYear(), month.getMonth() + 1, 0);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(
    target.getDate()
  ).padStart(2, "0")}`;
}

// Entry date chosen in a form (YYYY-MM-DD). Noon avoids month-boundary
// shifts from timezone differences between server and client.
export function parseEntryDate(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }
  return new Date();
}
