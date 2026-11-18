-- CreateTable
CREATE TABLE "advisor_insights" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advisor_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "advisor_insights_family_id_idx" ON "advisor_insights"("family_id");

-- AddForeignKey
ALTER TABLE "advisor_insights" ADD CONSTRAINT "advisor_insights_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
