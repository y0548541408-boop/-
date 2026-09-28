"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp } from "./actions";
import { Logo, LogoMark } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
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
          <Logo light size={19} markSize={30} />
          <div className="flex flex-col gap-3">
            <p className="font-wordmark text-2xl leading-snug text-white">
              ליווי אישי, תקציב אחד
              <br />
              צעד אחר צעד.
            </p>
            <p className="text-sm leading-relaxed text-white/70">
              כל פגישה, כל משימה וכל שקל — במקום אחד ברור, יחד איתכם.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="h-1 w-6 rounded-full bg-brand-terracotta" />
            <div className="h-1 w-1 rounded-full bg-white/30" />
            <div className="h-1 w-1 rounded-full bg-white/30" />
          </div>
        </div>

        <div className="flex w-full flex-col justify-center gap-6 bg-white p-8 sm:w-7/12 sm:p-10">
          <div className="flex items-center gap-2 sm:hidden">
            <LogoMark size={26} />
            <span className="font-wordmark text-lg font-bold text-brand-teal">כלכלת המשפחה</span>
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
              <p className="text-center text-xs text-gray-400">אין קוד קבוע — בטוח יותר, ובלי סיסמה לזכור.</p>
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
                  placeholder="123456"
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
