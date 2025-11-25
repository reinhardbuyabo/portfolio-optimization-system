-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'PORTFOLIO_MANAGER', 'INVESTOR', 'ANALYST');

-- CreateEnum
CREATE TYPE "public"."RiskTolerance" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."PortfolioStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL DEFAULT 'NO_NAME',
    "email" VARCHAR(255) NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'INVESTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resetToken" VARCHAR(255),
    "resetTokenExpiry" TIMESTAMP(3),
    "twoFactorCode" VARCHAR(10),
    "twoFactorExpiry" TIMESTAMP(3),
    "twoFactorVerifiedAt" TIMESTAMP(3),
    "webauthnChallenge" VARCHAR(255),
    "challengeExpiry" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "oauth_token_secret" TEXT,
    "oauth_token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvestorProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "budget" DOUBLE PRECISION NOT NULL,
    "riskTolerance" "public"."RiskTolerance" NOT NULL,
    "constraints" JSONB,
    "preferences" JSONB,

    CONSTRAINT "InvestorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Asset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MarketData" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assetId" UUID NOT NULL,
    "ticker" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" INTEGER NOT NULL,
    "sentimentScore" DOUBLE PRECISION,

    CONSTRAINT "MarketData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Portfolio" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "riskTolerance" "public"."RiskTolerance" NOT NULL,
    "targetReturn" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."PortfolioStatus" NOT NULL DEFAULT 'DRAFT',
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "expectedReturn" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "sharpeRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "holdingsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PortfolioAllocation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolioId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "expectedReturn" DOUBLE PRECISION,
    "sharpeRatio" DOUBLE PRECISION,

    CONSTRAINT "PortfolioAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OptimizationResult" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolioId" UUID NOT NULL,
    "expectedReturn" DOUBLE PRECISION NOT NULL,
    "expectedVolatility" DOUBLE PRECISION NOT NULL,
    "sharpeRatio" DOUBLE PRECISION NOT NULL,
    "sortinoRatio" DOUBLE PRECISION NOT NULL,
    "maxDrawdown" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Simulation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolioId" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "performanceMetrics" JSONB,

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Authenticator" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "credentialID" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" BIGINT NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LSTMPrediction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "symbol" VARCHAR(10) NOT NULL,
    "predictionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prediction" DOUBLE PRECISION NOT NULL,
    "predictionScaled" DOUBLE PRECISION NOT NULL,
    "priceRangeMin" DOUBLE PRECISION NOT NULL,
    "priceRangeMax" DOUBLE PRECISION NOT NULL,
    "executionTime" DOUBLE PRECISION NOT NULL,
    "inputDataPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LSTMPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GARCHVolatility" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "symbol" VARCHAR(10) NOT NULL,
    "predictionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forecastedVariance" DOUBLE PRECISION NOT NULL,
    "volatilityAnnualized" DOUBLE PRECISION NOT NULL,
    "executionTime" DOUBLE PRECISION NOT NULL,
    "inputDataPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GARCHVolatility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PredictionBatch" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "symbols" TEXT[],
    "totalCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failureCount" INTEGER NOT NULL,
    "totalTime" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionBatch_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."StockPredictionV4" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "symbol" VARCHAR(10) NOT NULL,
    "predictionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "predictedPrice" DOUBLE PRECISION NOT NULL,
    "confidenceInterval" JSONB,
    "modelUsed" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "executionTime" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockPredictionV4_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BatchPredictionV4" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batchId" TEXT NOT NULL,
    "symbols" TEXT[],
    "totalCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failureCount" INTEGER NOT NULL,
    "totalTime" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchPredictionV4_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorProfile_userId_key" ON "public"."InvestorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_ticker_key" ON "public"."Asset"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_userId_name_key" ON "public"."Portfolio"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "public"."Authenticator"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_userId_credentialID_key" ON "public"."Authenticator"("userId", "credentialID");

-- CreateIndex
CREATE INDEX "LSTMPrediction_symbol_predictionDate_idx" ON "public"."LSTMPrediction"("symbol", "predictionDate");

-- CreateIndex
CREATE INDEX "GARCHVolatility_symbol_predictionDate_idx" ON "public"."GARCHVolatility"("symbol", "predictionDate");

-- CreateIndex
CREATE INDEX "PortfolioValuation_portfolioId_date_idx" ON "public"."PortfolioValuation"("portfolioId", "date");

-- CreateIndex
CREATE INDEX "StockPredictionV4_symbol_predictionDate_idx" ON "public"."StockPredictionV4"("symbol", "predictionDate");

-- CreateIndex
CREATE UNIQUE INDEX "BatchPredictionV4_batchId_key" ON "public"."BatchPredictionV4"("batchId");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvestorProfile" ADD CONSTRAINT "InvestorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketData" ADD CONSTRAINT "MarketData_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Portfolio" ADD CONSTRAINT "Portfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PortfolioAllocation" ADD CONSTRAINT "PortfolioAllocation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PortfolioAllocation" ADD CONSTRAINT "PortfolioAllocation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "public"."Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OptimizationResult" ADD CONSTRAINT "OptimizationResult_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Simulation" ADD CONSTRAINT "Simulation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PortfolioValuation" ADD CONSTRAINT "PortfolioValuation_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
