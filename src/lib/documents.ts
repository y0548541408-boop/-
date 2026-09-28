import { prisma } from "@/lib/prisma";

export type FamilyDocumentItem = {
  id: string;
  filename: string;
  tag: string;
  storagePath: string;
  createdAt: Date;
};

export async function getFamilyDocuments(familyId: string): Promise<FamilyDocumentItem[]> {
  return prisma.document.findMany({
    where: { familyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      tag: true,
      storagePath: true,
      createdAt: true,
    },
  });
}
