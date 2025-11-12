-- CreateTable
CREATE TABLE "public"."ScrapedMarketData" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticker" VARCHAR(10) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" BIGINT NOT NULL,
    "changePercent" DOUBLE PRECISION,
    "marketCap" BIGINT,
    "sector" TEXT,
    "industry" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'nse.co.ke',

    CONSTRAINT "ScrapedMarketData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScrapedNewsArticle" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "sentiment" DOUBLE PRECISION,
    "tickers" TEXT[],
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapedNewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MLPrediction" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticker" VARCHAR(10) NOT NULL,
    "predictionDate" TIMESTAMP(3) NOT NULL,
    "modelType" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "predictedReturn" DOUBLE PRECISION NOT NULL,
    "predictedVolatility" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "horizon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrapedMarketData_ticker_date_idx" ON "public"."ScrapedMarketData"("ticker", "date");

-- CreateIndex
CREATE INDEX "ScrapedMarketData_scrapedAt_idx" ON "public"."ScrapedMarketData"("scrapedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedMarketData_ticker_date_source_key" ON "public"."ScrapedMarketData"("ticker", "date", "source");

-- CreateIndex
CREATE UNIQUE INDEX "ScrapedNewsArticle_url_key" ON "public"."ScrapedNewsArticle"("url");

-- CreateIndex
CREATE INDEX "ScrapedNewsArticle_publishedAt_idx" ON "public"."ScrapedNewsArticle"("publishedAt");

-- CreateIndex
CREATE INDEX "ScrapedNewsArticle_source_idx" ON "public"."ScrapedNewsArticle"("source");

-- CreateIndex
CREATE INDEX "MLPrediction_ticker_predictionDate_idx" ON "public"."MLPrediction"("ticker", "predictionDate");

-- CreateIndex
CREATE INDEX "MLPrediction_modelType_modelVersion_idx" ON "public"."MLPrediction"("modelType", "modelVersion");
