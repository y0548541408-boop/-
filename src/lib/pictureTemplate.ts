// The starting lines of a family's financial picture (תמונת מצב), taken from
// Israel's own workbook: a monthly picture and an annual picture, each with
// income and expenses. Names only: every amount starts empty.

export type PicturePeriod = "monthly" | "annual";
export type PictureKind = "income" | "expense";

export type TemplateLine = {
  period: PicturePeriod;
  kind: PictureKind;
  groupName: string;
  subGroup: string;
  name: string;
};

// Group names are used by the screens and by the totals, so they live here.
export const G = {
  // monthly income
  husband: "בעל",
  wife: "אשה",
  benefits: "קצבאות",
  otherIncome: "מקורות אחרים",
  // monthly expenses
  fixed: "קבוע",
  variable: "משתנות",
  current: "צריכה שוטפת",
  tithes: "מעשרות וצדקה",
  debts: "החזרי חובות חודשיים",
  // annual
  taxRefunds: "החזרי מס",
  irregular: "הכנסות שאינן קבועות",
  productivityLoss: "ירידת פריון עבודה",
  annualFixed: "קבוע שנתי",
  annualCurrent: "הוצאות שוטפות שנתיות",
  yearCycle: "מעגל השנה",
} as const;

// Months with less income: these lines are taken OFF the annual income.
export const DEDUCTION_GROUPS: string[] = [G.productivityLoss];

export const MONTHLY_EXPENSE_GROUPS = [G.fixed, G.variable, G.current, G.tithes, G.debts];
export const MONTHLY_INCOME_GROUPS = [G.husband, G.wife, G.benefits, G.otherIncome];
export const ANNUAL_INCOME_GROUPS = [
  G.husband,
  G.wife,
  G.taxRefunds,
  G.otherIncome,
  G.irregular,
  G.productivityLoss,
];

export const GROUP_HELP: Record<string, string> = {
  [G.fixed]: "מה שמשלמים כל חודש, בערך באותו סכום.",
  [G.variable]: "חשבונות שמשתנים מחודש לחודש.",
  [G.current]: "הוצאות היומיום: אוכל, דלק, פנאי ועוד.",
  [G.tithes]: "מעשרות, צדקה והתחייבויות.",
  [G.debts]: "החזרים חודשיים של הלוואות ותשלומים. בהערות כותבים כמה תשלומים נשארו.",
  [G.productivityLoss]: "חודשים שבהם נכנס פחות כסף. כותבים כמה פחות, והסכום יורד מההכנסה השנתית.",
  [G.irregular]: "הכנסות שלא קבועות, כמו בונוסים או הכנסה חד-פעמית.",
};

// What each starred line in the workbook includes.
export const LINE_HINTS: Record<string, string> = {
  "ביטוחים": "נכס, חיים, תכולת דירה, משכנתא, רפואי, רכב חובה ומקיף",
  "מנויים": "עיתון, בריכה, כושר, מקווה, פנגו",
  "הו\"ק שונות": "ליסינג רכב, מיני בר, כרטיסי הגרלה, לוטו",
  "בריאות": "ויטמינים, תרופות, רופאים, רפואה משלימה",
  "שונות": "ביביסיטר, סיגריות, טמבור, לוטו, ניקוי יבש, ספרים, דמי כיס לילדים, מכשירי כתיבה",
};

function lines(
  period: PicturePeriod,
  kind: PictureKind,
  groupName: string,
  names: string[],
  subGroup = ""
): TemplateLine[] {
  return names.map((name) => ({ period, kind, groupName, subGroup, name }));
}

// Order of the annual cycle, as in the workbook.
export const YEAR_CYCLE_MONTHS = ["תשרי", "כסלו", "שבט", "אדר", "ניסן", "אייר", "סיון", "חופשת הקיץ"];

const CYCLE: Record<string, string[]> = {
  "תשרי": [
    "מקומות בבית הכנסת",
    "סעודות ראש השנה וערב יום כיפור",
    "כפרות",
    "ביגוד",
    "ארבעת המינים",
    "הוצאות סוכה",
    "מזון לחג כללי",
    "בשר ודגים",
    "נסיעות חול המועד",
    "מתנות לאשה ולילדים",
  ],
  "כסלו": ["נסיעות", "מסיבות", "דמי חנוכה"],
  "שבט": ["פירות ט\"ו בשבט"],
  "אדר": [
    "תחפושות",
    "מתנות לגננות, למלמדים ולמורות",
    "משלוחי מנות",
    "מחצית השקל",
    "מתנות לאביונים",
    "סעודה ואירוח",
  ],
  "ניסן": [
    "צביעה וסיוד",
    "ניקיון ועוזרת",
    "אוכל לפני פסח",
    "קמחא דפסחא ומכירת חמץ",
    "ביגוד",
    "מצות",
    "ביצים ויין",
    "בשר ודגים",
    "מזון לחג (כללי)",
    "מתנות לאשה ולילדים",
  ],
  "אייר": ["ל\"ג בעומר"],
  "סיון": ["חג השבועות"],
  "חופשת הקיץ": [
    "תוספות לגנרטור",
    "ציוד לבית הספר",
    "מחנות קיץ",
    "קייטנות",
    "חופשה שנתית",
    "נסיעות, רכב וטיסות",
    "דלק",
    "לינה",
    "אוכל",
    "אתרים ואטרקציות",
    "ציוד ושונות",
  ],
};

export const PICTURE_TEMPLATE: TemplateLine[] = [
  // ---- monthly income ----
  ...lines("monthly", "income", G.husband, ["משכורת (עיסוק)", "כולל", "עזרה מההורים"]),
  ...lines("monthly", "income", G.wife, ["משכורת (עיסוק)"]),
  ...lines("monthly", "income", G.benefits, ["ביטוח לאומי, קצבת ילדים", "ביטוח לאומי, קצבה אחרת"]),
  ...lines("monthly", "income", G.otherIncome, [
    "הכנסות מנכס אחר",
    "הבטחת / השלמת הכנסה",
    "סיוע בשכר דירה",
    "תמיכות ומלגות",
    "הורים",
  ]),

  // ---- monthly expenses ----
  ...lines("monthly", "expense", G.fixed, [
    "שכר דירה / משכנתא",
    "ארנונה",
    "ועד בית",
    "ביטוח לאומי",
    "ביטוחים",
    "קופת חולים",
    "שכר לימוד, בנים",
    "שכר לימוד, בנות",
    "מטפלת / מעונות",
    "שיעורים פרטיים / חוגים",
    "רב קו",
    "לימודי הורים",
    "נסיעות קבועות, הורים",
    "מנויים",
    "הו\"ק שונות",
    "עוזרת בית",
    "גנרטור שבת",
    "משחקי אינטרנט",
  ]),
  ...lines("monthly", "expense", G.variable, [
    "תקשורת נייח",
    "תקשורת נייד",
    "תקשורת חו\"ל",
    "תקשורת מחשבים",
    "גז",
    "מים",
    "חשמל",
    "עמלות וריבית, בנק ואשראי",
  ]),
  ...lines("monthly", "expense", G.current, [
    "קניות מרוכזות, סופר",
    "מכולת",
    "פירות וירקות",
    "דגים ובשר",
    "אוכל בחוץ",
    "בריאות",
    "נסיעות שונות / שבתות",
    "דלק לרכב",
    "רכישות קטנות",
    "ביגוד והנעלה (חוץ מהשנתי)",
    "מזומן ללא מעקב",
    "פנאי",
    "שונות",
    "תספורת",
    "טיפוח",
    "כביש 6 ומנהרות",
    "תיקונים בבית",
    "הוצאות רכב",
    "טיפול רגשי",
  ]),
  ...lines("monthly", "expense", G.tithes, ["מעשר / חומש", "צדקה / הו\"ק לצדקה", "ערבים"]),
  ...lines("monthly", "expense", G.debts, [
    "בנק",
    "גמ\"ח / הלוואה מהמשפחה",
    "תשלומים בכרטיס אשראי",
    "שיקים דחויים",
  ]),

  // ---- annual income ----
  ...lines("annual", "income", G.husband, ["משכורת 13 / הבראה", "תוספת חוגים"]),
  ...lines("annual", "income", G.wife, ["משכורת 13 / הבראה"]),
  ...lines("annual", "income", G.taxRefunds, ["החזרי מס (ישראל / ארה\"ב)", "מס הכנסה שלילי"]),
  ...lines("annual", "income", G.otherIncome, [
    "יד אברהם",
    "ישיבות בין הזמנים",
    "קרנות, תמיכות וחגים",
    "ערך סלי מזון",
    "הורים",
    "ביטוח לאומי, מענקים",
  ]),
  ...lines("annual", "income", G.productivityLoss, ["חודש ניסן", "חודש אב", "חודש תשרי"]),

  // ---- annual expenses ----
  ...lines("annual", "expense", G.annualFixed, [
    "ביטוח דירה",
    "ביטוח רכב",
    "טסט ורישיונות",
    "חוגים",
    "דמי שכלול",
    "ארנונה",
  ]),
  ...lines("annual", "expense", G.annualCurrent, [
    "נדרים ונדבות בבית הכנסת",
    "מעשרות וחומש משנתי",
    "הוצאות רפואיות",
    "טיפולי שיניים",
    "תיקונים וטיפולי רכב",
    "ביגוד חורף, הורים",
    "ביגוד חורף, ילדים",
    "ביגוד קיץ, הורים",
    "ביגוד קיץ, ילדים",
    "הנעלה, הורים",
    "הנעלה, ילדים",
    "משקפיים ועדשות",
    "תיקוני אינסטלציה וחשמל",
    "תיקוני בגדים ונעליים",
    "רכישת מוצרים לבית",
    "מתנות לבני הבית",
    "אירועים, ימי הולדת ומתנות",
    "נסיעות שאינן חודשיות",
    "טיולים והוצאות בית ספר",
    "מתנות לגננות, למורות ולמלמדים",
    "ניקוי יבש",
    "אירוח",
    "פאה, איפור וקוסמטיקה",
    "בריכה ואטרקציות",
    "מנויים שנתיים",
  ]),
  ...YEAR_CYCLE_MONTHS.flatMap((month) =>
    lines("annual", "expense", G.yearCycle, CYCLE[month], month)
  ),
];

// ---------------------------------------------------------------------------
// Which budget category a picture line feeds, when the picture becomes the plan.
// ---------------------------------------------------------------------------

type LineLike = {
  period: PicturePeriod;
  kind: PictureKind;
  groupName: string;
  name: string;
};

const has = (name: string, words: string[]) => words.some((w) => name.includes(w));

export function expenseCategoryName(line: LineLike): string {
  if (has(line.name, ["מעשר", "חומש"])) return "מעשרות";
  if (line.period === "annual") return "חיסכון לשנתי";
  if (line.groupName === G.debts) return "החזרי חובות";
  if (line.groupName === G.tithes) return "מעשרות";
  if (line.groupName === G.fixed || line.groupName === G.variable) return "הוצאות קבועות";

  // monthly current spending
  if (has(line.name, ["אוכל בחוץ"])) return "אוכל בחוץ";
  if (has(line.name, ["סופר", "מכולת", "פירות", "דגים"])) return "אוכל";
  if (has(line.name, ["דלק", "רב קו", "כביש 6", "נסיעות", "הוצאות רכב"])) return "דלק רכב קו";
  if (has(line.name, ["ביגוד", "הנעלה"])) return "ביגוד והנעלה";
  if (has(line.name, ["פנאי"])) return "פנאי";
  if (has(line.name, ["רכישות"])) return "רכישות קטנות";
  return "שונות (הוצאות)";
}

export function incomeCategoryName(line: LineLike): string {
  if (line.period === "annual") return "שונות (הכנסות)";
  if (line.groupName === G.husband) {
    if (has(line.name, ["כולל"])) return "כולל";
    if (has(line.name, ["הורים"])) return "הורים";
    return "משכורת בעל";
  }
  if (line.groupName === G.wife) return "משכורת אשה";
  if (line.groupName === G.benefits) return "קצבת ילדים";
  if (has(line.name, ["הורים"])) return "הורים";
  return "שונות (הכנסות)";
}
