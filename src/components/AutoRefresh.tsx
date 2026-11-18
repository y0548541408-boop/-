"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// While two people work on the same screen (the advisor on a computer, the
// family on a phone), this brings in the other side's changes every few
// seconds. It never refreshes while someone is typing, or while the page is hidden.
export default function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const active = document.activeElement;
      if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
