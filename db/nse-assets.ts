const fs = require("fs");
const path = require("path");

export function getAssetsFromCSV() {
  const csvPath = path.join(
    process.cwd(),
    "ml",
    "datasets",
    "NSE_data_stock_market_sectors_2023_2024.csv"
  );
  const csvData = fs.readFileSync(csvPath, "utf-8");
  const lines = csvData.split("\n");
  const assets: { ticker: string; name: string; sector: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const [sector, ticker, name] = lines[i].split(",");
    if (sector && ticker && name) {
      assets.push({ sector, ticker, name });
    }
  }

  return assets;
}
