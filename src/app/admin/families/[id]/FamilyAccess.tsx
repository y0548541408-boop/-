"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addFamilyMember, removeFamilyMember } from "./actions";

type Member = { id: string; fullName: string; email: string; role: "primary" | "spouse" };

export default function FamilyAccess({
  familyId,
  members,
  loginUrl,
}: {
  familyId: string;
  members: Member[];
  loginUrl: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"primary" | "spouse">(members.length ? "spouse" : "primary");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addFamilyMember({ familyId, fullName, email, role });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setFullName("");
      setEmail("");
      setRole("spouse");
      router.refresh();
    });
  }

  function remove(memberId: string) {
    if (!window.confirm("להסיר את הגישה של בן המשפחה הזה לאזור האישי?")) return;
    startTransition(async () => {
      await removeFamilyMember({ familyId, memberId });
      router.refresh();
    });
  }

  function messageFor(member: Member) {
    return `שלום ${member.fullName}, זה הקישור לאזור התקציב האישי שלך:\n${loginUrl}\n\nנכנסים עם המייל ${member.email} ומקבלים קוד כניסה למייל (אם לא מגיע תוך דקה, כדאי לבדוק בספאם). אחרי הכניסה אפשר להוסיף את האתר למסך הבית, ומשם זה נפתח כמו אפליקציה.`;
  }

  async function copy(member: Member) {
    try {
      await navigator.clipboard.writeText(messageFor(member));
      setCopied(member.id);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-brand-teal/10 bg-white p-4 shadow-sm shadow-brand-teal/5">
      <h2 className="text-sm font-semibold text-brand-teal">גישה לאזור האישי</h2>
      <p className="mt-1 text-xs text-gray-500">
        רק מי שרשום כאן יקבל קוד כניסה. נכנסים עם אותו מייל.
      </p>

      {members.length === 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          עדיין אין למשפחה הזו גישה. הוסף לפחות בן משפחה אחד עם המייל שלו.
        </p>
      )}

      {members.length > 0 && (
        <div className="mt-3 space-y-2">
          {members.map((m) => (
            <div key={m.id} className="rounded-lg bg-gray-50 p-3 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-gray-800">
                  {m.fullName}{" "}
                  <span className="text-xs font-normal text-gray-400">
                    {m.role === "primary" ? "· ראשי" : "· בן/בת זוג"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="text-xs text-gray-400 hover:text-red-600"
                >
                  הסר
                </button>
              </div>
              <p className="text-xs text-gray-500" dir="ltr">
                {m.email}
              </p>
              <div className="mt-2 flex gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(messageFor(m))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  שליחה בוואטסאפ
                </a>
                <button
                  type="button"
                  onClick={() => copy(m)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600"
                >
                  {copied === m.id ? "הועתק ✓" : "העתקת ההודעה"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={add} className="mt-4 space-y-2 border-t border-gray-100 pt-4">
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="שם (למשל: דנה כהן)"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input
          type="email"
          required
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "primary" | "spouse")}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="primary">ראשי</option>
          <option value="spouse">בן/בת זוג</option>
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-brand-teal px-3 py-2 text-sm font-medium text-white hover:bg-brand-teal-dark disabled:opacity-50"
        >
          {isPending ? "שומר..." : "מתן גישה"}
        </button>
      </form>
    </div>
  );
}
