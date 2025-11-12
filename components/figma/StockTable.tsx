import { Stock } from '../types';
import { formatCurrency, formatPercent, formatLargeNumber, getChangeColor } from '../../lib/utils';

interface StockTableProps {
  stocks: Stock[];
  onStockClick?: (symbol: string) => void;
}

export function StockTable({ stocks, onStockClick }: StockTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 text-sm text-muted-foreground">Symbol</th>
            <th className="text-left py-3 px-4 text-sm text-muted-foreground">Name</th>
            <th className="text-left py-3 px-4 text-sm text-muted-foreground">Sector</th>
            <th className="text-right py-3 px-4 text-sm text-muted-foreground">Price</th>
            <th className="text-right py-3 px-4 text-sm text-muted-foreground">Change</th>
            <th className="text-right py-3 px-4 text-sm text-muted-foreground">Volume</th>
            <th className="text-right py-3 px-4 text-sm text-muted-foreground">Market Cap</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => (
            <tr
              key={stock.symbol}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => onStockClick?.(stock.symbol)}
            >
              <td className="py-3 px-4">
                <span className="font-medium text-[#F79D00]">{stock.symbol}</span>
              </td>
              <td className="py-3 px-4">{stock.name}</td>
              <td className="py-3 px-4 text-sm text-muted-foreground">{stock.sector}</td>
              <td className="py-3 px-4 text-right">{formatCurrency(stock.currentPrice)}</td>
              <td className={`py-3 px-4 text-right ${getChangeColor(stock.changePercent)}`}>
                {formatPercent(stock.changePercent)}
              </td>
              <td className="py-3 px-4 text-right text-sm">{formatLargeNumber(stock.volume)}</td>
              <td className="py-3 px-4 text-right text-sm">
                {stock.marketCap ? formatLargeNumber(stock.marketCap) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
