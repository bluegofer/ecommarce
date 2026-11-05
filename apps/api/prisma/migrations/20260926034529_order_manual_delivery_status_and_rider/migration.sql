-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_VERIFICATION';
ALTER TYPE "OrderStatus" ADD VALUE 'VERIFIED';
ALTER TYPE "OrderStatus" ADD VALUE 'IN_TRANSIT';
ALTER TYPE "OrderStatus" ADD VALUE 'OUT_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "inTransitAt" TIMESTAMP(3),
ADD COLUMN     "outForDeliveryAt" TIMESTAMP(3),
ADD COLUMN     "pendingVerificationAt" TIMESTAMP(3),
ADD COLUMN     "riderAssignedAt" TIMESTAMP(3),
ADD COLUMN     "riderName" VARCHAR(120),
ADD COLUMN     "riderPhone" VARCHAR(20),
ADD COLUMN     "verifiedAt" TIMESTAMP(3);
