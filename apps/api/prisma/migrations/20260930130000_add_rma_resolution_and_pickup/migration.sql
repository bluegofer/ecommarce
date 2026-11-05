-- CreateEnum
CREATE TYPE "ReturnResolutionType" AS ENUM ('REFUND', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "PickupMethod" AS ENUM ('HOME_PICKUP', 'SELF_DROP_OFF');

-- AlterTable
ALTER TABLE "return_requests"
  ADD COLUMN "resolutionType" "ReturnResolutionType",
  ADD COLUMN "pickupMethod" "PickupMethod",
  ADD COLUMN "replacementVariantId" TEXT,
  ADD COLUMN "replacementNotes" TEXT;
