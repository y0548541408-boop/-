"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string } | { ok: true };
type VerifyResult = { error: string } | { ok: true; redirectTo: string };

const GENERIC_ERROR = "משהו השתבש. נסה שוב, ואם זה חוזר, פנה ליועץ שלך.";

export async function requestOtp(email: string): Promise<ActionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { error: "צריך להזין כתובת מייל." };

  const [member, advisor] = await Promise.all([
    prisma.familyMember.findFirst({ where: { email: normalizedEmail } }),
    prisma.advisor.findUnique({ where: { email: normalizedEmail } }),
  ]);

  // Don't reveal whether the email exists in the system.
  if (!member && !advisor) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: true },
  });

  if (error) {
    console.error("signInWithOtp error:", error);
    return { error: GENERIC_ERROR };
  }
  return { ok: true };
}

export async function verifyOtp(
  email: string,
  token: string
): Promise<VerifyResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: token.trim(),
    type: "email",
  });

  if (error || !data.user) return { error: "הקוד שגוי או שפג תוקפו." };

  const advisor = await prisma.advisor.findUnique({
    where: { email: normalizedEmail },
  });

  if (advisor) {
    if (!advisor.authUserId) {
      await prisma.advisor.update({
        where: { id: advisor.id },
        data: { authUserId: data.user.id },
      });
    }
    return { ok: true, redirectTo: "/admin" };
  }

  await prisma.familyMember.updateMany({
    where: { email: normalizedEmail, authUserId: null },
    data: { authUserId: data.user.id },
  });

  return { ok: true, redirectTo: "/dashboard" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
