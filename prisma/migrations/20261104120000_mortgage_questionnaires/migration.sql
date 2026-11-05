-- CreateEnum
CREATE TYPE "MortgageQuestionnaireStatus" AS ENUM ('sent', 'submitted');

-- CreateTable
CREATE TABLE "mortgage_questionnaires" (
    "id" TEXT NOT NULL,
    "advisor_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_phone" TEXT,
    "status" "MortgageQuestionnaireStatus" NOT NULL DEFAULT 'sent',
    "responses" JSONB,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mortgage_questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mortgage_questionnaires_token_key" ON "mortgage_questionnaires"("token");

-- AddForeignKey
ALTER TABLE "mortgage_questionnaires" ADD CONSTRAINT "mortgage_questionnaires_advisor_id_fkey" FOREIGN KEY ("advisor_id") REFERENCES "advisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
