import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ShermanLogo } from "@/components/ShermanLogo";
import MortgageForm from "./MortgageForm";

export const metadata: Metadata = {
  title: "שאלון לפני לקיחת משכנתא | שרמן",
  description: "כל הנתונים לפני לקיחת משכנתא, במקום אחד ובצורה מסודרת",
};

export default async function MortgageQuestionnairePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const questionnaire = await prisma.mortgageQuestionnaire.findUnique({ where: { token } });

  return (
    <main className="min-h-screen bg-sh-cream px-4 pb-10 pt-8 text-sh-ink">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex flex-col items-center text-center">
          <ShermanLogo markSize={52} />
          <p className="mt-3 font-wordmark text-lg text-sh-green">חותמים בראש שקט.</p>
        </header>

        {!questionnaire ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-sh-green">הקישור לא תקין</h1>
            <p className="mt-2 text-lg text-sh-ink/85">ייתכן שהקישור הועתק חלקית. פנו לישראל שרמן ובקשו קישור חדש.</p>
          </div>
        ) : questionnaire.status === "submitted" ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-sh-green">השאלון כבר נשלח. תודה!</h1>
            <p className="mt-2 text-lg text-sh-ink/85">קיבלנו את כל הנתונים. אם משהו השתנה, ספרו לנו בשיחה הבאה.</p>
          </div>
        ) : (
          <MortgageForm token={token} clientName={questionnaire.clientName} />
        )}
      </div>
    </main>
  );
}
