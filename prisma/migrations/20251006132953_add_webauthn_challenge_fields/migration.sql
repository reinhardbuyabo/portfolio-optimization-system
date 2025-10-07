-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "challengeExpiry" TIMESTAMP(3),
ADD COLUMN     "webauthnChallenge" VARCHAR(255);
