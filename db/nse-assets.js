"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssetsFromCSV = getAssetsFromCSV;
function getAssetsFromCSV() {
    var csvPath = path.join(process.cwd(), "ml", "datasets", "NSE_data_stock_market_sectors_2023_2024.csv");
    var csvData = fs.readFileSync(csvPath, "utf-8");
    var lines = csvData.split("\n");
    var assets = [];
    for (var i = 1; i < lines.length; i++) {
        var _a = lines[i].split(","), sector = _a[0], ticker = _a[1], name_1 = _a[2];
        if (sector && ticker && name_1) {
            assets.push({ sector: sector, ticker: ticker, name: name_1 });
        }
    }
    return assets;
}
