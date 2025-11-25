/**
 * Calculates the Sharpe Ratio for a given asset.
 * 
 * @param predictedPrice The predicted price of the asset.
 * @param currentPrice The current price of the asset.
 * @param annualizedVolatility The annualized volatility of the asset from the GARCH model.
 * @param riskFreeRate The risk-free rate, defaults to 0.
 * @returns The Sharpe Ratio.
 */
export const calculateSharpeRatio = (
  predictedPrice: number,
  currentPrice: number,
  annualizedVolatility: number,
  riskFreeRate: number = 0
): number => {
  if (currentPrice <= 0 || annualizedVolatility <= 0) {
    return 0;
  }

  const expectedReturn = (predictedPrice - currentPrice) / currentPrice;
  const sharpeRatio = (expectedReturn - riskFreeRate) / annualizedVolatility;

  return sharpeRatio;
};
