-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "twoFactorCode" VARCHAR(10),
ADD COLUMN     "twoFactorExpiry" TIMESTAMP(3),
ADD COLUMN     "twoFactorVerifiedAt" TIMESTAMP(3);
