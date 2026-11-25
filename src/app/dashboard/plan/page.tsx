import { redirect } from "next/navigation";
import { getCurrentFamilyMember } from "@/lib/currentMember";
import { getMappingOverview } from "@/lib/mapping";
import { ensurePictureLines, getPicture } from "@/lib/picture";
import { getFamilyGoals, summarizeGoals } from "@/lib/goals";
import { ensureDefaultCategories, familyHasNoCategories } from "@/lib/defaultCategories";
import AutoRefresh from "@/components/AutoRefresh";
import JourneySteps from "@/components/JourneySteps";
import PlanView from "@/components/mapping/PlanView";
import DashboardNav from "../DashboardNav";

export default async function PlanPage() {
  const member = await getCurrentFamilyMember();
  if (!member) redirect("/login");
  if (await familyHasNoCategories(member.familyId)) await ensureDefaultCategories(member.familyId);

  await ensurePictureLines(member.familyId);
  const [overview, picture, goals] = await Promise.all([
    getMappingOverview(member.familyId),
    getPicture(member.familyId),
    getFamilyGoals(member.familyId),
  ]);
  // What the picture says per category, per month (annual lines count one twelfth).
  const pictureView = {
    hasData: picture.hasData,
    expense: Object.fromEntries([...picture.categoryExpense].map(([k, v]) => [k, v.target])),
    income: Object.fromEntries([...picture.categoryIncome].map(([k, v]) => [k, v.target])),
  };

  return (
    <main className="min-h-screen bg-ru-bg px-4 pb-44 pt-6 lg:ps-64 lg:pb-12 text-ru-ink">
      <div className="mx-auto max-w-md lg:max-w-5xl">
        <AutoRefresh />
        <JourneySteps current={3} />
        <h1 className="mt-4 text-3xl text-ru-blue">התכנון: כמה מוציאים מעכשיו</h1>
        <p className="mt-1 text-base">
          לכל קטגוריה קובעים סכום לחודש. מזה נבנה המעקב היומי, ותמיד אפשר לחזור ולשנות.
        </p>
        <PlanView
          overview={overview}
          mappingHref="/dashboard/mapping"
          picture={pictureView}
          goals={summarizeGoals(goals)}
        />
        <DashboardNav />
      </div>
    </main>
  );
}
