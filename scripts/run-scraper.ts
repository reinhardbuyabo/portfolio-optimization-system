import { scrapeNSEData } from '@/lib/scrapers/stockanalysis-scraper';
import { readFileSync } from 'fs';
import path from 'path';

// This is a placeholder for the actual default_api.firecrawl_scrape function
// In the real environment, this would be provided by the Gemini tool.
declare const default_api: any;

async function runScraper() {
  try {
    const csvFilePath = path.join(process.cwd(), 'ml/datasets/NSE_data_stock_market_sectors_2023_2024.csv');
    const csvContent = readFileSync(csvFilePath, 'utf-8');

    const tickers: string[] = csvContent.split('\n')
      .map(line => line.split(',')[1]) // Get the second column (Stock_code)
      .filter(ticker => ticker && ticker !== 'Stock_code' && !ticker.startsWith('^')); // Filter out header and empty lines and indices

    const markdownContent: { [key: string]: string } = {};

    for (const ticker of tickers) {
      try {
        const url = `https://stockanalysis.com/quote/nase/${ticker.toUpperCase()}/`;
        console.log(`Scraping ${url}...`);
        const response = await default_api.firecrawl_scrape({
          formats: ["markdown"],
          url: url,
        });

        if (response.output && response.output.markdown) {
          markdownContent[ticker.toUpperCase()] = response.output.markdown;
        } else {
          console.warn("No markdown output for", ticker, response);
        }
      } catch (error) {
        console.error("Error scraping data for", ticker, error);
      }
    }

    console.log("Persisting scraped data...");
    const scrapedData = await scrapeNSEData(tickers, markdownContent);
    console.log(`Successfully scraped and persisted ${scrapedData.length} items.`);
  } catch (error) {
    console.error("Error in runScraper:", error);
  }
}

runScraper();
