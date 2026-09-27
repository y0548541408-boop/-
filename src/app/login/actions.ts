"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string } | { ok: true };

const GENERIC_ERROR = "משהו השתבש. נסה שוב, ואם זה חוזר, פנה ליועץ שלך.";

export async function requestOtp(email: string): Promise<ActionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { error: "צריך להזין כתובת מייל." };

  const member = await prisma.familyMember.findFirst({
    where: { email: normalizedEmail },
  });

  // Don't reveal whether the email exists in the system.
  if (!member) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: true },
  });

  if (error) return { error: GENERIC_ERROR };
  return { ok: true };
}

export async function verifyOtp(
  email: string,
  token: string
): Promise<ActionResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: token.trim(),
    type: "email",
  });

  if (error || !data.user) return { error: "הקוד שגוי או שפג תוקפו." };

  await prisma.familyMember.updateMany({
    where: { email: normalizedEmail, authUserId: null },
    data: { authUserId: data.user.id },
  });

  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
