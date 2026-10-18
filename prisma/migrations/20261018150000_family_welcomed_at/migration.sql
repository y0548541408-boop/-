-- AlterTable
ALTER TABLE "families" ADD COLUMN "welcomed_at" TIMESTAMP(3);

-- Families that already exist skip the new-client welcome setup.
UPDATE "families" SET "welcomed_at" = CURRENT_TIMESTAMP;
