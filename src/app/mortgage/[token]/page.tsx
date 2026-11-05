import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ShermanLogo } from "@/components/ShermanLogo";
import MortgageForm from "./MortgageForm";

export const metadata: Metadata = {
  title: "שאלון לפני ייעוץ משכנתא | שרמן",
  description: "שאלון קצר לפני פגישת ייעוץ המשכנתא",
};

export default async function MortgageQuestionnairePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const questionnaire = await prisma.mortgageQuestionnaire.findUnique({ where: { token } });

  return (
    <main className="min-h-screen bg-sh-cream px-4 pb-16 pt-8 text-sh-ink">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 flex flex-col items-center text-center">
          <ShermanLogo markSize={50} />
          <p className="mt-3 font-wordmark text-base text-sh-green/80">חותמים בראש שקט.</p>
        </header>

        {!questionnaire ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="text-sh-ink/70">הקישור הזה אינו תקין. אם קיבלתם אותו מהיועץ, בקשו קישור מעודכן.</p>
          </div>
        ) : questionnaire.status === "submitted" ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-sh-green">השאלון כבר נשלח, תודה!</h1>
            <p className="mt-2 text-sm text-sh-ink/70">
              קיבלנו את כל הפרטים. אם משהו השתנה, פשוט ספרו לנו בפגישה.
            </p>
          </div>
        ) : (
          <MortgageForm token={token} clientName={questionnaire.clientName} />
        )}
      </div>
    </main>
  );
}
