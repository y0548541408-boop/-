import { STEPS } from "@/app/onboarding/[token]/formSchema";

// Read-only view of the intake questionnaire the family filled in on their own phone.
// Answers are grouped by the same sections the family saw.
export default function OnboardingAnswers({
  responses,
  submittedAt,
}: {
  responses: Record<string, unknown>;
  submittedAt: string;
}) {
  const contactName = typeof responses.contactName === "string" ? responses.contactName : null;
  const contactPhone = typeof responses.contactPhone === "string" ? responses.contactPhone : null;

  function display(value: unknown): string | null {
    if (Array.isArray(value)) {
      const items = value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
      return items.length ? items.join(", ") : null;
    }
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    return null;
  }

  const sections = STEPS.map((step) => ({
    title: step.title,
    rows: step.fields
      .map((field) => ({ label: field.label, value: display(responses[field.key]) }))
      .filter((row): row is { label: string; value: string } => row.value !== null),
  })).filter((section) => section.rows.length > 0);

  return (
    <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
      <h2 className="text-sm font-semibold text-brand-teal">תשובות שאלון הקליטה</h2>
      <p className="mt-0.5 text-xs text-gray-500">מולא בתאריך {submittedAt}. לקריאה בלבד.</p>

      {(contactName || contactPhone) && (
        <p className="mt-3 rounded-lg bg-brand-cream p-3 text-sm text-gray-800">
          איש קשר: {contactName ?? "לא צוין"}
          {contactPhone ? ` · ${contactPhone}` : ""}
        </p>
      )}

      <div className="mt-3 space-y-2">
        {sections.map((section) => (
          <details key={section.title} className="rounded-xl bg-gray-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-gray-800">
              {section.title} <span className="text-xs text-gray-400">({section.rows.length})</span>
            </summary>
            <dl className="mt-2 space-y-2">
              {section.rows.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs text-gray-500">{row.label}</dt>
                  <dd className="whitespace-pre-line break-words text-sm text-gray-800">{row.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        ))}
      </div>
    </div>
  );
}
