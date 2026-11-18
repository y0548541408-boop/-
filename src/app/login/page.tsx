"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestOtp, verifyOtp } from "./actions";
import { LogoMark } from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const linkProblem = useSearchParams().get("link");
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(
    linkProblem === "invalid"
      ? "הקישור הזה כבר לא תקף. אפשר להיכנס עם קוד למייל, או לבקש מישראל קישור חדש."
      : linkProblem === "error"
        ? "משהו השתבש בכניסה בקישור. אפשר להיכנס עם קוד למייל."
        : null
  );
  const [isPending, startTransition] = useTransition();

  function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestOtp(email);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStep("code");
    });
  }

  function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyOtp(email, code);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-4 py-8">
      <div className="flex w-full max-w-3xl overflow-hidden rounded-3xl shadow-xl shadow-brand-teal/10">
        <div className="hidden w-5/12 flex-col justify-between bg-brand-teal p-10 sm:flex">
          <LogoMark size={64} color="#FFFFFF" />
          <div className="flex flex-col gap-4">
            <p className="font-wordmark text-3xl leading-snug text-white">שרמן משכנתאות וכלכלת המשפחה</p>
            <div className="h-1 w-12 rounded-full bg-brand-mand" />
            <p className="text-lg text-white/85">ליווי אישי לשליטה כלכלית</p>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center gap-6 bg-white p-8 sm:w-7/12 sm:p-10">
          <div className="sm:hidden">
            <div className="flex items-center gap-2">
              <LogoMark size={40} />
              <span className="font-wordmark text-xl leading-tight text-brand-teal">שרמן משכנתאות וכלכלת המשפחה</span>
            </div>
            <p className="mt-2 text-base text-gray-600">ליווי אישי לשליטה כלכלית</p>
          </div>

          <div>
            <h1 className="mb-1 text-xl font-semibold text-gray-900">כניסה לאזור האישי</h1>
            <p className="text-sm text-gray-500">
              {step === "email"
                ? "הזינו את כתובת המייל שלכם ונשלח קוד כניסה חד פעמי."
                : `שלחנו קוד כניסה ל-${email}.`}
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                  כתובת מייל
                </label>
                <input
                  id="email"
                  type="email"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-right focus:border-brand-teal focus:outline-none"
                  placeholder="name@example.com"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-brand-teal px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-teal-dark disabled:opacity-50"
              >
                {isPending ? "שולח..." : "שלח קוד כניסה"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label htmlFor="code" className="mb-1 block text-sm font-medium text-gray-700">
                  קוד כניסה
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-center text-lg tracking-widest focus:border-brand-teal focus:outline-none"
                  placeholder="12345678"
                  maxLength={10}
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-brand-teal px-3 py-2.5 text-sm font-semibold text-white hover:bg-brand-teal-dark disabled:opacity-50"
              >
                {isPending ? "מאמת..." : "כניסה"}
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-center text-xs text-gray-500 hover:underline"
              >
                שליחת קוד לכתובת מייל אחרת
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
