# NSE ML Integration & Data Scraping Implementation Guide

## Overview

This guide covers the integration of machine learning models with the Next.js frontend, utilizing scraped NSE (Nairobi Securities Exchange) data for predictions and portfolio optimization.

## Architecture

```
┌─────────────────┐
│   Next.js App   │
│  (Frontend)     │
└────────┬────────┘
         │
         ├──── /api/ml/predict ────┐
         ├──── /api/ml/predict/batch ─┤
         └──── /api/market-data-live ─┤
                                       │
         ┌─────────────────────────────┘
         │
┌────────▼────────┐     ┌──────────────┐
│   FastAPI ML    │────▶│  PostgreSQL  │
│   Service       │     │   (Prisma)   │
│  (port 8000)    │     │              │
└─────────────────┘     │ - ScrapedData│
         │              │ - Predictions│
         │              └──────────────┘
         │
┌────────▼────────┐
│  LSTM + GARCH   │
│  Trained Models │
└─────────────────┘
```

## Phase 1: Database Setup ✅

### Run Migrations

```bash
# Generate Prisma client with new models
npx prisma generate

# Create migration for new tables
npx prisma migrate dev --name add-nse-ml-integration

# View database
npx prisma studio
```

### New Tables

- `ScrapedMarketData` - Live NSE stock data
- `ScrapedNewsArticle` - News with sentiment analysis
- `MLPrediction` - Model predictions history

## Phase 2: Data Scraping ✅

### TypeScript Scraper (Real-time)

Located: `lib/scrapers/nse-scraper.ts`

```typescript
import { scrapeNSEData, getLatestScrapedData } from '@/lib/scrapers/nse-scraper';

// Scrape and save to database
const data = await scrapeNSEData(['SCOM', 'KEGN', 'EQTY']);

// Get latest from database
const latest = await getLatestScrapedData(['SCOM']);
```

### Python Scraper (Batch Processing)

Located: `scripts/scrapers/nse_scraper.py`

```bash
# Get latest prices
python scripts/scrapers/nse_scraper.py --latest --tickers SCOM KEGN EQTY

# Export for ML training
python scripts/scrapers/nse_scraper.py --export ml/datasets/nse_ml_data.json

# Load all data
python scripts/scrapers/nse_scraper.py
```

### Populate Database (Initial Load)

```bash
# Run this to populate database with historical NSE data
node --loader ts-node/esm scripts/populate-scraped-data.ts
```

## Phase 3: ML Service Setup ✅

### Install Python Dependencies

```bash
cd ml
pip install -r requirements.txt

# Additional dependencies for scraping
pip install beautifulsoup4 selenium playwright
```

### Update requirements.txt

Add to `ml/requirements.txt`:
```txt
fastapi==0.108.0
uvicorn[standard]==0.25.0
pydantic-settings==2.1.0
```

### Start ML Service

```bash
cd ml
uvicorn predict:app --reload --port 8000
```

### Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Model info
curl http://localhost:8000/api/models/info

# Single prediction
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol": "SCOM", "historical_prices": [15.2, 15.4, 15.3, ...]}'

# Batch prediction
curl -X POST http://localhost:8000/api/predict/batch \
  -H "Content-Type: application/json" \
  -d '["SCOM", "KEGN", "EQTY"]'

# Latest NSE prices
curl "http://localhost:8000/api/nse/latest-prices?tickers=SCOM,KEGN,EQTY"
```

## Phase 4: Next.js API Integration ✅

### Environment Variables

Add to `.env`:

```env
# ML Service
ML_SERVICE_URL=http://localhost:8000

# Database (already configured)
DATABASE_URL="postgresql://..."

# Optional: Python path
PYTHON_PATH=/usr/bin/python3
```

### API Endpoints

#### Get Live Market Data
```bash
# Frontend code
const response = await fetch('/api/market-data-live?horizon=1M&tickers=SCOM,KEGN,EQTY');
const data = await response.json();
```

#### ML Prediction
```bash
# Single stock
const prediction = await fetch('/api/ml/predict', {
  method: 'POST',
  body: JSON.stringify({ ticker: 'SCOM', horizon: '1W' })
});

# Batch predictions
const predictions = await fetch('/api/ml/predict/batch', {
  method: 'POST',
  body: JSON.stringify({ tickers: ['SCOM', 'KEGN', 'EQTY'] })
});
```

## Phase 5: Landing Page Updates ✅

The landing page now:
1. Fetches from `/api/market-data-live` (database)
2. Falls back to `/api/market-data` (synthetic) if database is empty
3. Displays data source in console

### Usage

```bash
npm run dev
# Navigate to http://localhost:3000/landing
```

## Phase 6: Background Jobs (Next Steps)

### Cron Job Setup

Create `lib/cron/scraper-jobs.ts`:

```typescript
import { CronJob } from 'cron';
import { scrapeNSEData } from '@/lib/scrapers/nse-scraper';

// Every 30 minutes during market hours (9AM - 4PM EAT, Mon-Fri)
export const nseScraperJob = new CronJob(
  '*/30 9-16 * * 1-5',
  async () => {
    const tickers = ['SCOM', 'KEGN', 'EQTY', 'KCB', 'ABSA'];
    await scrapeNSEData(tickers);
    console.log('NSE data scraped at:', new Date());
  },
  null,
  true,
  'Africa/Nairobi'
);
```

### ML Retraining Pipeline

Create `ml/retraining/scheduler.py`:

```python
from apscheduler.schedulers.blocking import BlockingScheduler
import subprocess

scheduler = BlockingScheduler()

@scheduler.scheduled_job('cron', day_of_week='sun', hour=2)
def weekly_retrain():
    """Retrain models with new NSE data every Sunday at 2 AM"""
    print("Starting weekly model retraining...")
    subprocess.run(['python', 'ml/train_pipeline.py'])
    print("Retraining complete!")

if __name__ == '__main__':
    scheduler.start()
```

Run with:
```bash
python ml/retraining/scheduler.py
```

## Testing

### Unit Tests

```bash
# Test scrapers
npm run test -- lib/scrapers

# Test API routes
npm run test -- app/api/ml

# Test Python scraper
python -m pytest scripts/scrapers/test_nse_scraper.py
```

### Integration Test

```bash
# Full flow test
npm run test:integration
```

## NSE Stock Tickers Reference

Common tickers in the dataset:
- **SCOM** - Safaricom PLC (Telecommunications)
- **KEGN** - KenGen (Energy)
- **EQTY** - Equity Bank (Banking)
- **KCB** - KCB Group (Banking)
- **ABSA** - Absa Bank Kenya (Banking)
- **COOP** - Co-operative Bank (Banking)
- **BAT** - British American Tobacco (Consumer Goods)
- **EABL** - East African Breweries (Consumer Goods)

## Monitoring

### Check Data Freshness

```sql
-- Most recent scraped data
SELECT ticker, MAX(date) as latest_date, MAX("scrapedAt") as last_scrape
FROM "ScrapedMarketData"
GROUP BY ticker
ORDER BY last_scrape DESC;

-- Prediction accuracy
SELECT 
  ticker, 
  AVG(confidence) as avg_confidence,
  COUNT(*) as prediction_count
FROM "MLPrediction"
WHERE "createdAt" > NOW() - INTERVAL '30 days'
GROUP BY ticker;
```

### Health Checks

```bash
# Next.js health
curl http://localhost:3000/api/health

# ML service health
curl http://localhost:8000/health

# Database connection
npx prisma db pull
```

## Troubleshooting

### Issue: ML Service Not Connecting

```bash
# Check if running
ps aux | grep uvicorn

# Check logs
tail -f ml/logs/service.log

# Restart
pkill -f uvicorn
cd ml && uvicorn predict:app --reload
```

### Issue: No Data in Database

```bash
# Check database connection
npx prisma studio

# Manually populate
node scripts/populate-scraped-data.ts

# Check scraper logs
tail -f scripts/data_generator.log
```

### Issue: Predictions Failing

```bash
# Verify model files exist
ls -la ml/trained_models/

# Check preprocessor
ls -la ml/trained_models/*preprocessor*

# Retrain if needed
cd ml && python train_pipeline.py
```

## Next Steps

1. ✅ Complete database schema
2. ✅ Implement NSE scrapers (TypeScript + Python)
3. ✅ Enhance ML service with batch endpoints
4. ✅ Create Next.js API proxy routes
5. ✅ Update landing page to use live data
6. ⏳ Set up cron jobs for periodic scraping
7. ⏳ Implement ML model retraining pipeline
8. ⏳ Add monitoring dashboard
9. ⏳ Deploy to production (Docker + Kubernetes)

## Production Deployment

### Docker Setup

```dockerfile
# ml/Dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "predict:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  nextjs:
    build: .
    ports:
      - "3000:3000"
    environment:
      - ML_SERVICE_URL=http://ml-service:8000
  
  ml-service:
    build: ./ml
    ports:
      - "8000:8000"
    volumes:
      - ./ml/trained_models:/app/trained_models
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: portfolio
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
```

## Support

For issues or questions:
1. Check logs in `scripts/data_generator.log`
2. Review Prisma Studio for database state
3. Test ML service endpoints directly
4. Verify environment variables are set

---

**Note**: This is an active implementation. Some features (cron jobs, retraining) are scaffolded but not fully automated yet. The system currently uses historical CSV data as the source, with plans to integrate real-time NSE API when available.
