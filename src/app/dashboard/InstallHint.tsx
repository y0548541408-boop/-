"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "install-hint-dismissed";

export default function InstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!standalone && localStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    } catch {
      // storage unavailable: just don't show the hint
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div className="mt-3 rounded-xl border border-brand-terracotta/30 bg-white p-3 text-xs leading-relaxed text-gray-600 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p>
          <span className="font-semibold text-brand-teal">התקציב על מסך הבית.</span> באנדרואיד:
          תפריט הדפדפן ← &quot;התקנת אפליקציה&quot;. באייפון: כפתור השיתוף ← &quot;הוסף למסך
          הבית&quot;. מאותו רגע זה נפתח כמו אפליקציה, בלי להקליד כתובת.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-gray-400"
          aria-label="סגירה"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
