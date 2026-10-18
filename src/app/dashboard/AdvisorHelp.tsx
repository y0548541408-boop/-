import { prisma } from "@/lib/prisma";

// "Have a question? Message Israel" card. Hidden until the advisor has a phone on file.
export default async function AdvisorHelp({ familyId }: { familyId: string }) {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { advisor: { select: { fullName: true, phone: true } } },
  });
  const advisor = family?.advisor;
  if (!advisor?.phone) return null;

  let digits = advisor.phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  const firstName = advisor.fullName.split(" ")[0];
  const text = encodeURIComponent("שלום, יש לי שאלה לגבי האפליקציה");

  return (
    <a
      href={`https://wa.me/${digits}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-8 flex items-center justify-between gap-3 rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(46,46,46,0.07)]"
    >
      <div>
        <p className="text-base font-bold text-ru-ink">יש שאלה? אני כאן</p>
        <p className="text-sm text-ru-muted">כתבו ל{firstName} בוואטסאפ ותקבלו תשובה אישית</p>
      </div>
      <span className="shrink-0 rounded-full bg-ru-green px-4 py-2.5 text-sm font-bold text-white">
        וואטסאפ
      </span>
    </a>
  );
}
