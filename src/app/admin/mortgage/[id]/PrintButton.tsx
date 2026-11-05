"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-xl border border-sh-green/25 bg-white px-4 py-2 text-sm font-medium text-sh-green hover:bg-sh-mint/50"
    >
      הדפסה / שמירה כ-PDF
    </button>
  );
}
