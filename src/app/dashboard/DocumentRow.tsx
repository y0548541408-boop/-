"use client";

import { useTransition } from "react";
import { getMyDocumentUrl } from "./actions";

export default function DocumentRow({
  storagePath,
  filename,
  tag,
  date,
}: {
  storagePath: string;
  filename: string;
  tag: string;
  date: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    startTransition(async () => {
      const url = await getMyDocumentUrl(storagePath);
      if (url) window.open(url, "_blank");
    });
  }

  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2 text-sm last:border-0">
      <div>
        <p className="font-medium text-gray-800">{tag}</p>
        <p className="text-xs text-gray-400">
          {filename} · {date}
        </p>
      </div>
      <button
        type="button"
        onClick={handleOpen}
        disabled={isPending}
        className="text-xs font-medium text-brand-navy underline disabled:opacity-50"
      >
        {isPending ? "פותח..." : "פתח"}
      </button>
    </div>
  );
}
