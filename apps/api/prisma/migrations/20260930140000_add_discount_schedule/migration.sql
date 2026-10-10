-- AlterTable
ALTER TABLE "variants"
  ADD COLUMN "discountStartAt" TIMESTAMP(3),
  ADD COLUMN "discountEndAt" TIMESTAMP(3);
