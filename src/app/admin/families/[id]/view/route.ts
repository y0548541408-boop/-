import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentAdvisor } from "@/lib/advisor";
import { VIEW_AS_COOKIE } from "@/lib/currentMember";

// The advisor opens the client's area as the client sees it. Only for a family of theirs.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const advisor = await getCurrentAdvisor();
  if (!advisor) return NextResponse.redirect(new URL("/dashboard", request.url));

  const family = await prisma.family.findFirst({ where: { id, advisorId: advisor.id }, select: { id: true } });
  if (!family) return NextResponse.redirect(new URL("/admin", request.url));

  (await cookies()).set(VIEW_AS_COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 4,
  });
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
