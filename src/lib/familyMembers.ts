import { prisma } from "@/lib/prisma";

export type AddMemberResult = { ok: true } | { error: string };

// The login flow only sends a code to an email that belongs to a
// FamilyMember, so this is what actually gives a client access.
export async function addFamilyMemberRecord(
  familyId: string,
  input: { fullName: string; email: string; phone?: string | null; role: "primary" | "spouse" }
): Promise<AddMemberResult> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (!fullName) return { error: "צריך שם." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "כתובת המייל לא תקינה." };

  const advisor = await prisma.advisor.findUnique({ where: { email } });
  if (advisor) {
    return { error: "זה המייל של היועץ. עם המייל הזה נכנסים תמיד לאזור היועץ, לא לאזור הלקוח." };
  }

  const existing = await prisma.familyMember.findFirst({ where: { email } });
  if (existing) {
    return {
      error:
        existing.familyId === familyId
          ? "המייל הזה כבר רשום במשפחה הזו."
          : "המייל הזה כבר משויך למשפחה אחרת במערכת.",
    };
  }

  await prisma.familyMember.create({
    data: {
      familyId,
      fullName,
      email,
      phone: input.phone?.trim() || null,
      role: input.role,
    },
  });
  await prisma.family.update({ where: { id: familyId }, data: { portalActive: true } });

  return { ok: true };
}
