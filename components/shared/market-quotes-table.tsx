
import React from 'react';

interface StockSummary {
  symbol: string;
  price: number;
  change: number;
  pct_change: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

interface MarketQuotesTableProps {
  data: StockSummary[];
}

const MarketQuotesTable: React.FC<MarketQuotesTableProps> = ({ data }) => {
  return (
    <div data-testid="market-quotes-table" className="overflow-x-auto relative shadow-md sm:rounded-lg mt-10">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="py-3 px-6">Symbol</th>
            <th scope="col" className="py-3 px-6">Price</th>
            <th scope="col" className="py-3 px-6">Change</th>
            <th scope="col" className="py-3 px-6">% Change</th>
            <th scope="col" className="py-3 px-6">Open</th>
            <th scope="col" className="py-3 px-6">High</th>
            <th scope="col" className="py-3 px-6">Low</th>
            <th scope="col" className="py-3 px-6">Volume</th>
          </tr>
        </thead>
        <tbody>
          {data.map((stock) => (
            <tr key={stock.symbol} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
              <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                {stock.symbol}
              </th>
              <td className="py-4 px-6">{stock.price.toFixed(2)}</td>
              <td className={`py-4 px-6 ${stock.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stock.change.toFixed(2)}
              </td>
              <td className={`py-4 px-6 ${stock.pct_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(stock.pct_change * 100).toFixed(2)}%
              </td>
              <td className="py-4 px-6">{stock.open.toFixed(2)}</td>
              <td className="py-4 px-6">{stock.high.toFixed(2)}</td>
              <td className="py-4 px-6">{stock.low.toFixed(2)}</td>
              <td className="py-4 px-6">{stock.volume}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MarketQuotesTable;
