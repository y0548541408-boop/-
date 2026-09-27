"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp } from "./actions";

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
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">
          כניסה לאזור האישי
        </h1>
        <p className="mb-6 text-sm text-gray-500">
          {step === "email"
            ? "הזינו את כתובת המייל שלכם ונשלח קוד כניסה חד פעמי."
            : `שלחנו קוד כניסה ל-${email}.`}
        </p>

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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                placeholder="name@example.com"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-widest focus:border-gray-500 focus:outline-none"
                placeholder="123456"
                maxLength={10}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
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
    </main>
  );
}
