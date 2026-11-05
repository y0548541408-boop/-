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
  const message = `שלום ${firstName}, לקראת הפגישה שלנו הכנתי שאלון קצר (כ-10 דקות). ככה נגיע לפגישה מוכנים ונוכל להתמקד במה שחשוב: ${url}`;
  const wa = `https://wa.me/${whatsappPhone(phone)}?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("העתיקו את הקישור:", url);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copy}
        className="rounded-lg border border-sh-green/25 bg-white px-3 py-1.5 text-xs font-medium text-sh-green hover:bg-sh-mint/50"
      >
        {copied ? "הועתק ✓" : "העתקת קישור"}
      </button>
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg bg-sh-green px-3 py-1.5 text-xs font-medium text-white hover:bg-sh-green-dark"
      >
        שליחה בוואטסאפ
      </a>
    </div>
  );
}
