"use client";

import { useState } from "react";

function whatsappPhone(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");
  return digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
}

export default function ShareLink({ url, clientName, phone }: { url: string; clientName: string; phone: string | null }) {
  const [copied, setCopied] = useState(false);
  const firstName = clientName.split(" ")[0];
  const message = `שלום ${firstName}, לפני שנתחיל בתהליך המשכנתא, אשמח שתמלאו את השאלון הזה. הוא מרכז את כל הנתונים שצריך, במקום אחד ובצורה מסודרת. אפשר לעצור באמצע ולהמשיך אחר כך:\n${url}`;
  const wa = `https://wa.me/${whatsappPhone(phone)}?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("אפשר להעתיק את הקישור מכאן:", url);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copy}
        className="rounded-lg border border-sh-green/25 bg-white px-3 py-1.5 text-sm font-medium text-sh-green hover:bg-sh-mint/50"
      >
        {copied ? "הועתק ✓" : "העתקת קישור"}
      </button>
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg bg-sh-green px-3 py-1.5 text-sm font-medium text-white hover:bg-sh-green-dark"
      >
        שליחה בוואטסאפ
      </a>
    </div>
  );
}
