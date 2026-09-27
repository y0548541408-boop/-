import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/app/login/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const member = await prisma.familyMember.findUnique({
    where: { authUserId: user.id },
    include: { family: true },
  });

  if (!member) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <p className="text-gray-600">
          המשתמש מאומת אך לא משויך לאף משפחה במערכת. פנה ליועץ שלך.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">
          שלום, {member.fullName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          משפחת {member.family.displayName} · סטטוס: {member.family.status}
        </p>
        <p className="mt-4 text-sm text-gray-400">
          כאן יופיע דשבורד התקציב. זהו רק אימות שהזדהות ובסיס הנתונים מדברים
          אחד עם השני.
        </p>
        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            התנתקות
          </button>
        </form>
      </div>
    </main>
  );
}
