// Shared building blocks for every client questionnaire (mortgage, financial
// coaching...). Each questionnaire is plain data (sections of fields) plus a
// summarize() for its report; the form, storage and report are shared.
//
// Answers are stored as:
//   values: flat map. Per-person fields are keyed "b1.<key>" / "b2.<key>",
//           a yes/no field's free-text detail is "<key>__detail",
//           the text for an "אחר" (other) option is "<key>__other",
//           a multi-choice answer is its options joined with MULTI_SEP.
//   tables: repeating rows (savings, loans, payment schedule, banks...).

export type Values = Record<string, string>;
export type Row = Record<string, string>;
export type Tables = Record<string, Row[]>;

export type QuestionnaireResponses = {
  version: 1;
  /** How many people the answers cover (borrowers / spouses). */
  borrowers: 1 | 2;
  values: Values;
  tables: Tables;
};

export type FieldType =
  | "text"
  | "number"
  | "money"
  | "date"
  | "tel"
  | "email"
  | "id"
  | "textarea"
  | "choice"
  | "multi"
  | "yesno"
  | "percent";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  /** For choice / multi: add an "אחר" option with a free-text box. */
  hasOther?: boolean;
  hint?: string;
  placeholder?: string;
  /** For yes/no: ask for details when the answer is "כן". */
  detailLabel?: string;
  /** Show the field only when this returns true. `values.__count` holds the number of people. */
  showIf?: (values: Values) => boolean;
  /** Field is asked once per person (side by side). */
  perBorrower?: boolean;
  required?: boolean;
  wide?: boolean;
};

export type TableColumn = {
  key: string;
  label: string;
  type: "text" | "money" | "date" | "percent" | "choice" | "yesno";
  options?: string[];
};

export type TableConfig = {
  key: string;
  title: string;
  hint?: string;
  addLabel: string;
  columns: TableColumn[];
  showIf?: (values: Values) => boolean;
};

export type Section = {
  id: string;
  letter: string;
  title: string;
  intro: string;
  fields: Field[];
  tables?: TableConfig[];
  /** Extra fields shown after the tables. */
  fieldsAfter?: Field[];
  note?: string;
};

export type Insight = { tone: "attention" | "good" | "info"; text: string };

export const YES = "כן";
export const NO = "לא";
export const OTHER = "אחר";
export const MULTI_SEP = "|";

export function fieldKey(field: Field, borrower?: 1 | 2): string {
  return field.perBorrower ? `b${borrower ?? 1}.${field.key}` : field.key;
}

/** Values as seen by showIf: the answers plus `__count` (number of people). */
export function withCount(values: Values, count: 1 | 2): Values {
  return { ...values, __count: String(count) };
}

export function isVisible(field: { showIf?: (v: Values) => boolean }, values: Values): boolean {
  return field.showIf ? field.showIf(values) : true;
}

export function optionsFor(field: Field): string[] {
  if (field.type === "yesno") return [YES, NO];
  const opts = field.options ?? [];
  return field.hasOther && !opts.includes(OTHER) ? [...opts, OTHER] : opts;
}

export function splitMulti(raw: string | undefined): string[] {
  return raw ? raw.split(MULTI_SEP).filter(Boolean) : [];
}

export function hasAnswer(values: Values, key: string, option: string): boolean {
  return splitMulti(values[key]).includes(option);
}

export function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(n: number): string {
  const abs = `₪${Math.abs(Math.round(n)).toLocaleString("he-IL")}`;
  // The left-to-right mark keeps "−₪700" in this order inside Hebrew text.
  return n < 0 && Math.round(n) !== 0 ? `\u200E\u2212${abs}` : abs;
}

export function formatDate(raw: string | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("he-IL");
}

export function displayValue(type: FieldType | TableColumn["type"], raw: string | undefined): string {
  if (raw === undefined || raw === "") return "";
  if (type === "money") return formatMoney(toNumber(raw));
  if (type === "date") return formatDate(raw);
  if (type === "percent") return `${raw}%`;
  if (type === "multi") return splitMulti(raw).join(", ");
  return raw;
}

/** The answer to show for a field: value, plus its yes/no detail or "אחר" text. */
export function answerText(field: Field, values: Values, key: string): string {
  const v = values[key];
  if (!v) return "";
  let shown = displayValue(field.type, v);
  const other = values[`${key}__other`];
  if (other && (v === OTHER || splitMulti(v).includes(OTHER))) shown = shown.replace(OTHER, `${OTHER}: ${other}`);
  const detail = values[`${key}__detail`];
  if (field.type === "yesno" && v === YES && detail) shown = `${shown}: ${detail}`;
  return shown;
}

/** Rows that have at least one filled cell. */
export function filledRows(rows: Row[] | undefined): Row[] {
  return (rows ?? []).filter((r) => Object.values(r).some((v) => v && v.trim() !== ""));
}

export function parseResponses(raw: unknown): QuestionnaireResponses | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<QuestionnaireResponses>;
  if (r.version !== 1 || typeof r.values !== "object") return null;
  return {
    version: 1,
    borrowers: r.borrowers === 2 ? 2 : 1,
    values: (r.values ?? {}) as Values,
    tables: (r.tables ?? {}) as Tables,
  };
}
