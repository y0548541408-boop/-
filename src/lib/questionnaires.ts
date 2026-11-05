// Registry of the client questionnaires. Each link the advisor creates has a
// kind; everything else (form, storage, report) is shared.

import { SECTIONS as MORTGAGE_SECTIONS } from "./mortgageQuestionnaire";
import { FINANCE_SECTIONS } from "./financeQuestionnaire";
import type { Section } from "./questionnaire/core";

export const KINDS = ["mortgage", "finance"] as const;
export type Kind = (typeof KINDS)[number];

export type QuestionnaireDef = {
  kind: Kind;
  title: string;
  /** Short name for lists and badges. */
  shortTitle: string;
  welcome: string;
  chips: string[];
  countQuestion: string;
  countHint: string;
  countOptions: [string, string];
  personLabels: [string, string];
  nameLabel: [string, string];
  doneText: string;
  whatsapp: (firstName: string, url: string) => string;
  sections: Section[];
};

export const QUESTIONNAIRES: Record<Kind, QuestionnaireDef> = {
  mortgage: {
    kind: "mortgage",
    title: "שאלון לפני לקיחת משכנתא",
    shortTitle: "משכנתא",
    welcome: "כדי לבנות לכם משכנתא שמתאימה בדיוק, צריך את כל הנתונים במקום אחד ובצורה מסודרת. השאלון עובר על הכול, שלב אחרי שלב.",
    chips: ["8 שלבים", "אפשר לעצור ולהמשיך אחר כך", "רק שדות עם כוכבית הם חובה"],
    countQuestion: "כמה לווים יהיו במשכנתא?",
    countHint: "בדרך כלל בני זוג לווים יחד.",
    countOptions: ["לווה אחד", "שני לווים"],
    personLabels: ["לווה ראשון", "לווה שני"],
    nameLabel: ["השם המלא שלכם", "השמות המלאים שלכם"],
    doneText: "השאלון התקבל. ישראל יעבור על כל הנתונים ויחזור אליכם כדי להמשיך יחד בתהליך.",
    whatsapp: (firstName, url) =>
      `שלום ${firstName}, לפני שנתחיל בתהליך המשכנתא, אשמח שתמלאו את השאלון הזה. הוא מרכז את כל הנתונים שצריך, במקום אחד ובצורה מסודרת. אפשר לעצור באמצע ולהמשיך אחר כך:\n${url}`,
    sections: MORTGAGE_SECTIONS,
  },
  finance: {
    kind: "finance",
    title: "שאלון לפני ליווי כלכלי",
    shortTitle: "ליווי כלכלי",
    welcome: "כדי שנוכל לעזור לכם באמת, צריך לראות את התמונה הכלכלית המלאה: הכנסות, הוצאות, חסכונות, ביטוחים וזכויות. השאלון עובר על הכול, שלב אחרי שלב.",
    chips: ["10 שלבים", "אפשר לעצור ולהמשיך אחר כך", "רק שדות עם כוכבית הם חובה"],
    countQuestion: "מי משתתף בתהליך?",
    countHint: "אם אתם זוג, כדאי למלא יחד.",
    countOptions: ["רק אני", "שנינו, בני הזוג"],
    personLabels: ["בן/בת זוג ראשון", "בן/בת זוג שני"],
    nameLabel: ["השם המלא שלכם", "השמות המלאים שלכם"],
    doneText: "השאלון התקבל. ישראל יעבור על כל הנתונים לפני הפגישה, כדי שנוכל להתחיל לעבוד יחד מהרגע הראשון.",
    whatsapp: (firstName, url) =>
      `שלום ${firstName}, לקראת תחילת הליווי הכלכלי, אשמח שתמלאו את השאלון הזה. הוא עוזר לנו לראות את כל התמונה הכלכלית לפני הפגישה. אפשר לעצור באמצע ולהמשיך אחר כך:\n${url}`,
    sections: FINANCE_SECTIONS,
  },
};

export function isKind(value: unknown): value is Kind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}

export function getQuestionnaire(kind: string | null | undefined): QuestionnaireDef {
  return isKind(kind) ? QUESTIONNAIRES[kind] : QUESTIONNAIRES.mortgage;
}
