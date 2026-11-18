import * as XLSX from "xlsx";

// Reads a bank (עו"ש) or credit-card export the way Israeli banks and card
// companies actually ship them: .xlsx, old .xls, HTML pretending to be .xls,
// or CSV. There is no single format, so we look for a header row by its
// words, and read every row under it that has a date and an amount.

export type ParsedRow = {
  occurredAt: Date;
  description: string;
  amount: number; // expense: money out (refund = negative). income: money in.
  isIncome: boolean;
};

export type ParseResult =
  | { ok: true; source: "checking" | "credit"; rows: ParsedRow[] }
  | { ok: false; error: string };

type Cell = string | number | boolean | Date | null | undefined;

const DATE_WORDS = ["תאריך עסקה", "תאריך רכישה", "תאריך העסקה", "תאריך", "date"];
const DESC_WORDS = [
  "שם בית העסק",
  "שם בית עסק",
  "בית העסק",
  "בית עסק",
  "תיאור התנועה",
  "תיאור הפעולה",
  "תיאור",
  "הפעולה",
  "פעולה",
  "פרטים",
  "description",
];
const CHARGE_WORDS = ["סכום חיוב", "סכום החיוב", "סכום לחיוב", "סכום בש\"ח", "סכום חיוב ₪"];
const DEAL_AMOUNT_WORDS = ["סכום עסקה", "סכום העסקה", "סכום הקנייה", "סכום"];
const DEBIT_WORDS = ["חובה", "בחובה", "debit"];
const CREDIT_WORDS = ["זכות", "בזכות", "credit"];
const BALANCE_WORDS = ["יתרה", "יתרה בש\"ח", "balance"];

function norm(v: Cell): string {
  return String(v ?? "")
    .replace(/[‎‏‪-‮]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findCol(header: string[], words: string[], exclude: number[] = []): number {
  // Exact match first, then "contains", so "תאריך" doesn't steal "תאריך ערך".
  for (const w of words) {
    const i = header.findIndex((h, idx) => !exclude.includes(idx) && h === w);
    if (i >= 0) return i;
  }
  for (const w of words) {
    const i = header.findIndex(
      (h, idx) => !exclude.includes(idx) && h.includes(w) && !h.includes("ערך") && !h.includes("חיוב בפועל")
    );
    if (i >= 0) return i;
  }
  return -1;
}

export function parseAmount(v: Cell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v === null || v === undefined) return null;
  let s = norm(v).replace(/[₪$€,\s]/g, "").replace(/ש"ח|nis|ils/g, "");
  if (!s) return null;
  let negative = false;
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

export function parseDate(v: Cell): Date | null {
  if (v instanceof Date) {
    return Number.isNaN(v.getTime())
      ? null
      : new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate(), 12));
  }
  if (typeof v === "number") {
    // Excel serial date
    if (v < 20000 || v > 80000) return null;
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return new Date(Date.UTC(d.y, d.m - 1, d.d, 12));
  }
  const s = norm(v);
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (m) {
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const month = Number(m[2]);
    const day = Number(m[1]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(Date.UTC(year, month - 1, day, 12));
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12));
  return null;
}

type Layout = {
  headerRow: number;
  date: number;
  desc: number;
  // checking: debit/credit columns (or one signed amount). credit card: charge column.
  debit: number;
  credit: number;
  amount: number;
  source: "checking" | "credit";
};

function detectLayout(rows: Cell[][]): Layout | null {
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const header = rows[r].map(norm);
    const date = findCol(header, DATE_WORDS);
    if (date < 0) continue;
    const desc = findCol(header, DESC_WORDS, [date]);
    if (desc < 0) continue;

    const debit = findCol(header, DEBIT_WORDS);
    const credit = findCol(header, CREDIT_WORDS);
    const hasBalance = findCol(header, BALANCE_WORDS) >= 0;

    if (debit >= 0 && credit >= 0) {
      return { headerRow: r, date, desc, debit, credit, amount: -1, source: "checking" };
    }
    const charge = findCol(header, CHARGE_WORDS);
    const amount = charge >= 0 ? charge : findCol(header, DEAL_AMOUNT_WORDS, [date, desc]);
    if (amount < 0) continue;
    return {
      headerRow: r,
      date,
      desc,
      debit: -1,
      credit: -1,
      amount,
      source: hasBalance ? "checking" : "credit",
    };
  }
  return null;
}

export function parseStatement(buffer: ArrayBuffer, filename: string): ParseResult {
  let wb: XLSX.WorkBook;
  try {
    const isCsv = filename.toLowerCase().endsWith(".csv");
    wb = isCsv
      ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string", cellDates: true })
      : XLSX.read(buffer, { type: "array", cellDates: true });
  } catch {
    return { ok: false, error: "לא הצלחנו לפתוח את הקובץ. צריך קובץ אקסל או CSV, כמו שמורידים מהבנק." };
  }

  const rows: ParsedRow[] = [];
  let source: "checking" | "credit" | null = null;

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const grid = XLSX.utils.sheet_to_json<Cell[]>(sheet, { header: 1, raw: true, defval: null });
    let layout = detectLayout(grid);
    let r = layout ? layout.headerRow + 1 : grid.length;

    while (layout && r < grid.length) {
      const row = grid[r];
      // Card statements repeat the header for each card / for foreign deals.
      const again = detectLayout([row]);
      if (again) {
        layout = { ...again, headerRow: r };
        r++;
        continue;
      }
      const date = parseDate(row[layout.date]);
      const description = String(row[layout.desc] ?? "").replace(/\s+/g, " ").trim();
      if (!date || !description) {
        r++;
        continue;
      }

      if (layout.source === "checking" && layout.debit >= 0) {
        const out = parseAmount(row[layout.debit]);
        const inn = parseAmount(row[layout.credit]);
        if (out && out !== 0) rows.push({ occurredAt: date, description, amount: Math.abs(out), isIncome: false });
        else if (inn && inn !== 0) rows.push({ occurredAt: date, description, amount: Math.abs(inn), isIncome: true });
      } else {
        const amount = parseAmount(row[layout.amount]);
        if (amount !== null && amount !== 0) {
          if (layout.source === "checking") {
            // One signed column: minus = money out.
            rows.push({ occurredAt: date, description, amount: Math.abs(amount), isIncome: amount > 0 });
          } else {
            rows.push({ occurredAt: date, description, amount, isIncome: false });
          }
        }
      }
      source = source ?? layout.source;
      r++;
    }
  }

  if (!source || rows.length === 0) {
    return {
      ok: false,
      error:
        "לא מצאנו בקובץ טבלת תנועות. כדאי לבדוק שזה פירוט עובר ושב או פירוט כרטיס אשראי, בקובץ אקסל ולא PDF.",
    };
  }
  return { ok: true, source, rows };
}

// "שופרסל דיל ת"א 1234" and "שופרסל דיל ת"א 5678" are the same place.
export function merchantKey(description: string): string {
  return description
    .toLowerCase()
    .replace(/[‎‏"'`׳״.,()\-_/\\*#]/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
}
