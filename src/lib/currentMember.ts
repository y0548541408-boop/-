import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// Set by the advisor's "צפייה כמו הלקוח" link. It names one of the advisor's
// families; while it is set, the client's area opens for that family.
export const VIEW_AS_COOKIE = "view_as_family";

// Cached per request: the dashboard layout and the page both ask for it.
export const getCurrentFamilyMember = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const viewAs = (await cookies()).get(VIEW_AS_COOKIE)?.value;
  if (viewAs) {
    const advisor = await prisma.advisor.findUnique({ where: { authUserId: user.id }, select: { id: true } });
    if (advisor) {
      const member = await prisma.familyMember.findFirst({
        where: { family: { id: viewAs, advisorId: advisor.id } },
        orderBy: { role: "asc" },
        include: { family: true },
      });
      if (member) return member;
    }
  }

  return prisma.familyMember.findUnique({
    where: { authUserId: user.id },
    include: { family: true },
  });
});

// The family the advisor is viewing as a client, if any (for the banner).
export async function getViewAsFamilyId(): Promise<string | null> {
  return (await cookies()).get(VIEW_AS_COOKIE)?.value ?? null;
}
