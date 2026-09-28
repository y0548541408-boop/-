"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Supabase's hosted verify endpoint redirects here with the session
// tokens in the URL *fragment* (#access_token=...), which never reaches
// the server - only client-side JS can read it. This page picks it up,
// establishes the session (writing it to cookies via the ssr browser
// client), and hands off to the normal dashboard.
export default function AuthConfirmPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const hashError = params.get("error_description");

    if (hashError) {
      setError("הקישור פג תוקף או שכבר נעשה בו שימוש. אפשר להיכנס מחדש עם קוד למייל.");
      return;
    }

    if (!accessToken || !refreshToken) {
      setError("קישור לא תקין. אפשר להיכנס מחדש עם קוד למייל.");
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError("לא הצלחנו לאמת את הקישור. אפשר להיכנס מחדש עם קוד למייל.");
          return;
        }
        router.replace("/dashboard");
      });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-cream px-4 text-center">
      {error ? (
        <div>
          <p className="text-gray-700">{error}</p>
          <a href="/login" className="mt-3 inline-block text-sm text-brand-teal underline">
            כניסה
          </a>
        </div>
      ) : (
        <p className="text-gray-500">מתחברים...</p>
      )}
    </main>
  );
}
