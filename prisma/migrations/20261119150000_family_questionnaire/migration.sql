-- AlterTable: a questionnaire can belong to a family, with the meeting it prepares for
ALTER TABLE "mortgage_questionnaires" ADD COLUMN "family_id" TEXT,
ADD COLUMN "meeting_at" TIMESTAMP(3),
ADD COLUMN "meeting_place" TEXT;

-- CreateIndex
CREATE INDEX "mortgage_questionnaires_family_id_idx" ON "mortgage_questionnaires"("family_id");

-- AddForeignKey
ALTER TABLE "mortgage_questionnaires" ADD CONSTRAINT "mortgage_questionnaires_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
