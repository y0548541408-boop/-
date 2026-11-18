import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Personal entry link: /k/<token>. The token belongs to one family member.
// Opening it signs that person in (no code, no sign-up) and sends them to the
// app. The advisor can cancel a link by creating a new one.
export async function GET(request: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const home = new URL("/login", request.url);

  // A link that no longer works must also forget the copy remembered on this device.
  const invalid = () => {
    const res = NextResponse.redirect(new URL("/login?link=invalid", request.url));
    res.cookies.delete("kt");
    return res;
  };

  if (!/^[a-f0-9]{48}$/.test(token)) return invalid();

  const member = await prisma.familyMember.findUnique({ where: { accessToken: token } });
  if (!member) return invalid();

  // Never let a client link open the advisor area.
  if (member.email) {
    const advisor = await prisma.advisor.findUnique({ where: { email: member.email } });
    if (advisor) return NextResponse.redirect(home);
  }

  // A member who joined with a phone number only has no email. The sign-in
  // system needs one, so they get a private internal address that never
  // receives mail: the link itself is how they get in.
  const signInEmail = member.email ?? `member-${member.id}@members.clalatmishpaha.com`;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: signInEmail });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error("personal link: generateLink failed");
    return NextResponse.redirect(new URL("/login?link=error", request.url));
  }

  const supabase = await createClient();
  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    // The link made by generateLink is verified as an "email" one-time token.
    type: "email",
  });
  if (verifyError || !verified.user) {
    console.error("personal link: verifyOtp failed");
    return NextResponse.redirect(new URL("/login?link=error", request.url));
  }

  if (!member.authUserId || member.authUserId !== verified.user.id) {
    await prisma.familyMember.updateMany({
      where: { id: member.id, OR: [{ authUserId: null }, { authUserId: { not: verified.user.id } }] },
      data: { authUserId: verified.user.id },
    });
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  // Remember the link on this device, so the installed app can sign in again
  // by itself if the session ever expires.
  response.cookies.set("kt", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
