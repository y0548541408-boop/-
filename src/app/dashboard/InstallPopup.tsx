"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "install-popup-seen";

// The browser's own "install" event. Only Android Chrome sends it.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Shown once, right after the first entry, on an Android phone that has not
// installed the app yet. Dismissing it (or installing) remembers the choice
// on this device, so it never comes back by itself.
export default function InstallPopup() {
  const [open, setOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return;
      const ua = navigator.userAgent;
      const android = /android/i.test(ua);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!android || standalone) return;

      const onPrompt = (e: Event) => {
        e.preventDefault();
        setInstallEvent(e as InstallEvent);
      };
      window.addEventListener("beforeinstallprompt", onPrompt);
      // Opening the popup is part of the state read after mount, not a render input.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
      return () => window.removeEventListener("beforeinstallprompt", onPrompt);
    } catch {
      // storage or matchMedia unavailable: the small install hint still shows.
    }
  }, []);

  function remember() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }

  function close() {
    remember();
    setOpen(false);
  }

  async function install() {
    if (!installEvent) {
      setShowSteps(true);
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") remember();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ru-ink/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-popup-title"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <p className="font-display text-2xl text-ru-blue" id="install-popup-title">
          להוריד את התקציב לטלפון
        </p>
        <p className="mt-2 text-base leading-relaxed text-ru-ink">
          כך תמיד תפתחו אותו במסך הבית, כמו אפליקציה רגילה, בלי לחפש את הכתובת.
        </p>

        {!showSteps ? (
          <button
            type="button"
            onClick={install}
            className="mt-5 flex min-h-14 w-full items-center justify-center rounded-2xl bg-brand-mand text-lg font-bold text-white shadow-[0_6px_18px_rgba(255,106,43,0.35)]"
          >
            הורדה למסך הבית
          </button>
        ) : (
          <div className="mt-5 space-y-3 rounded-2xl bg-ru-bg p-4 text-base leading-relaxed">
            <p className="font-bold">בדפדפן Chrome:</p>
            <ol className="list-decimal space-y-2 ps-5">
              <li>לוחצים על שלוש הנקודות למעלה, בפינה.</li>
              <li>בוחרים &quot;התקנת אפליקציה&quot; או &quot;הוספה למסך הבית&quot;.</li>
              <li>מאשרים. האייקון יופיע במסך הבית.</li>
            </ol>
          </div>
        )}

        <button
          type="button"
          onClick={close}
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl text-base font-bold text-ru-muted"
        >
          לא עכשיו
        </button>
      </div>
    </div>
  );
}
