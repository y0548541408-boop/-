// The pre-mortgage questionnaire ("שאלון לפני לקיחת משכנתא"), as data.
// Shared by the client form (/mortgage/[token]) and the advisor report
// (/admin/mortgage/[id]) so both always agree on questions and labels.
//
// Answers are stored as:
//   values: flat map. Per-borrower fields are keyed "b1.<key>" / "b2.<key>",
//           a yes/no field's free-text detail is "<key>__detail".
//   tables: repeating rows (assets, liabilities, payment schedule, banks).

export type Values = Record<string, string>;
export type Row = Record<string, string>;
export type Tables = Record<string, Row[]>;

export type MortgageResponses = {
  version: 1;
  borrowers: 1 | 2;
  values: Values;
  tables: Tables;
};

export type FieldType = "text" | "number" | "money" | "date" | "tel" | "email" | "id" | "textarea" | "choice" | "yesno" | "percent";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  hint?: string;
  placeholder?: string;
  /** For yes/no: ask for details when the answer is "כן". */
  detailLabel?: string;
  /** Show the field only when this returns true. */
  showIf?: (values: Values) => boolean;
  /** Field is asked once per borrower (side by side). */
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

export const YES = "כן";
export const NO = "לא";

export const PURPOSE = { live: "מגורים", invest: "השקעה", other: "אחר" };
export const FROM_CONTRACTOR = "מקבלן";
export const PURCHASE_TYPES = ["יד שנייה", FROM_CONTRACTOR, "בנייה עצמית", "אחר"];
export const APARTMENT_STATUS = {
  first: "דירה ראשונה ויחידה",
  upgrade: "דירה נוספת, אבל הדירה הקיימת תימכר תוך שנתיים",
  second: "דירה נוספת (שנייה ומעלה)",
};
export const INCOME_DROP = "צפויה לרדת";
export const BALANCE_NEGATIVE = "בדרך כלל במינוס";

export const SECTIONS: Section[] = [
  {
    id: "personal",
    letter: "א",
    title: "פרטים אישיים",
    intro: "נתחיל בפרטים הבסיסיים. אם יש לווה נוסף, ממלאים את הפרטים של שניכם, זה לצד זה.",
    fields: [
      { key: "fullName", label: "שם מלא", type: "text", perBorrower: true, required: true },
      { key: "idNumber", label: "מספר תעודת זהות", type: "id", perBorrower: true },
      { key: "birthDate", label: "תאריך לידה", type: "date", perBorrower: true },
      {
        key: "maritalStatus",
        label: "מצב משפחתי",
        type: "choice",
        options: ["רווק/ה", "נשוי/אה", "גרוש/ה", "אלמן/ה", "ידוע/ה בציבור"],
        perBorrower: true,
      },
      { key: "mobile", label: "טלפון נייד", type: "tel", perBorrower: true, required: true },
      { key: "homePhone", label: "טלפון בבית", type: "tel", perBorrower: true },
      { key: "email", label: "כתובת מייל", type: "email", perBorrower: true },
      { key: "citizenship", label: "יש אזרחות נוספת?", type: "yesno", detailLabel: "איזו אזרחות?", perBorrower: true },
      {
        key: "medical",
        label: "יש מגבלה רפואית שעלולה להקשות על ביטוח חיים?",
        hint: "ביטוח חיים הוא תנאי לקבלת משכנתא. כדאי לדעת על כך מראש.",
        type: "yesno",
        detailLabel: "פרטו בקצרה",
        perBorrower: true,
      },
      {
        key: "relativeAtBank",
        label: "יש קרוב משפחה שעובד בבנק?",
        type: "yesno",
        detailLabel: "באיזה בנק?",
        perBorrower: true,
      },
      { key: "kidsUnder18", label: "כמה ילדים מתחת לגיל 18 יש לכם?", type: "number", placeholder: "0" },
      {
        key: "kidsAges",
        label: "בני כמה הילדים?",
        type: "text",
        placeholder: "לדוגמה: 2, 5, 9",
        showIf: (v) => Number(v.kidsUnder18 || 0) > 0,
      },
    ],
  },
  {
    id: "employment",
    letter: "ב",
    title: "עבודה והכנסה",
    intro: "ההכנסה היא הבסיס לכל משכנתא. כאן מספרים על העבודה ועל ההכנסה של כל לווה.",
    fields: [
      {
        key: "education",
        label: "השכלה",
        type: "choice",
        options: ["תיכונית", "מקצועית / הנדסאי", "תואר ראשון", "תואר שני ומעלה", "תורנית"],
        perBorrower: true,
      },
      { key: "profession", label: "מקצוע", type: "text", perBorrower: true },
      {
        key: "employmentType",
        label: "סוג העסקה",
        type: "choice",
        options: ["שכיר/ה", "עצמאי/ת", "שכיר/ה וגם עצמאי/ת", "לא עובד/ת כרגע"],
        perBorrower: true,
      },
      { key: "employer", label: "שם מקום העבודה", type: "text", perBorrower: true },
      { key: "seniority", label: "כמה זמן עובדים שם?", type: "text", placeholder: "לדוגמה: 3 שנים", perBorrower: true },
      { key: "tenure", label: "יש קביעות בעבודה?", type: "yesno", perBorrower: true },
      { key: "grossIncome", label: "הכנסה חודשית ברוטו", hint: "לפני מסים וניכויים", type: "money", perBorrower: true },
      { key: "netIncome", label: "הכנסה חודשית נטו", hint: "הסכום שנכנס לחשבון", type: "money", perBorrower: true, required: true },
      {
        key: "deductions",
        label: "יורדים מהמשכורת החזרי הלוואות או רכב?",
        type: "yesno",
        detailLabel: "מה יורד, וכמה בחודש?",
        perBorrower: true,
      },
      {
        key: "incomeTrend",
        label: "איך צפויה ההכנסה להשתנות?",
        type: "choice",
        options: ["צפויה לעלות", "תישאר יציבה", INCOME_DROP],
        perBorrower: true,
      },
      {
        key: "careerChange",
        label: "מתוכנן שינוי בעבודה?",
        type: "yesno",
        detailLabel: "מה מתוכנן?",
        perBorrower: true,
      },
      {
        key: "extraIncome",
        label: "יש עוד הכנסה קבועה?",
        hint: "לדוגמה: שכר דירה, קצבה או עבודה נוספת",
        type: "yesno",
        detailLabel: "מאיפה מגיעה ההכנסה?",
        perBorrower: true,
      },
      {
        key: "extraIncomeAmount",
        label: "כמה מגיע מההכנסה הנוספת בחודש?",
        type: "money",
        perBorrower: true,
        showIf: (v) => v["b1.extraIncome"] === YES || v["b2.extraIncome"] === YES,
      },
      {
        key: "monthlyExpenses",
        label: "כמה מוציא משק הבית בחודש?",
        type: "money",
        hint: "הערכה כללית מספיקה. בלי החזרי הלוואות.",
      },
    ],
  },
  {
    id: "finance",
    letter: "ג",
    title: "חשבון הבנק",
    intro: "כמה שאלות על חשבון הבנק. חשוב לענות בכנות: כך נדע מראש מה הבנק יראה, ונוכל להתכונן.",
    fields: [
      { key: "bankBranch", label: "באיזה בנק החשבון, ומה מספר הסניף?", type: "text", placeholder: "לדוגמה: לאומי, סניף 902" },
      {
        key: "balance",
        label: "מה מצב החשבון בדרך כלל?",
        type: "choice",
        options: ["בדרך כלל בפלוס", "משתנה, לפעמים במינוס", BALANCE_NEGATIVE],
      },
      { key: "overdraft", label: "חרגתם ממסגרת האשראי בשלושת החודשים האחרונים?", type: "yesno" },
      { key: "returnedChecks", label: "חזרו לכם פעם צ'קים?", type: "yesno", detailLabel: "מתי, ומה קרה?" },
      { key: "restrictedPast", label: "החשבון הוגבל בעבר?", type: "yesno", detailLabel: "מתי?" },
      { key: "restrictedNow", label: "החשבון מוגבל כרגע?", type: "yesno" },
      {
        key: "switchBank",
        label: "תהיו מוכנים לעבור בנק, אם זה יוזיל את המשכנתא?",
        type: "choice",
        options: [YES, NO, "אולי, תלוי בהצעה"],
      },
    ],
  },
  {
    id: "assets",
    letter: "ד",
    title: "חסכונות",
    intro: "כסף שחסכתם יכול לשמש כהון עצמי, או כרזרבה לשעת הצורך. רשמו כל חיסכון שיש לכם.",
    fields: [],
    tables: [
      {
        key: "assets",
        title: "החסכונות שלכם",
        hint: "לדוגמה: קרן השתלמות, קופת גמל, תוכנית חיסכון, פיקדון או ניירות ערך.",
        addLabel: "הוספת חיסכון",
        columns: [
          { key: "type", label: "סוג החיסכון", type: "text" },
          { key: "amount", label: "סכום", type: "money" },
          { key: "liquidDate", label: "מתי אפשר למשוך?", type: "text" },
        ],
      },
    ],
  },
  {
    id: "liabilities",
    letter: "ה",
    title: "הלוואות והחזר חודשי",
    intro: "הלוואות קיימות משפיעות על גובה ההחזר שהבנק יאשר. רשמו כל הלוואה פעילה.",
    fields: [],
    tables: [
      {
        key: "liabilities",
        title: "ההלוואות שלכם כיום",
        hint: "לדוגמה: הלוואה מהבנק, הלוואת רכב, הלוואה בכרטיס אשראי, גמ\"ח או הלוואה מהמשפחה.",
        addLabel: "הוספת הלוואה",
        columns: [
          { key: "lender", label: "ממי ההלוואה?", type: "text" },
          { key: "amount", label: "יתרה לתשלום", type: "money" },
          { key: "monthly", label: "החזר חודשי", type: "money" },
          { key: "rate", label: "ריבית (%)", type: "percent" },
          { key: "endDate", label: "מתי מסתיימת?", type: "date" },
          { key: "bankDoc", label: "יש אישור מהבנק?", type: "yesno" },
        ],
      },
    ],
    fieldsAfter: [
      { key: "maxRepayment", label: "מה ההחזר החודשי הגבוה ביותר שתוכלו לעמוד בו בנוחות?", type: "money", required: true },
      { key: "startRepayment", label: "באיזה החזר חודשי הייתם רוצים להתחיל?", type: "money" },
      {
        key: "futureInflow",
        label: "צפוי שייכנס לכם כסף בחמש השנים הקרובות, שאפשר יהיה להקטין איתו את המשכנתא?",
        hint: "לדוגמה: ירושה, מכירת נכס או שחרור של חיסכון",
        type: "yesno",
        detailLabel: "מאיפה, ובערך מתי?",
      },
      {
        key: "futureInflowAmount",
        label: "כמה, בערך?",
        type: "money",
        showIf: (v) => v.futureInflow === YES,
      },
    ],
    note: "ככל שההחזר החודשי גבוה יותר, אפשר לבנות משכנתא טובה וזולה יותר.",
  },
  {
    id: "deal",
    letter: "ו",
    title: "הדירה והעסקה",
    intro: "ועכשיו לדירה עצמה. ככל שתמלאו יותר פרטים, נוכל לתכנן את המימון בדיוק רב יותר.",
    fields: [
      {
        key: "purpose",
        label: "מטרת הרכישה",
        type: "choice",
        options: [PURPOSE.live, PURPOSE.invest, PURPOSE.other],
        required: true,
      },
      { key: "purchaseType", label: "סוג הרכישה", type: "choice", options: PURCHASE_TYPES, required: true },
      {
        key: "apartmentStatus",
        label: "איזו דירה זו?",
        type: "choice",
        options: [APARTMENT_STATUS.first, APARTMENT_STATUS.second, APARTMENT_STATUS.upgrade],
        required: true,
      },
      {
        key: "keyDate",
        label: "מתי מקבלים את המפתח?",
        type: "date",
        showIf: (v) => v.purchaseType === FROM_CONTRACTOR,
      },
      {
        key: "expectedRent",
        label: "כמה שכר דירה אפשר לקבל על הדירה?",
        type: "money",
        showIf: (v) => v.purpose === PURPOSE.invest,
      },
      { key: "currentHome", label: "איפה אתם גרים היום?", type: "text", placeholder: "כתובת" },
      { key: "currentRent", label: "כמה שכר דירה אתם משלמים היום?", hint: "רק אם אתם גרים בשכירות", type: "money" },
      { key: "contractDate", label: "מתי נחתם חוזה הרכישה?", hint: "אם עוד לא נחתם, רשמו את התאריך המתוכנן", type: "date" },
      { key: "propertyValue", label: "מה שווי הדירה?", hint: "בדרך כלל, מחיר הקנייה", type: "money", required: true },
      { key: "equity", label: "כמה הון עצמי יש לכם?", hint: "הכסף שלכם שישמש לקנייה, בלי המשכנתא", type: "money", required: true },
      { key: "mortgageNeeded", label: "כמה משכנתא אתם צריכים?", type: "money", required: true },
    ],
    tables: [
      {
        key: "payments",
        title: "לוח התשלומים למוכר",
        hint: "לפי החוזה: מתי משלמים, כמה, ומאיפה מגיע הכסף.",
        addLabel: "הוספת תשלום",
        columns: [
          { key: "date", label: "תאריך", type: "date" },
          { key: "amount", label: "סכום", type: "money" },
          { key: "source", label: "מקור הכסף", type: "choice", options: ["הון עצמי", "משכנתא"] },
        ],
      },
    ],
    fieldsAfter: [
      { key: "trust", label: "צריך להפקיד כסף בנאמנות?", hint: "בנאמנות אצל עורך הדין, עד שהבעלות עוברת אליכם", type: "yesno" },
      { key: "trustAmount", label: "כמה כסף צריך להפקיד בנאמנות?", type: "money", showIf: (v) => v.trust === YES },
      {
        key: "existingMortgage",
        label: "רשומה כרגע משכנתא על הדירה?",
        hint: "למשל, משכנתא של המוכרים",
        type: "yesno",
        detailLabel: "כמה, ובאיזה בנק?",
      },
      { key: "purchaseGroup", label: "הדירה נקנית דרך קבוצת רכישה?", type: "yesno" },
      {
        key: "registry",
        label: "איפה רשומה הדירה?",
        type: "choice",
        options: ["בטאבו", "ברמ\"י (מנהל מקרקעי ישראל)", "בחברה משכנת", "אחר", "לא יודעים"],
      },
      { key: "rightsApproval", label: "יש לכם אישור זכויות?", type: "yesno" },
      { key: "condoPlan", label: "יש לכם תשריט בית משותף?", hint: "לא בטוחים? אין בעיה, נבדוק יחד.", type: "yesno" },
    ],
  },
  {
    id: "contacts",
    letter: "ז",
    title: "עורכי דין ובנקים",
    intro: "כמעט סיימנו. מי עוד מלווה את העסקה, והאם כבר פניתם לבנקים.",
    fields: [
      { key: "lawyer", label: "עורך הדין שלכם: שם וטלפון", type: "text" },
      { key: "sellerLawyer", label: "עורך הדין של המוכרים: שם וטלפון", type: "text" },
      { key: "visitedBanks", label: "כבר פניתם לבנקים?", type: "yesno" },
    ],
    tables: [
      {
        key: "banks",
        title: "הבנקים שפניתם אליהם",
        addLabel: "הוספת בנק",
        showIf: (v) => v.visitedBanks === YES,
        columns: [
          { key: "bank", label: "בנק", type: "text" },
          { key: "branch", label: "סניף", type: "text" },
          { key: "approval", label: "קיבלתם אישור עקרוני?", type: "yesno" },
        ],
      },
    ],
  },
  {
    id: "expectations",
    letter: "ח",
    title: "מה חשוב לכם",
    intro: "ולסיום, נשמח לשמוע מה חשוב לכם בתהליך.",
    fields: [
      {
        key: "expectations",
        label: "מה אתם מצפים לקבל מתהליך הייעוץ?",
        type: "textarea",
        placeholder: "כל מה שחשוב לכם שנדע: חששות, מטרות, לוחות זמנים...",
        wide: true,
      },
    ],
  },
];

export function fieldKey(field: Field, borrower?: 1 | 2): string {
  return field.perBorrower ? `b${borrower ?? 1}.${field.key}` : field.key;
}

export function isVisible(field: { showIf?: (v: Values) => boolean }, values: Values): boolean {
  return field.showIf ? field.showIf(values) : true;
}

export function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(n: number): string {
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
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
  return raw;
}

/** Rows that have at least one filled cell. */
export function filledRows(rows: Row[] | undefined): Row[] {
  return (rows ?? []).filter((r) => Object.values(r).some((v) => v && v.trim() !== ""));
}

// ---------------------------------------------------------------------------
// Report calculations
// ---------------------------------------------------------------------------

export type Insight = { tone: "attention" | "good" | "info"; text: string };

export type MortgageSummary = {
  netIncome: number;
  grossIncome: number;
  extraIncome: number;
  totalIncome: number;
  expenses: number;
  loansMonthly: number;
  loansBalance: number;
  disposable: number;
  assetsTotal: number;
  propertyValue: number;
  equity: number;
  mortgageNeeded: number;
  ltv: number | null;
  ltvLimit: number;
  maxRepayment: number;
  startRepayment: number;
  repaymentRatio: number | null;
  insights: Insight[];
};

export function ltvLimitFor(status: string | undefined): number {
  if (!status || status === APARTMENT_STATUS.first) return 75;
  // Older answers used slightly different wording; match by meaning.
  if (status === APARTMENT_STATUS.upgrade || status.includes("למכור") || status.includes("תימכר")) return 70;
  if (status === APARTMENT_STATUS.second || status.includes("שנייה ומעלה")) return 50;
  return 75;
}

export function summarize(r: MortgageResponses): MortgageSummary {
  const v = r.values;
  const borrowers: (1 | 2)[] = r.borrowers === 2 ? [1, 2] : [1];
  const sum = (key: string) => borrowers.reduce((acc, b) => acc + toNumber(v[`b${b}.${key}`]), 0);

  const netIncome = sum("netIncome");
  const grossIncome = sum("grossIncome");
  const extraIncome = sum("extraIncomeAmount");
  const totalIncome = netIncome + extraIncome;
  const expenses = toNumber(v.monthlyExpenses);
  const loans = filledRows(r.tables.liabilities);
  const loansMonthly = loans.reduce((a, row) => a + toNumber(row.monthly), 0);
  const loansBalance = loans.reduce((a, row) => a + toNumber(row.amount), 0);
  const assetsTotal = filledRows(r.tables.assets).reduce((a, row) => a + toNumber(row.amount), 0);
  const propertyValue = toNumber(v.propertyValue);
  const equity = toNumber(v.equity);
  const mortgageNeeded = toNumber(v.mortgageNeeded);
  const ltv = propertyValue > 0 ? (mortgageNeeded / propertyValue) * 100 : null;
  const ltvLimit = ltvLimitFor(v.apartmentStatus);
  const maxRepayment = toNumber(v.maxRepayment);
  const startRepayment = toNumber(v.startRepayment);
  const repaymentRatio = totalIncome > 0 && maxRepayment > 0 ? ((maxRepayment + loansMonthly) / totalIncome) * 100 : null;
  const disposable = totalIncome - expenses - loansMonthly;

  const insights: Insight[] = [];
  const anyBorrower = (key: string) => borrowers.some((b) => v[`b${b}.${key}`] === YES);
  const whoSaid = (key: string, value: string) =>
    borrowers.filter((b) => v[`b${b}.${key}`] === value).map((b) => v[`b${b}.fullName`] || `לווה ${b}`).join(", ");

  if (ltv !== null) {
    if (ltv > ltvLimit) {
      insights.push({
        tone: "attention",
        text: `אחוז המימון (${ltv.toFixed(1)}%) גבוה מהמקסימום המותר (${ltvLimit}%) עבור "${v.apartmentStatus || APARTMENT_STATUS.first}". חסר הון עצמי של כ-${formatMoney(mortgageNeeded - (propertyValue * ltvLimit) / 100)}.`,
      });
    } else {
      insights.push({ tone: "good", text: `אחוז המימון (${ltv.toFixed(1)}%) בתוך המגבלה (${ltvLimit}%).` });
    }
  }
  if (propertyValue > 0 && equity + mortgageNeeded > 0) {
    const gap = propertyValue - equity - mortgageNeeded;
    if (Math.abs(gap) > propertyValue * 0.01) {
      insights.push({
        tone: "attention",
        text:
          gap > 0
            ? `ההון העצמי והמשכנתא יחד קטנים משווי הדירה ב-${formatMoney(gap)}. כדאי לברר איך יושלם הפער, ולזכור גם מס רכישה ועלויות נלוות.`
            : `ההון העצמי והמשכנתא יחד גדולים משווי הדירה ב-${formatMoney(-gap)}. ייתכן שאפשר להקטין את המשכנתא.`,
      });
    }
  }
  if (repaymentRatio !== null) {
    if (repaymentRatio > 40) {
      insights.push({
        tone: "attention",
        text: `ההחזר המבוקש, יחד עם ההלוואות הקיימות, הוא ${repaymentRatio.toFixed(0)}% מההכנסה. מעל 40% הבנקים מחמירים.`,
      });
    } else if (repaymentRatio > 33) {
      insights.push({ tone: "info", text: `יחס ההחזר להכנסה הוא ${repaymentRatio.toFixed(0)}%: סביר, אבל קרוב לגבול שהבנקים בודקים.` });
    } else {
      insights.push({ tone: "good", text: `יחס ההחזר להכנסה הוא ${repaymentRatio.toFixed(0)}%: נוח מאוד מבחינת הבנק.` });
    }
  }
  if (disposable < maxRepayment && maxRepayment > 0 && totalIncome > 0) {
    insights.push({
      tone: "attention",
      text: `אחרי ההוצאות וההלוואות נשארים ${formatMoney(disposable)} בחודש, פחות מההחזר המקסימלי שציינו (${formatMoney(maxRepayment)}). כדאי לעבור יחד על התקציב.`,
    });
  }
  if (v.restrictedNow === YES) insights.push({ tone: "attention", text: "החשבון מוגבל כרגע. צריך לטפל בזה לפני הפנייה לבנקים." });
  if (v.restrictedPast === YES) insights.push({ tone: "attention", text: `החשבון הוגבל בעבר${v.restrictedPast__detail ? ` (${v.restrictedPast__detail})` : ""}.` });
  if (v.returnedChecks === YES) insights.push({ tone: "attention", text: `חזרו צ'קים בעבר${v.returnedChecks__detail ? ` (${v.returnedChecks__detail})` : ""}.` });
  if (v.overdraft === YES) insights.push({ tone: "attention", text: "הייתה חריגה ממסגרת האשראי בשלושת החודשים האחרונים. הבנק יראה את זה בדפי החשבון." });
  if (v.balance === BALANCE_NEGATIVE) insights.push({ tone: "attention", text: "החשבון בדרך כלל במינוס." });
  if (anyBorrower("medical")) insights.push({ tone: "attention", text: `מגבלה רפואית שעלולה להשפיע על ביטוח החיים: ${whoSaid("medical", YES)}. כדאי לבדוק את הביטוח מראש.` });
  if (anyBorrower("citizenship")) insights.push({ tone: "info", text: `אזרחות נוספת: ${whoSaid("citizenship", YES)} (יידרשו טפסי FATCA/CRS).` });
  if (anyBorrower("relativeAtBank")) insights.push({ tone: "info", text: `קרוב משפחה עובד בבנק: ${whoSaid("relativeAtBank", YES)}.` });
  if (borrowers.some((b) => v[`b${b}.incomeTrend`] === INCOME_DROP))
    insights.push({ tone: "attention", text: `ההכנסה צפויה לרדת: ${whoSaid("incomeTrend", INCOME_DROP)}.` });
  if (anyBorrower("careerChange")) insights.push({ tone: "info", text: `תוכניות לשינוי תעסוקתי: ${whoSaid("careerChange", YES)}.` });
  if (anyBorrower("deductions")) insights.push({ tone: "info", text: `יורדים מהשכר החזרי הלוואות או רכב: ${whoSaid("deductions", YES)}.` });
  if (borrowers.some((b) => v[`b${b}.tenure`] === NO)) insights.push({ tone: "info", text: `אין קביעות: ${whoSaid("tenure", NO)}.` });
  if (v.existingMortgage === YES) insights.push({ tone: "info", text: `רשומה משכנתא על הדירה${v.existingMortgage__detail ? `: ${v.existingMortgage__detail}` : ""}.` });
  if (v.purchaseGroup === YES) insights.push({ tone: "info", text: "הדירה נקנית דרך קבוצת רכישה. לא כל הבנקים מממנים עסקה כזו, וצריך לבדוק מראש." });
  if (v.futureInflow === YES)
    insights.push({
      tone: "good",
      text: `צפויה כניסת כסף בחמש השנים הקרובות${v.futureInflowAmount ? ` (כ-${formatMoney(toNumber(v.futureInflowAmount))})` : ""}. כדאי לשלב מסלול שמאפשר פירעון מוקדם בלי קנס.`,
    });
  if (v.switchBank === YES) insights.push({ tone: "good", text: "מוכנים לעבור בנק, וזה נותן מרחב טוב למשא ומתן." });
  if (filledRows(r.tables.banks).some((b) => b.approval === YES)) insights.push({ tone: "good", text: "יש כבר אישור עקרוני מבנק." });

  return {
    netIncome,
    grossIncome,
    extraIncome,
    totalIncome,
    expenses,
    loansMonthly,
    loansBalance,
    disposable,
    assetsTotal,
    propertyValue,
    equity,
    mortgageNeeded,
    ltv,
    ltvLimit,
    maxRepayment,
    startRepayment,
    repaymentRatio,
    insights,
  };
}

export function parseResponses(raw: unknown): MortgageResponses | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<MortgageResponses>;
  if (r.version !== 1 || typeof r.values !== "object") return null;
  return {
    version: 1,
    borrowers: r.borrowers === 2 ? 2 : 1,
    values: (r.values ?? {}) as Values,
    tables: (r.tables ?? {}) as Tables,
  };
}
