import { prisma } from "@/lib/prisma";

export type MeetingSummaryItem = {
  id: string;
  title: string;
  meetingDate: Date;
  summary: string;
  nextFocus: string | null;
};

export async function getFamilyMeetingSummaries(
  familyId: string
): Promise<MeetingSummaryItem[]> {
  return prisma.meetingSummary.findMany({
    where: { familyId },
    orderBy: { meetingDate: "desc" },
    select: {
      id: true,
      title: true,
      meetingDate: true,
      summary: true,
      nextFocus: true,
    },
  });
}
