import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// Cached per request: the dashboard layout and the page both ask for it.
export const getCurrentFamilyMember = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.familyMember.findUnique({
    where: { authUserId: user.id },
    include: { family: true },
  });
});
