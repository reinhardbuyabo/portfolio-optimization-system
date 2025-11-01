/*
  Warnings:

  - A unique constraint covering the columns `[userId,name]` on the table `Portfolio` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Portfolio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `riskTolerance` to the `Portfolio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetReturn` to the `Portfolio` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Portfolio" ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "riskTolerance" "public"."RiskTolerance" NOT NULL,
ADD COLUMN     "targetReturn" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_userId_name_key" ON "public"."Portfolio"("userId", "name");
