import * as XLSX from "xlsx";
import {
  G,
  PICTURE_TEMPLATE,
  YEAR_CYCLE_MONTHS,
  type PicturePeriod,
  type PictureKind,
  type TemplateLine,
} from "@/lib/pictureTemplate";

// Reads the advisor's workbook ("תמונת מצב כלכלית") and turns its two picture
// tabs into picture lines. A line is matched by its name to the standard
// lines; a name we do not know is kept as a new line in the closest group.
// Empty cells never overwrite what is already in the app.

export type ImportedLine = {
  period: PicturePeriod;
  kind: PictureKind;
  groupName: string;
  subGroup: string;
  name: string;
  amount: number | null; // null = the cell was empty, keep what is there
  targetAmount: number | null;
  priority: number | null;
  notes: string | null;
  whenText: string | null;
  matched: boolean; // one of the standard lines (otherwise added as new)
};

export type ImportResult = { ok: true; lines: ImportedLine[] } | { ok: false; error: string };

const TABS: { match: string; period: PicturePeriod }[] = [
  { match: "תמונת מצב חודשית", period: "monthly" },
  { match: "תמונת מצב שנתית", period: "annual" },
];

// Names the advisor writes differently from the standard lines.
const ALIASES: Record<string, string> = {
  'שכ"ד': "שכר דירה",
  "תמיכות/מלגות": "תמיכות ומלגות",
  "הבטחת/השלמת הכנסה": "הבטחת השלמת הכנסה",
};

// Blocks whose header is the person's name in the workbook.
const PERSON_LABELS: Record<string, string> = { בעל: G.husband, אשה: G.wife };

// Rows that total or compare other rows, not lines of their own.
const SKIP_NAME = /סה"?כ|סהכ|=|הוצאות (כולל|ללא)|הכנסות (ללא|\s*-)|הפרש|יתרה|סיכום/;

// The workbook says "בטוח" where the standard line says "ביטוח".
const norm = (s: string) => s.replace(/["״'׳\s\-\/,.:()]/g, "").replace(/בטוח/g, "ביטוח");
const keyOf = (s: string) => norm(ALIASES[s] ?? s);

const INDEX = new Map<string, TemplateLine[]>();
for (const line of PICTURE_TEMPLATE) {
  const key = `${line.period}|${keyOf(line.name)}`;
  INDEX.set(key, [...(INDEX.get(key) ?? []), line]);
}

type Cols = { amount: number; target: number; priority: number; notes: number; when: number };
type Cell = string | number | null;

function headerCols(cells: Cell[]): Cols | null {
  const text = cells.map((c) => (typeof c === "string" ? c.trim() : ""));
  const amount = text.findIndex((t) => /^(הסכום|סכום)/.test(t));
  if (amount < 0) return null;
  const find = (re: RegExp) => text.findIndex((t) => re.test(t));
  return { amount, target: find(/יעד/), priority: find(/עדיפות/), notes: find(/הערות/), when: find(/זמן/) };
}

const numberAt = (cells: Cell[], i: number): number | null => {
  if (i < 0) return null;
  const v = cells[i];
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1e9) return null;
  return Math.round(v * 100) / 100;
};

const textAt = (cells: Cell[], i: number, max: number): string | null => {
  if (i < 0) return null;
  const v = cells[i];
  if (typeof v !== "string" || !v.trim()) return null;
  return v.trim().slice(0, max);
};

// Which of several same-named standard lines fits this row best.
function matchScore(t: TemplateLine, kind: PictureKind, cycleMonth: string, block: string | null): number {
  return (t.kind === kind ? 2 : 0) + (cycleMonth && t.subGroup === cycleMonth ? 3 : 0) + (block && t.groupName === block ? 4 : 0);
}

function fallbackGroup(period: PicturePeriod, kind: PictureKind, name: string): string {
  if (period === "monthly") {
    if (kind === "income") return /קצב/.test(name) ? G.benefits : G.otherIncome;
    return G.current;
  }
  return kind === "income" ? G.otherIncome : G.annualCurrent;
}

function readTab(ws: XLSX.WorkSheet, period: PicturePeriod): ImportedLine[] {
  if (!ws["!ref"]) return [];
  const end = XLSX.utils.decode_range(ws["!ref"]).e;
  const rows = XLSX.utils.sheet_to_json<Cell[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
    range: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: end }),
  });

  const out: ImportedLine[] = [];
  let cols: Cols | null = null;
  let kind: PictureKind = "income";
  let block: string | null = null;
  let cycleMonth = "";

  for (const row of rows) {
    const cells = row.map((c) => (typeof c === "string" ? c.trim() : c));
    const header = headerCols(cells);
    if (header) {
      cols = header;
      continue;
    }
    if (!cols) continue;

    const amount = numberAt(cells, cols.amount);
    const words: { c: string; i: number }[] = [];
    for (let i = 0; i < cols.amount; i++) {
      const c = cells[i];
      if (typeof c === "string" && c.length > 0) words.push({ c, i });
    }

    // Section titles: a row with words only (no amount) can switch the kind or start a month.
    if (amount === null) {
      if (words.some((w) => w.c.includes("הוצאות"))) kind = "expense";
      if (words.some((w) => w.c.includes("הכנסות"))) kind = "income";
      if (words.length === 1 && YEAR_CYCLE_MONTHS.includes(words[0].c)) cycleMonth = words[0].c;
    }

    // A person's name in the first column starts their block; it is not a line.
    const rest: { c: string; i: number }[] = [];
    let rowLabelled = false;
    for (const w of words) {
      const label = PERSON_LABELS[w.c];
      if (label) {
        block = label;
        rowLabelled = true;
      } else {
        rest.push(w);
      }
    }

    const target = numberAt(cells, cols.target);
    const priorityRaw = numberAt(cells, cols.priority);
    const priority = priorityRaw !== null && [1, 2, 3].includes(priorityRaw) ? priorityRaw : null;
    const notes = textAt(cells, cols.notes, 300);
    const whenText = textAt(cells, cols.when, 60);
    // Only rows with a real number count. Notes-only and empty rows are skipped.
    if (!(amount || target)) continue;
    if (rest.length === 0) continue;

    const rawName = rest[rest.length - 1].c;
    // Totals and formula rows in the workbook are not lines of their own.
    if (SKIP_NAME.test(rawName)) continue;

    // A row that names the person ("בעל", "אשה") holds their job line ("עיסוק").
    const job = rowLabelled && (block === G.husband || block === G.wife);
    const name = job ? "משכורת (עיסוק)" : rawName;

    // Same name can appear twice (e.g. "ארנונה" monthly and annual); pick the closest.
    const candidates = INDEX.get(`${period}|${keyOf(name)}`) ?? [];
    const best = [...candidates].sort(
      (a, b) => matchScore(b, kind, cycleMonth, block) - matchScore(a, kind, cycleMonth, block)
    )[0];

    out.push({
      period,
      kind: best?.kind ?? kind,
      groupName: best?.groupName ?? fallbackGroup(period, kind, name),
      subGroup: best?.subGroup ?? "",
      name: best?.name ?? name.slice(0, 80),
      amount,
      targetAmount: target,
      priority,
      notes,
      whenText,
      matched: Boolean(best),
    });
  }
  return out;
}

export function parsePictureWorkbook(buffer: ArrayBuffer): ImportResult {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "array", cellDates: false });
  } catch {
    return { ok: false, error: "הקובץ לא נקרא. צריך קובץ אקסל (xlsx)." };
  }

  const lines: ImportedLine[] = [];
  for (const sheetName of wb.SheetNames) {
    if (SUMMARY_SHEET.test(sheetName)) continue;
    const ws = wb.Sheets[sheetName];
    const tab = TABS.find((t) => sheetName.includes(t.match));
    // The picture workbook's own tabs, with an amount column.
    if (tab || hasAmountHeader(ws)) {
      lines.push(...readTab(ws, tab?.period ?? "monthly"));
      continue;
    }
    // Any other workbook: each line's amount is the average of its months.
    lines.push(...readAverages(ws, sheetName));
  }
  if (lines.length === 0) {
    return { ok: false, error: "לא מצאתי בקובץ שורות עם סכומים. בודקים שהקובץ הוא תמונת מצב או טבלה של חודשים." };
  }
  return { ok: true, lines };
}

// ---------------------------------------------------------------------------
// Workbooks with monthly columns (e.g. three months and their average).
// ---------------------------------------------------------------------------

const SUMMARY_SHEET = /סיכום|תובנות|גרף/;
const MONTH_HEADER = /ממוצע|יעד|הערה|מגמה|ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר/;

function hasAmountHeader(ws: XLSX.WorkSheet): boolean {
  if (!ws["!ref"]) return false;
  const rows = sheetRows(ws);
  return rows.some((r) => headerCols(r) !== null);
}

function sheetRows(ws: XLSX.WorkSheet): Cell[][] {
  const end = XLSX.utils.decode_range(ws["!ref"] ?? "A1").e;
  return XLSX.utils.sheet_to_json<Cell[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
    range: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: end }),
  });
}

// Where a line in a generic tab belongs: by its name, else by the tab.
function sheetDefault(sheetName: string): { kind: PictureKind; group: string } {
  if (sheetName.includes("הכנסות")) return { kind: "income", group: G.otherIncome };
  if (sheetName.includes("קבועות")) return { kind: "expense", group: G.fixed };
  if (sheetName.includes("חובות")) return { kind: "expense", group: G.debts };
  return { kind: "expense", group: G.current };
}

// "משכורת בעל (80% משרה)" and "משכורת אשה (...)" are the job lines of the two people.
function personLine(name: string): { name: string; block: string } | null {
  if (/^משכורת\s*בעל/.test(name)) return { name: "משכורת (עיסוק)", block: G.husband };
  if (/^משכורת\s*אשה/.test(name)) return { name: "משכורת (עיסוק)", block: G.wife };
  return null;
}

function readAverages(ws: XLSX.WorkSheet, sheetName: string): ImportedLine[] {
  if (!ws["!ref"]) return [];
  const rows = sheetRows(ws);
  const def = sheetDefault(sheetName);
  const out: ImportedLine[] = [];

  let avgCol = -1;
  let targetCol = -1;
  let notesCol = -1;
  let monthCols: number[] = [];

  for (const row of rows) {
    const cells = row.map((c) => (typeof c === "string" ? c.trim() : c));
    const texts = cells.filter((c) => typeof c === "string" && c.length > 0);
    const isHeader = texts.filter((t) => typeof t === "string" && MONTH_HEADER.test(t)).length >= 2;
    if (isHeader) {
      const find = (re: RegExp) => cells.findIndex((c) => typeof c === "string" && re.test(c));
      avgCol = find(/ממוצע/);
      targetCol = find(/יעד/);
      notesCol = find(/הערה/);
      monthCols = cells
        .map((c, i) => (typeof c === "string" && /ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר/.test(c) ? i : -1))
        .filter((i) => i >= 0);
      continue;
    }

    const nameIdx = cells.findIndex((c) => typeof c === "string" && c.length > 0);
    if (nameIdx < 0) continue;
    const rawName = (cells[nameIdx] as string).slice(0, 120);
    if (SKIP_NAME.test(rawName)) continue;

    const reserved = new Set([avgCol, targetCol, notesCol]);
    const values: number[] = [];
    const pool = monthCols.length ? monthCols : cells.map((_, i) => i).filter((i) => i > nameIdx && !reserved.has(i));
    for (const i of pool) {
      const v = numberAt(cells, i);
      if (v !== null) values.push(v);
    }
    const given = numberAt(cells, avgCol);
    const amount = given ?? (values.length ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100 : null);
    const target = numberAt(cells, targetCol);
    if (!(amount || target)) continue;

    const person = personLine(rawName);
    const name = person ? person.name : rawName.trim();
    const group = def.kind === "income" && /קצב/.test(name) ? G.benefits : def.group;
    const resolved = resolveLine("monthly", def.kind, name, person?.block ?? null, group);
    out.push({
      period: "monthly",
      ...resolved,
      amount,
      targetAmount: target,
      priority: null,
      notes: textAt(cells, notesCol, 300),
      whenText: null,
    });
  }
  return out;
}

// Finds the standard line for a name, or keeps the name in the fallback group.
function resolveLine(
  period: PicturePeriod,
  kind: PictureKind,
  name: string,
  block: string | null,
  fallbackGroup: string
): { kind: PictureKind; groupName: string; subGroup: string; name: string; matched: boolean } {
  const candidates = INDEX.get(`${period}|${keyOf(name)}`) ?? [];
  const best = [...candidates].sort((a, b) => matchScore(b, kind, "", block) - matchScore(a, kind, "", block))[0];
  return {
    kind: best?.kind ?? kind,
    groupName: best?.groupName ?? fallbackGroup,
    subGroup: best?.subGroup ?? "",
    name: best?.name ?? name.slice(0, 80),
    matched: Boolean(best),
  };
}
