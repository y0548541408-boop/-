import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { normalizeIsraeliPhone } from "@/lib/phone";

// 48 hex characters: the secret part of a personal entry link (/k/<token>).
export function newAccessToken(): string {
  return randomBytes(24).toString("hex");
}

export type AddMemberResult = { ok: true } | { error: string };

// The login flow only sends a code to an email that belongs to a
// FamilyMember, so this is what actually gives a client access.
export async function addFamilyMemberRecord(
  familyId: string,
  input: { fullName: string; email?: string | null; phone?: string | null; role: "primary" | "spouse" }
): Promise<AddMemberResult> {
  const fullName = input.fullName.trim();
  const email = input.email?.trim().toLowerCase() || null;
  const rawPhone = input.phone?.trim() || "";
  const phone = normalizeIsraeliPhone(rawPhone);

  if (!fullName) return { error: "צריך שם." };
  if (!email && !rawPhone) return { error: "צריך מספר טלפון או מייל, כדי שיהיה אפשר לשלוח קישור." };
  if (rawPhone && !phone) return { error: "מספר הטלפון לא תקין. למשל: 050-1234567." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "כתובת המייל לא תקינה." };

  if (email) {
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
  }

  if (phone) {
    const samePhone = await prisma.familyMember.findFirst({ where: { familyId, phone } });
    if (samePhone) return { error: `המספר הזה כבר רשום במשפחה (${samePhone.fullName}).` };
  }

  await prisma.familyMember.create({
    data: {
      familyId,
      fullName,
      email,
      phone,
      role: input.role,
      accessToken: newAccessToken(),
    },
  });
  await prisma.family.update({ where: { id: familyId }, data: { portalActive: true } });

  return { ok: true };
}
