
"use server";

export async function getAssetPrices(ticker: string): Promise<number[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/historical-data?ticker=${ticker}`);
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || `Failed to fetch historical data for ${ticker}`);
    }
    const data = await res.json();
    return data.historical_prices;
  } catch (error) {
    console.error(`Error fetching historical prices for ${ticker}:`, error);
    return []; // Return empty array on error
  }
}
