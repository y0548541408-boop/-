import { prisma } from "@/lib/prisma";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const family = await prisma.family.findUnique({ where: { onboardingToken: token } });

  if (!family) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-center">
        <p className="text-gray-600">
          הקישור הזה אינו תקין. אם קיבלתם אותו מהיועץ שלכם, בקשו קישור מעודכן.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-4 text-center">
          <h1 className="text-lg font-semibold text-gray-900">
            שאלון היכרות – {family.displayName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            כמה דקות לפני שנפגש, כדי שנכיר את התמונה המלאה מראש.
          </p>
        </div>
        <OnboardingForm token={token} />
      </div>
    </main>
  );
}
