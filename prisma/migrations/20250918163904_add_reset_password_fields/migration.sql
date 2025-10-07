/*
  Warnings:

  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "resetToken" VARCHAR(255),
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ALTER COLUMN "name" SET DEFAULT 'NO_NAME',
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255);
