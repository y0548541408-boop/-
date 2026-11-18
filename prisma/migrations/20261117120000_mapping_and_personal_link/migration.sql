-- CreateEnum
CREATE TYPE "MappingSource" AS ENUM ('checking', 'credit', 'cash');

-- CreateEnum
CREATE TYPE "PicturePeriod" AS ENUM ('monthly', 'annual');

-- CreateEnum
CREATE TYPE "PictureKind" AS ENUM ('income', 'expense');

-- AlterTable
ALTER TABLE "families" ADD COLUMN     "household_size" INTEGER;

-- AlterTable
ALTER TABLE "family_members" ADD COLUMN     "access_token" TEXT;

-- CreateTable
CREATE TABLE "mapping_uploads" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "source" "MappingSource" NOT NULL,
    "row_count" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mapping_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapping_transactions" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "upload_id" TEXT,
    "source" "MappingSource" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "merchant_key" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_income" BOOLEAN NOT NULL DEFAULT false,
    "category_id" TEXT,
    "income_category_id" TEXT,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "exclude_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mapping_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_rules" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "merchant_key" TEXT NOT NULL,
    "category_id" TEXT,
    "income_category_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "picture_lines" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "period" "PicturePeriod" NOT NULL,
    "kind" "PictureKind" NOT NULL,
    "group_name" TEXT NOT NULL,
    "sub_group" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "target_amount" DECIMAL(12,2),
    "priority" INTEGER,
    "notes" TEXT,
    "when_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "picture_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mapping_transactions_family_id_merchant_key_idx" ON "mapping_transactions"("family_id", "merchant_key");

-- CreateIndex
CREATE INDEX "merchant_rules_merchant_key_idx" ON "merchant_rules"("merchant_key");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_rules_family_id_merchant_key_key" ON "merchant_rules"("family_id", "merchant_key");

-- CreateIndex
CREATE INDEX "picture_lines_family_id_period_idx" ON "picture_lines"("family_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "picture_lines_family_id_period_kind_group_name_sub_group_na_key" ON "picture_lines"("family_id", "period", "kind", "group_name", "sub_group", "name");

-- CreateIndex
CREATE UNIQUE INDEX "family_members_access_token_key" ON "family_members"("access_token");

-- AddForeignKey
ALTER TABLE "mapping_uploads" ADD CONSTRAINT "mapping_uploads_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapping_transactions" ADD CONSTRAINT "mapping_transactions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapping_transactions" ADD CONSTRAINT "mapping_transactions_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "mapping_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapping_transactions" ADD CONSTRAINT "mapping_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "budget_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapping_transactions" ADD CONSTRAINT "mapping_transactions_income_category_id_fkey" FOREIGN KEY ("income_category_id") REFERENCES "income_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "budget_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_income_category_id_fkey" FOREIGN KEY ("income_category_id") REFERENCES "income_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "picture_lines" ADD CONSTRAINT "picture_lines_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

