// The short version of a submitted questionnaire, for the advisor's email.
// The full answers stay on the report page; this shows the numbers and the
// main points, so the advisor can see the client's situation from the inbox.

import { formatMoney, type Insight, type QuestionnaireResponses } from "@/lib/questionnaire/core";
import { summarizeFinance } from "@/lib/financeQuestionnaire";
import { summarize } from "@/lib/mortgageQuestionnaire";

export type Digest = {
  contacts: { label: string; value: string }[];
  figures: { label: string; value: string }[];
  insights: string[];
  notes: { label: string; text: string }[];
};

const NOTE_MAX = 400;

function clip(text: string): string {
  return text.length > NOTE_MAX ? `${text.slice(0, NOTE_MAX)}…` : text;
}

function onlyFilled<T extends { value: string }>(rows: T[]): T[] {
  return rows.filter((r) => r.value && r.value !== "₪0");
}

function insightTexts(insights: Insight[]): string[] {
  // Warnings first, then the rest, at most six lines.
  const order: Record<Insight["tone"], number> = { attention: 0, info: 1, good: 2 };
  return [...insights]
    .sort((a, b) => order[a.tone] - order[b.tone])
    .slice(0, 6)
    .map((i) => i.text);
}

export function buildDigest(kind: string, r: QuestionnaireResponses): Digest {
  const v = r.values;
  const people = r.borrowers === 2 ? [1, 2] : [1];

  const contacts = onlyFilled([
    ...people.map((b) => ({ label: r.borrowers === 2 ? `שם ${b === 1 ? "ראשון" : "שני"}` : "שם", value: v[`b${b}.fullName`] ?? "" })),
    ...people.map((b) => ({ label: "טלפון", value: v[`b${b}.phone`] ?? "" })),
    { label: "מייל", value: v.email ?? "" },
  ]);

  if (kind === "finance") {
    const s = summarizeFinance(r);
    return {
      contacts,
      figures: onlyFilled([
        { label: "הכנסה בחודש", value: formatMoney(s.income) },
        { label: "הוצאה בחודש", value: formatMoney(s.expenses) },
        { label: "נשאר בחודש", value: formatMoney(s.balance) },
        { label: "החזרי הלוואות בחודש", value: formatMoney(s.loansMonthly) },
        { label: "יתרת הלוואות", value: formatMoney(s.loansBalance) },
        { label: "חסכונות", value: formatMoney(s.savingsTotal) },
      ]),
      insights: insightTexts(s.insights),
      notes: [
        { label: "מה הביא אתכם לתהליך", text: v.mainReason ?? "" },
        { label: "מה תרצו שיהיה בסוף", text: v.success ?? "" },
        { label: "מה חשוב לכם לדעת לפני הפגישה", text: v.anythingElse ?? "" },
      ]
        .filter((n) => n.text.trim())
        .map((n) => ({ label: n.label, text: clip(n.text) })),
    };
  }

  const s = summarize(r);
  return {
    contacts,
    figures: onlyFilled([
      { label: "הכנסה בחודש", value: formatMoney(s.totalIncome) },
      { label: "הוצאה בחודש", value: formatMoney(s.expenses) },
      { label: "פנוי בחודש", value: formatMoney(s.disposable) },
      { label: "שווי הדירה", value: formatMoney(s.propertyValue) },
      { label: "סכום המשכנתא", value: formatMoney(s.mortgageNeeded) },
      { label: "אחוז מימון", value: s.ltv === null ? "" : `${s.ltv.toFixed(1)}% (מותר עד ${s.ltvLimit}%)` },
    ]),
    insights: insightTexts(s.insights),
    notes: [],
  };
}
