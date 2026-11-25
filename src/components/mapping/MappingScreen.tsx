import { prisma } from "@/lib/prisma";
import { getMappingOverview } from "@/lib/mapping";
import { ensurePictureLines, getPicture } from "@/lib/picture";
import { ensureDefaultCategories, familyHasNoCategories } from "@/lib/defaultCategories";
import AutoRefresh from "@/components/AutoRefresh";
import AssetsTab from "./AssetsTab";
import { PictureImport } from "./PictureImport";
import { MappingTabs, MonthlyPicture, AnnualPicture, PictureSummaryView, type MappingTab } from "./PictureView";

export function parseTab(value: string | undefined): MappingTab {
  return value === "annual" || value === "assets" || value === "summary" ? value : "monthly";
}

const INTRO: Record<MappingTab, string> = {
  monthly: "קודם התמונה החודשית: כמה נכנס וכמה יוצא בחודש רגיל, שורה אחרי שורה.",
  annual: "ואחר כך התמונה השנתית: מה קורה פעם בשנה, כולל החגים. אנחנו מחלקים את זה ל-12.",
  assets: "מה יש לנו, ומה אנחנו חייבים. ככה רואים את המצב הכולל, לא רק את החודש.",
  summary: "כל המספרים ביחד: כמה נשאר בחודש, ומה השתנה מול הבנק.",
};

// The whole mapping stage, shared by the client's app and the advisor's view of
// a family. `familyId` is only passed from the advisor's side.
export default async function MappingScreen({
  familyId: id,
  advisorView,
  basePath,
  planHref,
  tab,
}: {
  familyId: string;
  advisorView?: boolean;
  basePath: string;
  planHref: string;
  tab: MappingTab;
}) {
  // Independent first-visit checks, done together to save round trips to the database.
  const [noCategories] = await Promise.all([familyHasNoCategories(id), ensurePictureLines(id)]);
  if (noCategories) await ensureDefaultCategories(id);

  // The bank numbers are only needed for the summary's comparison.
  const [picture, members, overview] = await Promise.all([
    getPicture(id),
    prisma.familyMember.findMany({ where: { familyId: id }, select: { fullName: true, role: true } }),
    tab === "summary" ? getMappingOverview(id) : Promise.resolve(null),
  ]);

  const familyArg = advisorView ? id : undefined;

  // Show the first names from the family's details. The stored group names stay the same.
  const firstName = (role: "primary" | "spouse") => {
    const full = members.find((m) => m.role === role)?.fullName.trim().split(/\s+/)[0];
    return full || null;
  };
  const names = { husband: firstName("primary"), wife: firstName("spouse") };

  return (
    <div>
      <AutoRefresh />
      <p className="text-base text-ru-muted">שלב 1 בתהליך</p>
      <h1 className="text-3xl text-ru-blue">המיפוי: איפה אנחנו היום</h1>
      <p className="mt-1 text-base">{INTRO[tab]}</p>

      {advisorView && <PictureImport familyId={id} />}

      <MappingTabs active={tab} basePath={basePath} />

      {tab === "monthly" && <MonthlyPicture picture={picture} familyId={familyArg} names={names} />}
      {tab === "annual" && <AnnualPicture picture={picture} familyId={familyArg} names={names} />}
      {tab === "assets" && <AssetsTab familyId={id} advisorView={advisorView} />}
      {tab === "summary" && overview && (
        <PictureSummaryView picture={picture} bank={overview} familyId={familyArg} planHref={planHref} />
      )}
    </div>
  );
}
