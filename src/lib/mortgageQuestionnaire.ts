// The pre-consultation mortgage questionnaire ("שאלון לפני ייעוץ"), as data.
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
export const PURCHASE_TYPES = ["יד שנייה", "קבלן", "בנייה עצמית", "אחר"];
export const APARTMENT_STATUS = {
  first: "דירה ראשונה ויחידה",
  upgrade: "דירה שנייה, אבל מוכרים את הראשונה תוך שנתיים",
  second: "דירה שנייה ומעלה",
};

export const SECTIONS: Section[] = [
  {
    id: "personal",
    letter: "א",
    title: "פרטים אישיים",
    intro: "נתחיל בהיכרות. אם יש לווה נוסף, ממלאים את הפרטים של שניכם זה לצד זה.",
    fields: [
      { key: "fullName", label: "שם מלא", type: "text", perBorrower: true, required: true },
      { key: "idNumber", label: "מספר ת.ז", type: "id", perBorrower: true },
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
      { key: "citizenship", label: "האם יש אזרחות נוספת?", type: "yesno", detailLabel: "איזו?", perBorrower: true },
      {
        key: "medical",
        label: "האם קיימת מגבלה רפואית שתמנע ביטוח חיים?",
        type: "yesno",
        detailLabel: "פרטו בקצרה",
        perBorrower: true,
      },
      {
        key: "relativeAtBank",
        label: "האם קרוב משפחה שלכם עובד בבנק?",
        type: "yesno",
        detailLabel: "באיזה בנק?",
        perBorrower: true,
      },
      { key: "kidsUnder18", label: "מספר ילדים מתחת לגיל 18", type: "number" },
      {
        key: "kidsAges",
        label: "גילאי הילדים",
        type: "text",
        placeholder: "לדוגמה: 2, 5, 9",
        showIf: (v) => Number(v.kidsUnder18 || 0) > 0,
      },
    ],
  },
  {
    id: "employment",
    letter: "ב",
    title: "השכלה ותעסוקה",
    intro: "ההכנסה היא הבסיס לכל משכנתא טובה. כאן מספרים על העבודה וההכנסה של כל לווה.",
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
        options: ["שכיר/ה", "עצמאי/ת", "שכיר/ה + עצמאי/ת", "לא עובד/ת"],
        perBorrower: true,
      },
      { key: "employer", label: "שם מקום העבודה", type: "text", perBorrower: true },
      { key: "seniority", label: "ותק במקום העבודה", type: "text", placeholder: "לדוגמה: 3 שנים", perBorrower: true },
      { key: "tenure", label: "האם יש קביעות במקום העבודה?", type: "yesno", perBorrower: true },
      { key: "grossIncome", label: "הכנסה ברוטו (חודשית)", type: "money", perBorrower: true },
      { key: "netIncome", label: "הכנסה נטו (חודשית)", type: "money", perBorrower: true, required: true },
      {
        key: "deductions",
        label: "האם יורדות הלוואות או רכב מהשכר?",
        type: "yesno",
        detailLabel: "מה יורד וכמה בחודש?",
        perBorrower: true,
      },
      {
        key: "incomeTrend",
        label: "האם ההכנסה צפויה לעלות או לרדת?",
        type: "choice",
        options: ["צפויה לעלות", "יציבה", "צפויה לרדת"],
        perBorrower: true,
      },
      {
        key: "careerChange",
        label: "האם יש תוכניות לשינוי תעסוקתי?",
        type: "yesno",
        detailLabel: "מה מתוכנן?",
        perBorrower: true,
      },
      {
        key: "extraIncome",
        label: "האם יש מקורות הכנסה קבועים נוספים?",
        type: "yesno",
        detailLabel: "מה המקור וכמה בחודש?",
        perBorrower: true,
      },
      {
        key: "extraIncomeAmount",
        label: "סכום ההכנסה הנוספת בחודש",
        type: "money",
        perBorrower: true,
        showIf: (v) => v["b1.extraIncome"] === YES || v["b2.extraIncome"] === YES,
      },
      {
        key: "monthlyExpenses",
        label: "כמה כסף אתם מוציאים בכל חודש? (כל משק הבית)",
        type: "money",
        hint: "הערכה כללית מספיקה, בלי החזרי הלוואות.",
      },
    ],
  },
  {
    id: "finance",
    letter: "ג",
    title: "פיננסים",
    intro: "כמה שאלות על חשבון הבנק. זה נשאר ביננו, ועוזר לנו לדעת מראש מה הבנק יראה.",
    fields: [
      { key: "bankBranch", label: "שם הבנק ומספר הסניף", type: "text", placeholder: "לדוגמה: לאומי, סניף 902" },
      {
        key: "balance",
        label: "מה מצב היתרה בדרך כלל?",
        type: "choice",
        options: ["בדרך כלל בפלוס", "משתנה, לפעמים במינוס", "בדרך כלל במינוס"],
      },
      { key: "overdraft", label: "האם חרגתם ממסגרת האשראי ב-3 החודשים האחרונים?", type: "yesno" },
      { key: "returnedChecks", label: "האם חזרו לכם צ'קים בעבר?", type: "yesno", detailLabel: "מתי ובאיזה הקשר?" },
      { key: "restrictedPast", label: "האם החשבון שלכם הוגבל בעבר?", type: "yesno", detailLabel: "מתי?" },
      { key: "restrictedNow", label: "האם החשבון שלכם מוגבל כרגע?", type: "yesno" },
      {
        key: "switchBank",
        label: "האם תהיו מוכנים לעבור בנק כדי להוזיל את עלויות המשכנתא?",
        type: "choice",
        options: ["כן", "לא", "אולי, תלוי בהצעה"],
      },
    ],
  },
  {
    id: "assets",
    letter: "ד",
    title: "נכסים פיננסיים",
    intro: "כסף שצברתם יכול לשמש כהון עצמי או כרזרבה. רשמו כל חיסכון שיש לכם.",
    fields: [],
    tables: [
      {
        key: "assets",
        title: "הנכסים הפיננסיים שלכם",
        hint: "קופות גמל, קרנות השתלמות, תוכניות חיסכון, פיקדונות, ני\"ע וכדומה.",
        addLabel: "הוספת נכס",
        columns: [
          { key: "type", label: "סוג הנכס", type: "text" },
          { key: "amount", label: "סכום", type: "money" },
          { key: "liquidDate", label: "מתי הכסף נזיל", type: "text" },
        ],
      },
    ],
  },
  {
    id: "liabilities",
    letter: "ה",
    title: "התחייבויות פיננסיות",
    intro: "הלוואות קיימות משפיעות על גובה ההחזר שהבנק יאשר. רשמו כל הלוואה פעילה.",
    fields: [],
    tables: [
      {
        key: "liabilities",
        title: "הלוואות והתחייבויות קיימות",
        hint: "הלוואות בנקאיות, רכב, כרטיסי אשראי, גמ\"חים, הלוואות ממשפחה.",
        addLabel: "הוספת הלוואה",
        columns: [
          { key: "lender", label: "למי", type: "text" },
          { key: "amount", label: "יתרה", type: "money" },
          { key: "monthly", label: "תשלום חודשי", type: "money" },
          { key: "rate", label: "% ריבית", type: "percent" },
          { key: "endDate", label: "תאריך סיום", type: "date" },
          { key: "bankDoc", label: "יש אסמכתא מהבנק?", type: "yesno" },
        ],
      },
    ],
    fieldsAfter: [
      { key: "maxRepayment", label: "מה ההחזר החודשי המקסימלי שתוכלו לעמוד בו?", type: "money", required: true },
      { key: "startRepayment", label: "מה התשלום החודשי שבו תרצו להתחיל?", type: "money" },
      {
        key: "futureInflow",
        label: "האם אתם צופים כניסה של כסף לטובת המשכנתא בחמש השנים הקרובות?",
        type: "yesno",
        detailLabel: "מאיפה ומתי, בערך?",
      },
      {
        key: "futureInflowAmount",
        label: "כמה בערך?",
        type: "money",
        showIf: (v) => v.futureInflow === YES,
      },
    ],
    note: "ככל שההחזר החודשי גבוה יותר, כך אפשר לבנות משכנתא טובה וזולה יותר.",
  },
  {
    id: "deal",
    letter: "ו",
    title: "העסקה",
    intro: "ועכשיו לדירה עצמה. כמה שיותר פרטים, כך נוכל לתכנן את המימון בדיוק.",
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
        label: "האם זו:",
        type: "choice",
        options: [APARTMENT_STATUS.first, APARTMENT_STATUS.second, APARTMENT_STATUS.upgrade],
        required: true,
      },
      {
        key: "keyDate",
        label: "מה מועד מסירת המפתח?",
        type: "date",
        showIf: (v) => v.purchaseType === "קבלן",
      },
      {
        key: "expectedRent",
        label: "מה שכר הדירה שניתן לקבל על הנכס?",
        type: "money",
        showIf: (v) => v.purpose === PURPOSE.invest,
      },
      { key: "currentHome", label: "איפה אתם גרים כיום?", type: "text", placeholder: "כתובת" },
      { key: "currentRent", label: "שכר דירה נוכחי (אם אתם בשכירות)", type: "money" },
      { key: "contractDate", label: "תאריך חתימת הסכם המכר", type: "date" },
      { key: "propertyValue", label: "מה שווי הנכס?", type: "money", required: true },
      { key: "equity", label: "כמה הון עצמי יש לכם?", type: "money", required: true },
      { key: "mortgageNeeded", label: "כמה משכנתא אתם צריכים?", type: "money", required: true },
    ],
    tables: [
      {
        key: "payments",
        title: "סדר התשלומים למוכר",
        hint: "לפי ההסכם: מתי משלמים, כמה, ומאיפה מגיע הכסף.",
        addLabel: "הוספת תשלום",
        columns: [
          { key: "date", label: "תאריך", type: "date" },
          { key: "amount", label: "סכום", type: "money" },
          { key: "source", label: "מקור", type: "choice", options: ["הון עצמי", "משכנתא"] },
        ],
      },
    ],
    fieldsAfter: [
      { key: "trust", label: "האם צריך להעביר כסף בנאמנות?", type: "yesno" },
      { key: "trustAmount", label: "סכום הכסף בנאמנות", type: "money", showIf: (v) => v.trust === YES },
      {
        key: "existingMortgage",
        label: "האם יש משכנתא על הנכס?",
        type: "yesno",
        detailLabel: "כמה ובאיזה בנק?",
      },
      { key: "purchaseGroup", label: "האם הנכס נרכש מקבוצת רכישה?", type: "yesno" },
      {
        key: "registry",
        label: "היכן רשום הנכס?",
        type: "choice",
        options: ["טאבו", "מנהל (רמ\"י)", "חברה משכנת", "אחר", "לא יודעים"],
      },
      { key: "rightsApproval", label: "האם יש לכם אישור זכויות?", type: "yesno" },
      { key: "condoPlan", label: "האם יש לכם תשריט בית משותף?", type: "yesno" },
    ],
  },
  {
    id: "contacts",
    letter: "ז",
    title: "עורכי דין ובנקים",
    intro: "כמעט סיימנו. מי עוד מעורב בעסקה, והאם כבר הייתם בבנקים.",
    fields: [
      { key: "lawyer", label: "עורך הדין שלכם: שם וטלפון", type: "text" },
      { key: "sellerLawyer", label: "עורך הדין של המוכרים: שם וטלפון", type: "text" },
      { key: "visitedBanks", label: "האם כבר הייתם בבנקים?", type: "yesno" },
    ],
    tables: [
      {
        key: "banks",
        title: "הבנקים שכבר ביקרתם בהם",
        addLabel: "הוספת בנק",
        showIf: (v) => v.visitedBanks === YES,
        columns: [
          { key: "bank", label: "בנק", type: "text" },
          { key: "branch", label: "סניף", type: "text" },
          { key: "approval", label: "יש אישור עקרוני?", type: "yesno" },
        ],
      },
    ],
  },
  {
    id: "expectations",
    letter: "ח",
    title: "תיאום ציפיות",
    intro: "השאלה הכי חשובה: מה חשוב לכם בתהליך?",
    fields: [
      {
        key: "expectations",
        label: "מה הציפיות שלכם מתהליך הייעוץ?",
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
  if (status === APARTMENT_STATUS.first) return 75;
  if (status === APARTMENT_STATUS.upgrade) return 70;
  if (status === APARTMENT_STATUS.second) return 50;
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
        text: `אחוז המימון ${ltv.toFixed(1)}% גבוה מהמקסימום המותר (${ltvLimit}%) ל"${v.apartmentStatus || "דירה ראשונה"}". חסר הון עצמי של כ-${formatMoney(mortgageNeeded - (propertyValue * ltvLimit) / 100)}.`,
      });
    } else {
      insights.push({ tone: "good", text: `אחוז המימון ${ltv.toFixed(1)}%, בתוך המגבלה (${ltvLimit}%).` });
    }
  }
  if (propertyValue > 0 && equity + mortgageNeeded > 0) {
    const gap = propertyValue - equity - mortgageNeeded;
    if (Math.abs(gap) > propertyValue * 0.01) {
      insights.push({
        tone: "attention",
        text:
          gap > 0
            ? `הון עצמי + משכנתא קטנים משווי הנכס ב-${formatMoney(gap)}. כדאי לברר איך יושלם הפער (ולזכור מס רכישה ועלויות נלוות).`
            : `הון עצמי + משכנתא גדולים משווי הנכס ב-${formatMoney(-gap)}. אולי אפשר להקטין את המשכנתא.`,
      });
    }
  }
  if (repaymentRatio !== null) {
    if (repaymentRatio > 40) {
      insights.push({
        tone: "attention",
        text: `ההחזר המבוקש יחד עם ההלוואות הקיימות הוא ${repaymentRatio.toFixed(0)}% מההכנסה. מעל 40% הבנקים מחמירים.`,
      });
    } else if (repaymentRatio > 33) {
      insights.push({ tone: "info", text: `יחס החזר להכנסה ${repaymentRatio.toFixed(0)}%. סביר, אבל קרוב לגבול שהבנקים בודקים.` });
    } else {
      insights.push({ tone: "good", text: `יחס החזר להכנסה ${repaymentRatio.toFixed(0)}%, נוח מאוד מבחינת הבנק.` });
    }
  }
  if (disposable < maxRepayment && maxRepayment > 0 && totalIncome > 0) {
    insights.push({
      tone: "attention",
      text: `אחרי הוצאות והלוואות נשארים ${formatMoney(disposable)} בחודש, פחות מההחזר המקסימלי שציינו (${formatMoney(maxRepayment)}). שווה לעבור יחד על התקציב.`,
    });
  }
  if (v.restrictedNow === YES) insights.push({ tone: "attention", text: "החשבון מוגבל כרגע. צריך לטפל בזה לפני פנייה לבנקים." });
  if (v.restrictedPast === YES) insights.push({ tone: "attention", text: `החשבון הוגבל בעבר${v.restrictedPast__detail ? ` (${v.restrictedPast__detail})` : ""}.` });
  if (v.returnedChecks === YES) insights.push({ tone: "attention", text: `חזרו צ'קים בעבר${v.returnedChecks__detail ? ` (${v.returnedChecks__detail})` : ""}.` });
  if (v.overdraft === YES) insights.push({ tone: "attention", text: "הייתה חריגה ממסגרת האשראי ב-3 החודשים האחרונים. הבנק יראה את זה בדפי החשבון." });
  if (v.balance === "בדרך כלל במינוס") insights.push({ tone: "attention", text: "החשבון בדרך כלל במינוס." });
  if (anyBorrower("medical")) insights.push({ tone: "attention", text: `מגבלה רפואית לביטוח חיים: ${whoSaid("medical", YES)}. כדאי לבדוק ביטוח מראש.` });
  if (anyBorrower("citizenship")) insights.push({ tone: "info", text: `אזרחות נוספת: ${whoSaid("citizenship", YES)} (טפסי FATCA/CRS).` });
  if (anyBorrower("relativeAtBank")) insights.push({ tone: "info", text: `קרוב משפחה עובד בבנק: ${whoSaid("relativeAtBank", YES)}.` });
  if (borrowers.some((b) => v[`b${b}.incomeTrend`] === "צפויה לרדת"))
    insights.push({ tone: "attention", text: `הכנסה צפויה לרדת: ${whoSaid("incomeTrend", "צפויה לרדת")}.` });
  if (anyBorrower("careerChange")) insights.push({ tone: "info", text: `תוכניות לשינוי תעסוקתי: ${whoSaid("careerChange", YES)}.` });
  if (anyBorrower("deductions")) insights.push({ tone: "info", text: `יורדות הלוואות/רכב מהשכר: ${whoSaid("deductions", YES)}.` });
  if (borrowers.some((b) => v[`b${b}.tenure`] === NO)) insights.push({ tone: "info", text: `אין קביעות: ${whoSaid("tenure", NO)}.` });
  if (v.existingMortgage === YES) insights.push({ tone: "info", text: `יש משכנתא קיימת על הנכס${v.existingMortgage__detail ? `: ${v.existingMortgage__detail}` : ""}.` });
  if (v.purchaseGroup === YES) insights.push({ tone: "info", text: "הנכס נרכש מקבוצת רכישה. לא כל הבנקים מממנים, צריך לבדוק מראש." });
  if (v.futureInflow === YES)
    insights.push({
      tone: "good",
      text: `צפויה כניסת כסף בחמש השנים הקרובות${v.futureInflowAmount ? ` (כ-${formatMoney(toNumber(v.futureInflowAmount))})` : ""}. כדאי לשלב מסלול שמאפשר פירעון מוקדם בלי קנס.`,
    });
  if (v.switchBank === YES) insights.push({ tone: "good", text: "מוכנים לעבור בנק. זה מרחב משא ומתן טוב." });
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
