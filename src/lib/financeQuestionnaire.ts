// The pre-coaching questionnaire ("שאלון לפני ליווי כלכלי"), as data.
// Built from Israel's Google Forms intake (the same questions as
// src/app/onboarding/[token]/formSchema.ts), rewritten in plain Hebrew and
// reorganized into the shared questionnaire structure.

import {
  YES,
  NO,
  filledRows,
  formatMoney,
  hasAnswer,
  splitMulti,
  toNumber,
  type Insight,
  type QuestionnaireResponses,
  type Section,
} from "./questionnaire/core";

export const HOUSING = { own: "בבעלותנו", rent: "בשכירות", both: "שוכרים ומשכירים" };
export const DEBTS = { yes: "כן", no: "לא", some: "קצת" };
export const RIGHTS_OPTIONS = ["כן, וקיבלנו", "כן, אבל לא היינו זכאים", "לא הגשנו", "לא יודעים מה זה"];
export const RIGHTS_NOT_USED = ["לא הגשנו", "לא יודעים מה זה"];
export const NO_INSTRUMENTS = "אין לנו אף אחד מהם";
export const NO_PROFESSIONAL = "לא צריכים";

const isRenting = (v: Record<string, string>) => v.housing === HOUSING.rent || v.housing === HOUSING.both;
const hasKids = (v: Record<string, string>) => toNumber(v.childrenCount) > 0;

export const FINANCE_SECTIONS: Section[] = [
  {
    id: "personal",
    letter: "א",
    title: "היכרות",
    intro: "נתחיל בהיכרות קצרה. אם אתם זוג, ממלאים את הפרטים של שניכם, זה לצד זה.",
    fields: [
      { key: "fullName", label: "שם מלא", type: "text", perBorrower: true, required: true },
      { key: "phone", label: "טלפון נייד", type: "tel", perBorrower: true, required: true },
      { key: "age", label: "גיל", type: "number", perBorrower: true },
      { key: "email", label: "כתובת מייל", type: "email" },
      {
        key: "contactBy",
        label: "איך הכי נוח ליצור איתכם קשר?",
        hint: "אפשר לבחור יותר מתשובה אחת",
        type: "multi",
        options: ["וואטסאפ", "שיחת טלפון", "מייל"],
      },
      {
        key: "marriageYears",
        label: "כמה שנים אתם נשואים?",
        type: "number",
        showIf: (v) => v.__count === "2",
      },
      { key: "childrenCount", label: "כמה ילדים יש לכם, בלי עין הרע?", type: "number", placeholder: "0" },
      {
        key: "childrenAges",
        label: "בני כמה הילדים?",
        hint: "מספיק לרשום את הגיל של הקטן ושל הגדול",
        type: "text",
        placeholder: "לדוגמה: 1 עד 14",
        showIf: hasKids,
      },
      { key: "marriedChildren", label: "כמה ילדים נשואים יש לכם?", type: "number", placeholder: "0", showIf: hasKids },
      { key: "usCitizenship", label: "יש אזרחות אמריקאית?", type: "yesno", perBorrower: true },
      {
        key: "usInformed",
        label: "הבנקים וחברות הביטוח יודעים על האזרחות האמריקאית?",
        type: "choice",
        options: [YES, NO, "לא יודעים"],
        showIf: (v) => v["b1.usCitizenship"] === YES || v["b2.usCitizenship"] === YES,
      },
      {
        key: "usTaxReport",
        label: "אתם מגישים דוח שנתי לרשויות המס בארצות הברית?",
        type: "choice",
        options: [YES, NO, "לא יודעים"],
        showIf: (v) => v["b1.usCitizenship"] === YES || v["b2.usCitizenship"] === YES,
      },
      {
        key: "usChildBenefit",
        label: "אתם מקבלים מענק ילדים מארצות הברית?",
        type: "yesno",
        showIf: (v) => v["b1.usCitizenship"] === YES || v["b2.usCitizenship"] === YES,
      },
      { key: "car", label: "יש לכם רכב?", type: "yesno", detailLabel: "איזה רכב, ומאיזו שנה?" },
    ],
  },
  {
    id: "work",
    letter: "ב",
    title: "עבודה והכנסה",
    intro: "כאן מספרים על העבודה ועל ההכנסה של כל אחד מכם.",
    fields: [
      {
        key: "occupation",
        label: "במה עובדים?",
        hint: "אם יש כמה עבודות, כולל עבודה בלי תלוש או הכנסה מהצד, פרטו את כולן",
        type: "text",
        perBorrower: true,
      },
      {
        key: "employmentType",
        label: "סוג העסקה",
        type: "choice",
        options: ["שכיר/ה", "עצמאי/ת", "גם וגם", "אברך", "סטודנט/ית", "מקבל/ת דמי אבטלה", "לא עובד/ת"],
        hasOther: true,
        perBorrower: true,
      },
      {
        key: "jobScope",
        label: "היקף משרה",
        hint: "מופיע בתלוש השכר, בחלק של הפרטים האישיים. אם אין תלוש, רשמו 0.",
        type: "text",
        placeholder: "לדוגמה: 100%",
        perBorrower: true,
      },
      { key: "netSalary", label: "משכורת חודשית נטו", hint: "הסכום שנכנס לחשבון", type: "money", perBorrower: true },
      {
        key: "incomeDips",
        label: "יש חודשים שבהם ההכנסה יורדת?",
        type: "yesno",
        detailLabel: "באילו חודשים, ובכמה בערך?",
        perBorrower: true,
      },
      {
        key: "extraIncome",
        label: "יש הכנסות נוספות?",
        hint: "לדוגמה: קצבאות מביטוח לאומי, קצבת ילדים או שכר דירה",
        type: "yesno",
        detailLabel: "מה ההכנסה הנוספת?",
      },
      { key: "extraIncomeAmount", label: "כמה מגיע מההכנסות הנוספות בחודש, בערך?", type: "money", showIf: (v) => v.extraIncome === YES },
    ],
  },
  {
    id: "budget",
    letter: "ג",
    title: "התקציב החודשי",
    intro: "תמונה כללית של מה שנכנס ומה שיוצא. הערכה מספיקה, את הפרטים נעשה יחד.",
    fields: [
      {
        key: "totalIncome",
        label: "כמה נכנס לכם בחודש בסך הכול, בערך?",
        hint: "כל ההכנסות של משק הבית יחד",
        type: "money",
        required: true,
      },
      { key: "totalExpenses", label: "כמה יוצא לכם בחודש בסך הכול, בערך?", type: "money", required: true },
      {
        key: "hasDebts",
        label: "יש לכם חובות או הלוואות?",
        type: "choice",
        options: [DEBTS.yes, DEBTS.some, DEBTS.no],
        required: true,
      },
    ],
    tables: [
      {
        key: "loans",
        title: "החובות וההלוואות שלכם",
        hint: "לדוגמה: הלוואה מהבנק, גמ\"ח, הלוואה מהמשפחה או מינוס קבוע בחשבון. לא כולל משכנתא.",
        addLabel: "הוספת הלוואה",
        showIf: (v) => v.hasDebts === DEBTS.yes || v.hasDebts === DEBTS.some,
        columns: [
          { key: "lender", label: "ממי ההלוואה?", type: "text" },
          { key: "balance", label: "כמה נשאר לשלם?", type: "money" },
          { key: "monthly", label: "החזר חודשי", type: "money" },
          { key: "rate", label: "ריבית (%)", type: "percent" },
        ],
      },
    ],
    fieldsAfter: [{ key: "hasSavings", label: "יש לכם חסכונות?", type: "yesno" }],
  },
  {
    id: "savings",
    letter: "ד",
    title: "חסכונות",
    intro: "כל שקל שחסכתם הוא חלק מהתמונה. רשמו כל סוג חיסכון שיש לכם.",
    fields: [],
    tables: [
      {
        key: "savings",
        title: "החסכונות שלכם",
        hint: "לדוגמה: גמ\"ח, קופת גמל, קרן השתלמות, קרן כספית או פיקדון בבנק.",
        addLabel: "הוספת חיסכון",
        columns: [
          { key: "type", label: "סוג החיסכון", type: "text" },
          { key: "where", label: "איפה הוא נמצא?", type: "text" },
          { key: "amount", label: "סכום", type: "money" },
        ],
      },
    ],
  },
  {
    id: "housing",
    letter: "ה",
    title: "מגורים",
    intro: "כמה שאלות על הבית שלכם.",
    fields: [
      { key: "address", label: "איפה אתם גרים?", type: "text", placeholder: "עיר ושכונה" },
      {
        key: "housing",
        label: "הדירה שאתם גרים בה:",
        type: "choice",
        options: [HOUSING.own, HOUSING.rent, HOUSING.both],
        required: true,
      },
      { key: "homeValue", label: "כמה שווה הדירה, בערך?", type: "money", showIf: (v) => v.housing === HOUSING.own },
      { key: "mortgage", label: "יש משכנתא על הדירה?", type: "yesno", showIf: (v) => v.housing === HOUSING.own },
      { key: "mortgageBalance", label: "כמה נשאר לשלם על המשכנתא?", type: "money", showIf: (v) => v.mortgage === YES && v.housing === HOUSING.own },
      { key: "mortgageMonthly", label: "מה ההחזר החודשי של המשכנתא?", type: "money", showIf: (v) => v.mortgage === YES && v.housing === HOUSING.own },
      {
        key: "refinanced",
        label: "עשיתם פעם מיחזור משכנתא?",
        type: "yesno",
        detailLabel: "מתי?",
        showIf: (v) => v.mortgage === YES && v.housing === HOUSING.own,
      },
      { key: "rent", label: "כמה שכר דירה אתם משלמים בחודש?", type: "money", showIf: isRenting },
      {
        key: "rentAssistance",
        label: "אתם מקבלים סיוע בשכר דירה?",
        type: "choice",
        options: [YES, NO, "בדקנו, ואנחנו לא זכאים"],
        showIf: isRenting,
      },
      {
        key: "discountApartment",
        label: "אתם רשומים לתוכנית \"דירה בהנחה\" (לשעבר \"מחיר למשתכן\")?",
        type: "choice",
        options: [YES, NO, "לא יודעים מה זה"],
        showIf: isRenting,
      },
      { key: "investmentProperty", label: "יש לכם עוד נכס, להשקעה?", type: "yesno" },
      { key: "investmentValue", label: "כמה שווה הנכס להשקעה, בערך?", type: "money", showIf: (v) => v.investmentProperty === YES },
    ],
  },
  {
    id: "banking",
    letter: "ו",
    title: "בנק ותשלומים",
    intro: "איך הכסף זז ביום־יום: חשבונות, כרטיסים ועמלות.",
    fields: [
      {
        key: "banks",
        label: "באילו בנקים יש לכם חשבון, ומה החשבון העיקרי?",
        type: "text",
        placeholder: "לדוגמה: פועלים (עיקרי), דואר",
      },
      {
        key: "knowsBankFees",
        label: "אתם יודעים כמה עמלות אתם משלמים לבנק בחודש?",
        type: "yesno",
        detailLabel: "כמה, בערך?",
      },
      {
        key: "paymentMethod",
        label: "איך אתם משלמים בדרך כלל?",
        type: "choice",
        options: ["בעיקר באשראי", "בעיקר במזומן", "גם באשראי וגם במזומן", "בצ'קים", "בכרטיס דביט (דיירקט)", "אין לנו דרך קבועה"],
        hasOther: true,
      },
      { key: "creditCards", label: "כמה כרטיסי אשראי יש לכם?", type: "number", placeholder: "0" },
      {
        key: "cardFees",
        label: "אתם משלמים דמי כרטיס על כרטיסי האשראי?",
        type: "choice",
        options: [YES, NO, "לא יודעים"],
      },
      {
        key: "bounced",
        label: "חזרו לכם צ'קים או הוראות קבע?",
        type: "yesno",
        detailLabel: "מתי, ובאיזה הקשר?",
      },
    ],
  },
  {
    id: "weddings",
    letter: "ז",
    title: "חיסכון לחתונות הילדים",
    intro: "תכנון מוקדם לחתונות הילדים עושה הבדל גדול. ספרו לנו מה המצב היום.",
    fields: [
      {
        key: "weddingSaving",
        label: "אתם חוסכים לחתונות הילדים?",
        type: "choice",
        options: [YES, "עדיין לא", NO],
      },
      {
        key: "weddingWhere",
        label: "איפה אתם חוסכים?",
        hint: "אפשר לבחור יותר מתשובה אחת",
        type: "multi",
        options: ["גמ\"ח המרכזי / אושר בכבוד", "גמ\"ח אחר", "קרן השתלמות", "קופת גמל", "חשבון מסחר עצמאי"],
        hasOther: true,
        showIf: (v) => v.weddingSaving === YES,
      },
      { key: "weddingMonthly", label: "כמה אתם חוסכים לזה בחודש?", type: "money", showIf: (v) => v.weddingSaving === YES },
      {
        key: "weddingWant",
        label: "הייתם רוצים להתחיל לחסוך לחתונות?",
        type: "choice",
        options: [YES, NO, "לא בטוחים"],
        showIf: (v) => !!v.weddingSaving && v.weddingSaving !== YES,
      },
    ],
  },
  {
    id: "insurance",
    letter: "ח",
    title: "ביטוחים ופנסיה",
    intro: "ביטוחים ופנסיה הם המקום שבו הכי קל לשלם יותר מדי בלי לשים לב. לא יודעים תשובה? זה בסדר גמור.",
    fields: [
      {
        key: "lifeInsurance",
        label: "יש לכם ביטוח חיים?",
        hint: "לא כולל את ביטוח החיים של המשכנתא",
        type: "choice",
        options: [YES, NO, "לא יודעים"],
      },
      {
        key: "healthInsurance",
        label: "איזה ביטוח בריאות יש לכם?",
        type: "choice",
        options: ["רק דרך קופת החולים", "ביטוח פרטי", "גם וגם", "אין לנו"],
        hasOther: true,
      },
      {
        key: "duplicates",
        label: "בדקתם אם יש לכם ביטוחים כפולים?",
        hint: "לפעמים משלמים פעמיים על אותו כיסוי",
        type: "choice",
        options: [YES, NO, "לא יודעים מה זה"],
      },
      {
        key: "lamichyatam",
        label: "הצטרפתם לארגון \"למחייתם\"?",
        type: "choice",
        options: [YES, NO, "נשמח לשמוע פרטים"],
      },
      { key: "pension", label: "מפרישים לפנסיה?", type: "yesno", perBorrower: true },
      {
        key: "pensionTrack",
        label: "אתם יודעים באיזה מסלול נמצאת הפנסיה שלכם?",
        type: "choice",
        options: [YES, NO],
      },
      {
        key: "pensionFees",
        label: "כמה דמי ניהול אתם משלמים על הפנסיה?",
        hint: "יש שני סוגים: מההפקדה החודשית ומהחיסכון שנצבר. לא יודעים? רשמו \"לא יודעים\".",
        type: "text",
      },
      {
        key: "pensionReviewed",
        label: "מישהו עבר לאחרונה על תיק הפנסיה שלכם?",
        type: "choice",
        options: [YES, NO, "נשמח שמישהו יעבור עליו"],
      },
      {
        key: "instruments",
        label: "אילו מוצרי חיסכון יש לכם?",
        hint: "אפשר לבחור יותר מתשובה אחת",
        type: "multi",
        options: ["קרן השתלמות", "קרן השתלמות למורים", "קופת גמל", "פוליסת חיסכון", NO_INSTRUMENTS],
        hasOther: true,
      },
      {
        key: "instrumentsChecked",
        label: "מתי בדקתם לאחרונה את המסלולים ואת דמי הניהול שלהם?",
        type: "text",
        showIf: (v) => splitMulti(v.instruments).some((o) => o !== NO_INSTRUMENTS),
      },
      {
        key: "childSavingsDouble",
        label: "בתוכנית \"חיסכון לכל ילד\": אתם מכפילים את ההפקדה?",
        hint: "ההורים יכולים להוסיף הפקדה חודשית מקצבת הילדים, וכך להכפיל את החיסכון",
        type: "choice",
        options: [YES, NO, "לא יודעים מה זה"],
        showIf: hasKids,
      },
      {
        key: "childSavingsWhere",
        label: "באיזו חברה ובאיזה מסלול נמצא \"החיסכון לכל ילד\"?",
        hint: "אם זה שונה בין הילדים, פרטו לכל ילד",
        type: "text",
        showIf: hasKids,
      },
    ],
  },
  {
    id: "rights",
    letter: "ט",
    title: "זכויות ואנשי מקצוע",
    intro: "הרבה משפחות לא מקבלות כסף שמגיע להן. בואו נבדוק.",
    fields: [
      { key: "workGrant", label: "הגשתם בקשה למענק עבודה (מס הכנסה שלילי)?", type: "choice", options: RIGHTS_OPTIONS },
      { key: "arnona", label: "הגשתם בקשה להנחה בארנונה?", type: "choice", options: RIGHTS_OPTIONS },
      {
        key: "daycare",
        label: "הגשתם בקשה להנחה (דרגה) במעון או במשפחתון?",
        type: "choice",
        options: [...RIGHTS_OPTIONS, "אין לנו ילדים במעון"],
      },
      {
        key: "professionals",
        label: "תרצו עזרה גם מאיש מקצוע נוסף?",
        hint: "אפשר לבחור יותר מתשובה אחת",
        type: "multi",
        options: [
          "יועץ משכנתאות",
          "סוכן ביטוח",
          "יועץ פנסיוני",
          "יועץ השקעות (נדל\"ן או שוק ההון)",
          "הכוונה תעסוקתית",
          "מיצוי זכויות (קצבאות, נכות ועוד)",
          NO_PROFESSIONAL,
        ],
        hasOther: true,
      },
    ],
  },
  {
    id: "expectations",
    letter: "י",
    title: "מה חשוב לכם",
    intro: "השאלות החשובות ביותר: למה הגעתם, ומה תרצו שיהיה בסוף הדרך.",
    fields: [
      {
        key: "mainReason",
        label: "מה הביא אתכם לתהליך הליווי?",
        hint: "כמה שיותר פרטים, יותר טוב",
        type: "textarea",
        required: true,
        wide: true,
      },
      {
        key: "situation",
        label: "מה הכי מתאר את המצב שלכם?",
        hint: "אפשר לבחור יותר מתשובה אחת",
        type: "multi",
        options: [
          "הכול בבלגן, הגיע הזמן לעשות סדר",
          "יש לנו יותר מדי חובות והלוואות",
          "רוצים לוודא שהמצב שלנו בסדר",
          "אנחנו לא מנצלים את כל הזכויות שלנו",
          "רוצים ללמוד ולהבין יותר",
          "רוצים לבנות תוכנית לחתונות הילדים",
        ],
        hasOther: true,
        wide: true,
      },
      {
        key: "ownSolution",
        label: "לפני שנתחיל: מה לדעתכם הפתרון, או הצעד הנכון בשבילכם?",
        type: "textarea",
        wide: true,
      },
      {
        key: "success",
        label: "מה תרצו שיהיה לכם בסוף התהליך?",
        hint: "מה ייחשב בעיניכם הצלחה גדולה?",
        type: "textarea",
        required: true,
        wide: true,
      },
      {
        key: "anythingElse",
        label: "יש עוד משהו שתרצו לספר לנו לפני הפגישה?",
        hint: "שאלה, הערה חשובה, או נושא שתרצו שנתמקד בו",
        type: "textarea",
        wide: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Report calculations
// ---------------------------------------------------------------------------

export type FinanceSummary = {
  income: number;
  incomeFromSalaries: number;
  expenses: number;
  balance: number;
  loansMonthly: number;
  loansBalance: number;
  loansCount: number;
  maxRate: number;
  loanRatio: number | null;
  savingsTotal: number;
  mortgageBalance: number;
  mortgageMonthly: number;
  housingCost: number;
  insights: Insight[];
};

export function summarizeFinance(r: QuestionnaireResponses): FinanceSummary {
  const v = r.values;
  const people: (1 | 2)[] = r.borrowers === 2 ? [1, 2] : [1];
  const name = (b: 1 | 2) => v[`b${b}.fullName`] || (b === 1 ? "בן/בת זוג ראשון" : "בן/בת זוג שני");

  const incomeFromSalaries = people.reduce((a, b) => a + toNumber(v[`b${b}.netSalary`]), 0) + toNumber(v.extraIncomeAmount);
  const income = toNumber(v.totalIncome) || incomeFromSalaries;
  const expenses = toNumber(v.totalExpenses);
  const loans = filledRows(r.tables.loans);
  const loansMonthly = loans.reduce((a, row) => a + toNumber(row.monthly), 0);
  const loansBalance = loans.reduce((a, row) => a + toNumber(row.balance), 0);
  const maxRate = loans.reduce((a, row) => Math.max(a, toNumber(row.rate)), 0);
  const savingsTotal = filledRows(r.tables.savings).reduce((a, row) => a + toNumber(row.amount), 0);
  const mortgageBalance = toNumber(v.mortgageBalance);
  const mortgageMonthly = toNumber(v.mortgageMonthly);
  const housingCost = mortgageMonthly + toNumber(v.rent);
  const balance = income - expenses;
  const loanRatio = income > 0 && loansMonthly > 0 ? (loansMonthly / income) * 100 : null;

  const insights: Insight[] = [];
  const kids = toNumber(v.childrenCount);

  if (income > 0 && expenses > 0) {
    if (balance < 0) insights.push({ tone: "attention", text: `ההוצאות גבוהות מההכנסות בכ-${formatMoney(-balance)} בחודש.` });
    else if (balance < income * 0.05) insights.push({ tone: "attention", text: `נשארים רק כ-${formatMoney(balance)} בחודש. אין כמעט מרווח לחיסכון או להוצאות לא צפויות.` });
    else insights.push({ tone: "good", text: `לפי ההערכה, נשארים כ-${formatMoney(balance)} בחודש אחרי ההוצאות.` });
  }
  if (incomeFromSalaries > 0 && toNumber(v.totalIncome) > 0 && Math.abs(incomeFromSalaries - toNumber(v.totalIncome)) > toNumber(v.totalIncome) * 0.15) {
    insights.push({
      tone: "info",
      text: `סך ההכנסות שציינו (${formatMoney(toNumber(v.totalIncome))}) שונה מסכום המשכורות וההכנסות הנוספות (${formatMoney(incomeFromSalaries)}). כדאי לברר מה ההפרש.`,
    });
  }
  if (loanRatio !== null && loanRatio > 30) insights.push({ tone: "attention", text: `החזרי ההלוואות הם ${loanRatio.toFixed(0)}% מההכנסה. זה עומס גבוה.` });
  if (maxRate >= 10) insights.push({ tone: "attention", text: `יש הלוואה בריבית של ${maxRate}%. שווה לבדוק איחוד או מיחזור הלוואות.` });
  if ((v.hasDebts === DEBTS.yes || v.hasDebts === DEBTS.some) && loans.length === 0)
    insights.push({ tone: "info", text: "ציינו שיש חובות, אבל לא פירטו אותם. כדאי לבקש פירוט בפגישה." });
  if (v.bounced === YES) insights.push({ tone: "attention", text: `חזרו צ'קים או הוראות קבע${v.bounced__detail ? ` (${v.bounced__detail})` : ""}.` });
  if (people.some((b) => v[`b${b}.incomeDips`] === YES)) {
    const who = people.filter((b) => v[`b${b}.incomeDips`] === YES).map(name).join(", ");
    insights.push({ tone: "info", text: `יש חודשים שבהם ההכנסה יורדת: ${who}. צריך לתכנן לזה רזרבה.` });
  }
  if (v.hasSavings === NO) insights.push({ tone: "attention", text: "אין חסכונות. כדאי לבנות קרן חירום." });

  if (people.some((b) => v[`b${b}.usCitizenship`] === YES)) {
    if (v.usTaxReport && v.usTaxReport !== YES) insights.push({ tone: "attention", text: "יש אזרחות אמריקאית, אבל לא מוגש דוח שנתי לארצות הברית. כדאי לבדוק את החובה." });
    if (v.usChildBenefit === NO) insights.push({ tone: "info", text: "יש אזרחות אמריקאית ולא מתקבל מענק ילדים מארצות הברית. ייתכן שמגיע להם." });
    if (v.usInformed && v.usInformed !== YES) insights.push({ tone: "info", text: "ייתכן שהבנקים וחברות הביטוח לא מעודכנים באזרחות האמריקאית." });
  }

  if (v.knowsBankFees === NO) insights.push({ tone: "info", text: "לא יודעים כמה עמלות משלמים לבנק. כדאי לבדוק, ולעבור למסלול עמלות מתאים." });
  if (v.cardFees === YES) insights.push({ tone: "info", text: "משלמים דמי כרטיס. בדרך כלל אפשר לבטל אותם בשיחה אחת." });
  if (toNumber(v.creditCards) >= 4) insights.push({ tone: "info", text: `יש ${toNumber(v.creditCards)} כרטיסי אשראי. ריבוי כרטיסים מקשה על המעקב.` });

  if (kids > 0 && v.weddingSaving && v.weddingSaving !== YES) insights.push({ tone: "attention", text: "עדיין לא חוסכים לחתונות הילדים." });
  if (v.weddingSaving === YES) insights.push({ tone: "good", text: `חוסכים לחתונות הילדים${v.weddingMonthly ? ` (${formatMoney(toNumber(v.weddingMonthly))} בחודש)` : ""}.` });

  if (kids > 0 && v.lifeInsurance && v.lifeInsurance !== YES) insights.push({ tone: "attention", text: "יש ילדים, ואין ביטוח חיים (או שלא יודעים)." });
  if (v.duplicates && v.duplicates !== YES) insights.push({ tone: "info", text: "לא נבדקו כפילויות בביטוחים. כאן אפשר לחסוך הרבה." });
  if (people.some((b) => v[`b${b}.pension`] === NO)) {
    const who = people.filter((b) => v[`b${b}.pension`] === NO).map(name).join(", ");
    insights.push({ tone: "attention", text: `לא מפרישים לפנסיה: ${who}.` });
  }
  if (v.pensionTrack === NO) insights.push({ tone: "info", text: "לא יודעים באיזה מסלול נמצאת הפנסיה." });
  if (v.pensionReviewed && v.pensionReviewed !== YES) insights.push({ tone: "info", text: "אף אחד לא עבר לאחרונה על תיק הפנסיה." });
  if (kids > 0 && v.childSavingsDouble && v.childSavingsDouble !== YES)
    insights.push({ tone: "attention", text: "לא מכפילים את ההפקדה ב\"חיסכון לכל ילד\". זה כסף שאפשר להוסיף כמעט בלי להרגיש." });

  const unclaimed = [
    RIGHTS_NOT_USED.includes(v.workGrant) && "מענק עבודה",
    RIGHTS_NOT_USED.includes(v.arnona) && "הנחה בארנונה",
    RIGHTS_NOT_USED.includes(v.daycare) && "הנחה במעון",
    v.rentAssistance === NO && "סיוע בשכר דירה",
  ].filter(Boolean);
  if (unclaimed.length) insights.push({ tone: "good", text: `הזדמנות: עוד לא נבדקו ${unclaimed.join(", ")}.` });

  const pros = splitMulti(v.professionals).filter((p) => p !== NO_PROFESSIONAL);
  if (pros.length) insights.push({ tone: "info", text: `ביקשו עזרה גם מ: ${pros.join(", ").replace("אחר", v.professionals__other || "אחר")}.` });
  if (hasAnswer(v, "situation", "יש לנו יותר מדי חובות והלוואות") && loans.length === 0)
    insights.push({ tone: "info", text: "כתבו שיש יותר מדי חובות, אבל לא פירטו הלוואות." });

  return {
    income,
    incomeFromSalaries,
    expenses,
    balance,
    loansMonthly,
    loansBalance,
    loansCount: loans.length,
    maxRate,
    loanRatio,
    savingsTotal,
    mortgageBalance,
    mortgageMonthly,
    housingCost,
    insights,
  };
}
