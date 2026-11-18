// Israeli phone numbers, kept as local digits ("0501234567") and turned into
// the international form WhatsApp wants ("972501234567").

export function normalizeIsraeliPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("972")) digits = `0${digits.slice(3)}`;
  if (!/^0\d{8,9}$/.test(digits)) return null;
  return digits;
}

export function toWhatsappNumber(phone: string | null | undefined): string | null {
  const local = normalizeIsraeliPhone(phone);
  return local ? `972${local.slice(1)}` : null;
}

export function formatPhone(phone: string | null | undefined): string {
  const local = normalizeIsraeliPhone(phone);
  if (!local) return phone ?? "";
  return local.length === 10 ? `${local.slice(0, 3)}-${local.slice(3)}` : `${local.slice(0, 2)}-${local.slice(2)}`;
}
