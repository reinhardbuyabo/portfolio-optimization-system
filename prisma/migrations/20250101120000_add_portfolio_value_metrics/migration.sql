-- AlterTable
ALTER TABLE "public"."Portfolio" ADD COLUMN "value" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN "expectedReturn" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN "sharpeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN "holdingsCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."PortfolioAllocation" ADD COLUMN "value" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN "expectedReturn" DOUBLE PRECISION,
ADD COLUMN "sharpeRatio" DOUBLE PRECISION;

-- DropForeignKey (if exists, we'll recreate with cascade)
ALTER TABLE "public"."PortfolioAllocation" DROP CONSTRAINT IF EXISTS "PortfolioAllocation_portfolioId_fkey";
ALTER TABLE "public"."PortfolioAllocation" DROP CONSTRAINT IF EXISTS "PortfolioAllocation_assetId_fkey";

-- AddForeignKey with cascade delete
ALTER TABLE "public"."PortfolioAllocation" ADD CONSTRAINT "PortfolioAllocation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."PortfolioAllocation" ADD CONSTRAINT "PortfolioAllocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."PortfolioValuation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolioId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "totalReturn" DOUBLE PRECISION NOT NULL,
    "sharpeRatio" DOUBLE PRECISION NOT NULL,
    "volatility" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PortfolioValuation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioValuation_portfolioId_date_idx" ON "public"."PortfolioValuation"("portfolioId", "date");

-- AddForeignKey
ALTER TABLE "public"."PortfolioValuation" ADD CONSTRAINT "PortfolioValuation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

