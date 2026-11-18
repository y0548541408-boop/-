"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addFamilyMember, removeFamilyMember, createMemberAccessLink, updateMemberPhone } from "./actions";
import { formatPhone, toWhatsappNumber } from "@/lib/phone";

type Member = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: "primary" | "spouse";
  accessToken: string | null;
};

// A phone number is enough: each person gets their own personal link, sent
// straight to their own number on WhatsApp.
export default function FamilyAccess({
  familyId,
  members,
  loginUrl,
  appOrigin,
}: {
  familyId: string;
  members: Member[];
  loginUrl: string;
  appOrigin: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"primary" | "spouse">(members.length ? "spouse" : "primary");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [phoneFor, setPhoneFor] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addFamilyMember({ familyId, fullName, phone, email, role });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setFullName("");
      setPhone("");
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

  function personalLink(member: Member) {
    return member.accessToken ? `${appOrigin}/k/${member.accessToken}` : null;
  }

  function newLink(member: Member, again: boolean) {
    if (again && !window.confirm("הקישור הקודם יפסיק לעבוד. ליצור קישור חדש?")) return;
    startTransition(async () => {
      await createMemberAccessLink({ familyId, memberId: member.id });
      router.refresh();
    });
  }

  function savePhone(member: Member) {
    setPhoneError(null);
    startTransition(async () => {
      const res = await updateMemberPhone({ familyId, memberId: member.id, phone: phoneDraft });
      if ("error" in res) {
        setPhoneError(res.error);
        return;
      }
      setPhoneFor(null);
      setPhoneDraft("");
      router.refresh();
    });
  }

  function messageFor(member: Member) {
    const link = personalLink(member);
    const first = member.fullName.trim().split(/\s+/)[0] ?? member.fullName;
    if (link) {
      return `שלום ${first}, זה הקישור האישי שלך לתקציב של המשפחה:\n${link}\n\nלוחצים עליו ונכנסים ישר, בלי סיסמה ובלי קוד. כדאי לשמור אותו בוואטסאפ, ולהוסיף את האתר למסך הבית (באייפון: כפתור השיתוף ואז "הוסף למסך הבית". באנדרואיד: תפריט הדפדפן ואז "התקנת אפליקציה"). הקישור אישי, לא שולחים אותו הלאה.`;
    }
    return `שלום ${first}, זה הקישור לאזור התקציב האישי שלך:\n${loginUrl}\n\nנכנסים עם המייל ${member.email} ומקבלים קוד כניסה למייל (אם לא מגיע תוך דקה, כדאי לבדוק בספאם). אחרי הכניסה אפשר להוסיף את האתר למסך הבית, ומשם זה נפתח כמו אפליקציה.`;
  }

  // With a phone number the message opens directly in that person's chat.
  function whatsappHref(member: Member) {
    const number = toWhatsappNumber(member.phone);
    return `https://wa.me/${number ?? ""}?text=${encodeURIComponent(messageFor(member))}`;
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
      <h2 className="text-base font-semibold text-brand-teal">גישה לאזור האישי</h2>
      <p className="mt-1 text-sm text-gray-500">
        מוסיפים כל אחד מבני הזוג עם שם וטלפון. כל אחד מקבל קישור אישי משלו, שנשלח ישירות למספר שלו בוואטסאפ. לוחצים עליו ונכנסים, בלי הרשמה ובלי קוד.
      </p>

      {members.length === 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          עדיין אין למשפחה הזו גישה. הוסיפו את בן הזוג הראשון למטה.
        </p>
      )}

      {members.length > 0 && (
        <div className="mt-3 space-y-3">
          {members.map((m) => {
            const hasPhone = !!toWhatsappNumber(m.phone);
            return (
              <div key={m.id} className="rounded-xl bg-gray-50 p-3.5 text-base">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-gray-800">
                    {m.fullName}{" "}
                    <span className="text-sm font-normal text-gray-400">
                      {m.role === "primary" ? "· ראשי" : "· בן/בת זוג"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    className="min-h-10 px-2 text-sm text-gray-400 hover:text-red-600"
                  >
                    הסרה
                  </button>
                </div>
                <p className="text-sm text-gray-600" dir="ltr" style={{ textAlign: "right" }}>
                  {hasPhone ? formatPhone(m.phone) : "אין טלפון"}
                  {m.email ? ` · ${m.email}` : ""}
                </p>

                {!hasPhone && (
                  <div className="mt-2">
                    {phoneFor === m.id ? (
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="tel"
                          inputMode="tel"
                          dir="ltr"
                          autoFocus
                          value={phoneDraft}
                          onChange={(e) => setPhoneDraft(e.target.value)}
                          placeholder="050-1234567"
                          className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-base"
                        />
                        <button
                          type="button"
                          onClick={() => savePhone(m)}
                          disabled={isPending}
                          className="min-h-11 rounded-lg bg-brand-teal px-4 text-sm font-medium text-white disabled:opacity-50"
                        >
                          שמירה
                        </button>
                        {phoneError && <p className="basis-full text-sm text-red-600">{phoneError}</p>}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneFor(m.id);
                          setPhoneDraft("");
                          setPhoneError(null);
                        }}
                        className="min-h-11 text-sm font-medium text-brand-teal underline"
                      >
                        הוספת מספר טלפון
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {!m.accessToken && (
                    <button
                      type="button"
                      onClick={() => newLink(m, false)}
                      disabled={isPending}
                      className="min-h-11 rounded-lg bg-brand-teal px-4 text-sm font-medium text-white disabled:opacity-50"
                    >
                      יצירת קישור אישי
                    </button>
                  )}
                  <a
                    href={whatsappHref(m)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white"
                  >
                    {hasPhone ? `שליחה בוואטסאפ ל${m.fullName.trim().split(/\s+/)[0]}` : "שליחה בוואטסאפ (בחירת איש קשר)"}
                  </a>
                  <button
                    type="button"
                    onClick={() => copy(m)}
                    className="min-h-11 rounded-lg border border-gray-200 px-4 text-sm text-gray-600"
                  >
                    {copied === m.id ? "הועתק ✓" : "העתקת ההודעה"}
                  </button>
                  {m.accessToken && (
                    <button
                      type="button"
                      onClick={() => newLink(m, true)}
                      disabled={isPending}
                      className="min-h-11 rounded-lg border border-gray-200 px-4 text-sm text-gray-600"
                    >
                      ביטול הקישור והנפקה מחדש
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={add} className="mt-4 space-y-2.5 border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700">הוספת בן או בת זוג</p>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="שם (למשל: דנה כהן)"
          className="min-h-12 w-full rounded-lg border border-gray-200 px-3 text-base"
        />
        <input
          type="tel"
          inputMode="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="טלפון נייד: 050-1234567"
          className="min-h-12 w-full rounded-lg border border-gray-200 px-3 text-right text-base"
        />
        <input
          type="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="מייל (לא חובה)"
          className="min-h-12 w-full rounded-lg border border-gray-200 px-3 text-right text-base"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "primary" | "spouse")}
          className="min-h-12 w-full rounded-lg border border-gray-200 px-3 text-base"
        >
          <option value="primary">ראשי</option>
          <option value="spouse">בן/בת זוג</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="min-h-12 w-full rounded-lg bg-brand-teal px-3 text-base font-medium text-white hover:bg-brand-teal-dark disabled:opacity-50"
        >
          {isPending ? "שומר..." : "הוספה ויצירת קישור אישי"}
        </button>
      </form>
    </div>
  );
}
