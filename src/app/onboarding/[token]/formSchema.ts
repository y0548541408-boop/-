// Mirrors Israel's real intake questionnaire (Google Forms, 14 content
// sections) so the digital version asks the same things, just better
// organized. Field keys map 1:1 to what gets stored in
// OnboardingQuestionnaire.responses.

export type FieldConfig =
  | { key: string; label: string; hint?: string; type: "text"; required?: boolean }
  | { key: string; label: string; hint?: string; type: "textarea"; required?: boolean }
  | {
      key: string;
      label: string;
      hint?: string;
      type: "radio";
      options: string[];
      hasOther?: boolean;
      required?: boolean;
    }
  | {
      key: string;
      label: string;
      hint?: string;
      type: "checkbox";
      options: string[];
      hasOther?: boolean;
      required?: boolean;
    };

export type Step = { title: string; chapter: string; fields: FieldConfig[] };

export const CHAPTERS: { title: string; intro: string }[] = [
  { title: "בואו נכיר", intro: "רק כמה פרטים בסיסיים כדי שנתחיל לבנות תמונה מלאה." },
  {
    title: "הכנסות ותקציב",
    intro: "עכשיו בואו נבין מאיפה הכסף מגיע, ולאן הוא הולך.",
  },
  {
    title: "דיור וכספים שוטפים",
    intro: "פרטים על הבית שלכם וההתנהלות הבנקאית היומיומית.",
  },
  {
    title: "חיסכון, ביטוח ופנסיה",
    intro: "בואו נראה מה כבר בנוי לעתיד, ומה אולי פספסנו בדרך.",
  },
  {
    title: "לסיכום",
    intro: "כמעט סיימנו. עוד כמה שאלות שיעזרו לנו להתאים את הפגישה בדיוק לכם.",
  },
];

export const STEPS: Step[] = [
  {
    title: "פרטים כלליים",
    chapter: "בואו נכיר",
    fields: [
      { key: "lastName", label: "שם משפחה", type: "text" },
      { key: "husbandName", label: "שם הבעל", type: "text", required: true },
      { key: "husbandPhone", label: "מספר פלאפון (בעל)", type: "text", required: true },
      { key: "husbandAge", label: "גיל (בעל)", type: "text", required: true },
      { key: "wifeName", label: "שם האשה", type: "text", required: true },
      { key: "wifePhone", label: "פלאפון (אישה)", type: "text", required: true },
      { key: "wifeAge", label: "גיל (אישה)", type: "text", required: true },
      {
        key: "availableContact",
        label: "במה אתם זמינים?",
        type: "checkbox",
        options: ["מייל", "ווצאפ", "פלאפון בעל", "פלאפון אשה"],
      },
      { key: "marriageYears", label: "שנות נישואין", type: "text", required: true },
      {
        key: "childrenCount",
        label: "מספר ילדים (בלי עין הרע)",
        type: "text",
        required: true,
      },
      {
        key: "childrenAgeRange",
        label: "גילאי הילדים (נא לפרט גיל הקטן ביותר והגדול ביותר)",
        type: "text",
        required: true,
      },
      {
        key: "marriedChildren",
        label: "האם יש ילדים נשואים, וכמה?",
        type: "text",
        required: true,
      },
      {
        key: "usCitizenship",
        label: "אזרחות אמריקאית?",
        type: "radio",
        options: ["רק לבעל", "רק לאישה", "גם לבעל וגם לאישה", "אין"],
        hasOther: true,
        required: true,
      },
      {
        key: "usCitizenshipBanksUpdated",
        label: "במידה ויש אזרחות אמריקאית. האם הבנקים / חברות הביטוח מעודכנים?",
        type: "text",
      },
      {
        key: "usAnnualReport",
        label: 'האם אתם מגישים דו"ח שנתי לארצות הברית?',
        type: "text",
      },
      {
        key: "usChildBenefit",
        label: "האם אתם מקבלים מענק ילדים מארצות הברית?",
        type: "text",
      },
      { key: "carDetails", label: "האם יש לכם רכב? אם כן, איזה?", type: "text" },
    ],
  },
  {
    title: "תעסוקה והכנסות",
    chapter: "הכנסות ותקציב",
    fields: [
      {
        key: "husbandOccupation",
        label: "תחום עיסוק הבעל",
        hint: "נא לפרט את כל העיסוקים שיש - כולל / עם או בלי תלוש / הכנסה מהצד",
        type: "textarea",
        required: true,
      },
      { key: "husbandEmploymentType", label: "עצמאי או שכיר?", type: "text", required: true },
      {
        key: "husbandJobScope",
        label: "היקף משרה (בעל)",
        hint: 'מופיע בתלוש בחלק "הפרטים האישיים". אם הבעל אברך או ללא תלוש נא לכתוב 0',
        type: "text",
        required: true,
      },
      { key: "husbandNetSalary", label: "שכר הבעל (נטו)", type: "text", required: true },
      {
        key: "husbandIncomeVariance",
        label: "האם יש ירידה בפדיון העבודה בחודשים מסוימים? (אם כן כמה)",
        type: "text",
      },
      { key: "wifeOccupation", label: "תחום עיסוק אישה", type: "text", required: true },
      {
        key: "wifeEmploymentType",
        label: "שכירה או עצמאית?",
        type: "checkbox",
        options: [
          "עצמאית",
          "שכירה",
          "גם וגם",
          "לא עובדת",
          "מקבלת דמי אבטלה",
          "סטודנטית",
        ],
        hasOther: true,
        required: true,
      },
      {
        key: "wifeJobScope",
        label: "היקף משרה (אישה)",
        hint: "מופיע בתלוש בחלק הפרטים האישיים. אם אין תלוש נא לכתוב 0",
        type: "text",
        required: true,
      },
      { key: "wifeNetSalary", label: "שכר האישה (נטו)", type: "text", required: true },
      {
        key: "additionalIncome",
        label: "הכנסות נוספות (ביטוח לאומי / קצבאות וכו')",
        type: "text",
        required: true,
      },
      {
        key: "wifeIncomeVariance",
        label: "האם יש ירידה בפדיון העבודה בחודשים מסוימים? (אם כן כמה)",
        type: "text",
      },
    ],
  },
  {
    title: "תקציב המשפחה",
    chapter: "הכנסות ותקציב",
    fields: [
      {
        key: "totalMonthlyIncome",
        label: 'הכנסות חודשיות סה"כ (משוער)',
        type: "text",
        required: true,
      },
      {
        key: "totalMonthlyExpenses",
        label: 'הוצאות חודשיות סה"כ (משוער)',
        type: "text",
        required: true,
      },
      {
        key: "hasDebts",
        label: "האם יש חובות?",
        type: "radio",
        options: ["כן", "לא", "קצת"],
        required: true,
      },
      {
        key: "totalDebtAmount",
        label: 'כמה חובות יש לכם בסה"כ?',
        type: "text",
      },
      { key: "totalLoanRepayment", label: "מה גובה ההחזר לכל ההלוואות?", type: "text" },
      {
        key: "loanInterestRates",
        label: "כמה אחוזי ריביות אתם משלמים? (נא לפרט לכל הלוואה בנפרד)",
        type: "text",
      },
      {
        key: "hasSavings",
        label: "האם יש חסכונות?",
        type: "radio",
        options: ["כן", "לא"],
        hasOther: true,
        required: true,
      },
      {
        key: "savingsAmountAndLocation",
        label: "מה סכום החסכונות? והיכן הם נמצאים?",
        hint: 'נא לפרט כל סוג חיסכון שיש! (גמ"חים, קופת גמל / השתלמות, קרן כספית וכו\')',
        type: "textarea",
      },
    ],
  },
  {
    title: "מגורים",
    chapter: "דיור וכספים שוטפים",
    fields: [
      { key: "currentAddress", label: "איפה אתם גרים?", type: "text" },
      {
        key: "ownsApartment",
        label: "האם אתם גרים בדירה בבעלותכם?",
        type: "radio",
        options: ["כן", "לא", "שוכרים ומשכירים"],
        required: true,
      },
      { key: "hasInvestmentProperty", label: "האם יש נכס נוסף להשקעה?", type: "text" },
      {
        key: "investmentPropertyValue",
        label: "במידה ויש לכם נכס נוסף להשקעה, מה השווי המשוער?",
        type: "text",
      },
      {
        key: "rentAssistance",
        label: "במידה ואין דירה בבעלותכם, האם אתם מקבלים סיוע בשכר דירה?",
        type: "radio",
        options: ["כן", "לא", "בדקנו ואיננו זכאים"],
        hasOther: true,
      },
      {
        key: "mechirLamishtaken",
        label: 'במידה ואין דירה בבעלותכם, האם אתם רשומים לתוכנית "מחיר למשתכן"?',
        type: "radio",
        options: ["כן", "לא"],
        hasOther: true,
      },
      { key: "apartmentValue", label: "שווי דירה משוערך", type: "text" },
      { key: "mortgageBalance", label: "יתרת משכנתא", type: "text" },
      { key: "mortgageMonthlyPayment", label: "החזר חודשי של המשכנתא", type: "text" },
      {
        key: "mortgageRefinanceHistory",
        label: "האם ביצעתם מיחזור למשכנתא, ומתי?",
        type: "text",
      },
    ],
  },
  {
    title: "בנקים",
    chapter: "דיור וכספים שוטפים",
    fields: [
      {
        key: "banksAndMainAccount",
        label: "באיזה בנקים יש לכם חשבונות? ואיזה מהם הוא החשבון העיקרי?",
        type: "text",
      },
      {
        key: "knowsMonthlyBankFees",
        label: "האם אתם יודעים כמה עמלות אתם משלמים לבנק בחודש?",
        type: "text",
        required: true,
      },
    ],
  },
  {
    title: "אמצעי תשלום",
    chapter: "דיור וכספים שוטפים",
    fields: [
      {
        key: "paymentMethods",
        label: "באיזה אופן תשלום אתם בדרך כלל משתמשים?",
        type: "radio",
        options: [
          "אשראי",
          "מזומן",
          "צ'קים",
          "דיירקט",
          "בעיקר באשראי אבל גם במזומן",
          "בעיקר במזומן אבל גם באשראי",
          "אין משהו מוגדר",
        ],
        hasOther: true,
        required: true,
      },
      { key: "creditCardsCount", label: "כמה כרטיסי אשראי יש ברשותכם?", type: "text", required: true },
      {
        key: "payCardFees",
        label: "האם אתם משלמים עמלות על הכרטיסים שברשותכם?",
        type: "radio",
        options: ["כן", "לא", "לא יודע"],
        hasOther: true,
        required: true,
      },
      {
        key: "bouncedChecksOrOrders",
        label: "האם יש לכם צ'קים או הוראות קבע שחזרו? ובכמה זמן?",
        type: "text",
      },
    ],
  },
  {
    title: "השתדלות לחתונות הילדים",
    chapter: "חיסכון, ביטוח ופנסיה",
    fields: [
      {
        key: "savingForWeddings",
        label: "האם אתם חוסכים עבור חתונות הילדים?",
        type: "radio",
        options: ["כן", "לא", "עדיין לא", "מעוניינים להתחיל לחסוך"],
        hasOther: true,
        required: true,
      },
      {
        key: "weddingSavingsLocation",
        label: "היכן אתם חוסכים לחתונות הילדים?",
        type: "checkbox",
        options: [
          'גמ"ח המרכזי / אושר בכבוד',
          'גמ"ח רגיל',
          "קרן השתלמות",
          "קופת גמל",
          "חשבון מסחר עצמאי",
        ],
        hasOther: true,
      },
      {
        key: "weddingSavingsAmount",
        label: "מהו הסכום אשר אתם חוסכים לחתונות הילדים?",
        type: "text",
      },
      {
        key: "wantsToStartWeddingSavings",
        label: "במידה ואתם לא חוסכים, האם אתם מעוניינים לחסוך לחתונות הילדים?",
        type: "radio",
        options: ["כן", "לא", "אנחנו חוסכים כבר"],
        hasOther: true,
      },
    ],
  },
  {
    title: "ביטוחים",
    chapter: "חיסכון, ביטוח ופנסיה",
    fields: [
      {
        key: "hasLifeInsurance",
        label: "האם יש לכם ביטוח חיים (מעבר לביטוח חיים עבור המשכנתא)",
        type: "radio",
        options: ["כן", "לא"],
        hasOther: true,
        required: true,
      },
      {
        key: "healthInsuranceType",
        label: "ביטוח בריאות",
        type: "radio",
        options: ["דרך הקופה", "ביטוח פרטי", "גם וגם"],
        hasOther: true,
        required: true,
      },
      {
        key: "checkedInsuranceDuplication",
        label: "האם בדקתם כפילויות בביטוחים?",
        type: "radio",
        options: ["כן", "לא"],
        hasOther: true,
        required: true,
      },
      {
        key: "joinedLamichyatam",
        label: 'האם הצטרפתם לארגון "למחייתם"?',
        type: "radio",
        options: ["כן", "לא", "מעוניינים להצטרף?"],
        hasOther: true,
        required: true,
      },
    ],
  },
  {
    title: "פנסיה",
    chapter: "חיסכון, ביטוח ופנסיה",
    fields: [
      {
        key: "pensionContribution",
        label: "האם אתם מפרישים לפנסיה?",
        type: "radio",
        options: ["כן", "לא", "רק האישה", "רק הבעל", "גם הבעל וגם האישה"],
        hasOther: true,
        required: true,
      },
      {
        key: "knowsPensionTrack",
        label: "האם אתם יודעים באיזה מסלול נמצא הפנסיה שלכם?",
        type: "radio",
        options: ["כן", "לא"],
        hasOther: true,
        required: true,
      },
      {
        key: "pensionFees",
        label: "כמה הדמי ניהול מההפקדה ומהצבירה?",
        type: "text",
        required: true,
      },
      {
        key: "pensionAdvisorReviewedRecently",
        label: "האם יועץ או סוכן עבר או טיפל לכם בתיק הפנסיוני שלכם לאחרונה?",
        type: "radio",
        options: ["כן", "לא", "מעוניין שסוכן יעבור לי על התיק"],
        hasOther: true,
        required: true,
      },
    ],
  },
  {
    title: "מכשירים פיננסים",
    chapter: "חיסכון, ביטוח ופנסיה",
    fields: [
      {
        key: "financialInstruments",
        label: "איזה מכשירים פיננסים יש לכם?",
        type: "checkbox",
        options: [
          "קרן השתלמות",
          "קרן השתלמות למורים",
          "קופת גמל",
          "פוליסת חיסכון",
          "אין לנו אף אחד מהם",
        ],
        hasOther: true,
        required: true,
      },
      {
        key: "lastCheckedTracksAndFees",
        label: "במידה ויש לכם, מתי בפעם האחרונה בדקתם את המסלולים והדמי ניהול?",
        type: "text",
      },
      {
        key: "doublingChildSavingsDeposit",
        label: "האם אתם מכפילים את סכום ההפקדה בחיסכון לכל ילד?",
        type: "radio",
        options: ["כן", "לא"],
        hasOther: true,
        required: true,
      },
      {
        key: "childSavingsCompanyAndTrack",
        label: "באיזה חברה, ובאיזה מסלול נמצא החיסכון לכל ילד?",
        hint: "נא לפרט את של כל הילדים",
        type: "text",
      },
    ],
  },
  {
    title: "מיצוי זכויות",
    chapter: "לסיכום",
    fields: [
      {
        key: "workGrantApplication",
        label: "האם הגשתם בקשה למענק עבודה (מס הכנסה שלילי)",
        type: "radio",
        options: ["כן, וקבלנו", "כן, ואיננו זכאים", "לא הגשנו בקשה", "מה זה?"],
        hasOther: true,
        required: true,
      },
      {
        key: "propertyTaxDiscountApplication",
        label: "האם הגשתם בקשה להנחה בארנונה?",
        type: "radio",
        options: ["כן, וקבלנו", "כן, ואיננו זכאים", "לא הגשנו בקשה", "מה זה?"],
        hasOther: true,
        required: true,
      },
      {
        key: "daycareSubsidyApplication",
        label: "האם הגשתם בקשה לדרגה במעון / משפחתון?",
        type: "radio",
        options: [
          "כן, וקבלנו",
          "כן, ואיננו זכאים",
          "לא הגשנו בקשה",
          "מה זה?",
          "אין לנו ילדים במעון / משפחתון",
        ],
        hasOther: true,
        required: true,
      },
    ],
  },
  {
    title: "בעלי מקצוע",
    chapter: "לסיכום",
    fields: [
      {
        key: "interestedProfessionals",
        label: "האם אתם מעוניינים ביעוץ / עזרה מבעל מקצוע?",
        type: "checkbox",
        options: [
          "יועץ משכנתאות",
          "סוכן ביטוח מקצועי",
          "יועץ פנסיוני",
          'יועץ השקעות (נדל"ן / שוק ההון)',
          "הכוונה תעסוקתית",
          "מיצוי זכויות (מגיע לכם קצבאות? נכות? וכו)",
          "לא צריכים שום בעל מקצוע",
        ],
        hasOther: true,
        required: true,
      },
    ],
  },
  {
    title: "תיאום ציפיות",
    chapter: "לסיכום",
    fields: [
      {
        key: "mainReasonForProcess",
        label: "מהו הגורם המרכזי שבעקבותיו הגעתם לתהליך ליווי?",
        hint: "נא לפרט כמה שיותר!",
        type: "textarea",
        required: true,
      },
      {
        key: "inTwoWords",
        label: "ובשתי מילים...",
        type: "checkbox",
        options: [
          "המצב שלנו בלאגן אחד גדול, הגיע הזמן לעשות סדר!",
          "יש לנו מדי הרבה חובות (הלוואות)",
          "רק רוצים לוודא שהמצב הכלכלי שלנו בסדר",
          "אנחנו לא ממצים מספיק את הזכויות שלנו",
          "רוצים להעשיר את הידע",
          "מעוניינים לבנות תוכנית לנישואי הילדים",
        ],
        hasOther: true,
        required: true,
      },
      {
        key: "preAdviceSolutionThoughts",
        label: "לפני שקיבלתם ייעוץ מקצועי – מה לדעתכם הפתרון או הצעד הנכון עבורכם?",
        type: "textarea",
        required: true,
      },
      {
        key: "expectedOutcome",
        label: "מה אתם מצפים לקבל בסיום התהליך?",
        hint: "מה בעיניכם ייחשב כהצלחה גדולה לאחר סיום התהליך?",
        type: "textarea",
        required: true,
      },
      {
        key: "anythingElseToShare",
        label: "אם יש משהו שתרצו לשתף אותנו לפני הפגישה – מוזמנים לכתוב כאן",
        hint: "יש לכם שאלה? הערה חשובה? תחום מסוים שתרצו שנתמקד בו? כל דבר שיעזור לנו להתאים את המפגש בדיוק לצרכים שלכם.",
        type: "textarea",
      },
    ],
  },
];
