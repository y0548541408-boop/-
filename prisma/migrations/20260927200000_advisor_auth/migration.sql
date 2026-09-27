-- AlterTable
ALTER TABLE "advisors" ADD COLUMN     "auth_user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "advisors_auth_user_id_key" ON "advisors"("auth_user_id");
