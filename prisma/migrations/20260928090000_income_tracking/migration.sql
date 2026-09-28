-- CreateTable
CREATE TABLE "income_categories" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planned_amount" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incomes" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "income_categories_family_id_name_key" ON "income_categories"("family_id", "name");

-- AddForeignKey
ALTER TABLE "income_categories" ADD CONSTRAINT "income_categories_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "income_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
