
import pandas as pd
import numpy as np
import os
import json
import logging
import argparse
from prisma import Prisma
from datetime import datetime

logging.basicConfig(filename='scripts/data_generator.log', level=logging.INFO)

HORIZON_MAP = {
    "1H": 60,
    "1D": 1,
    "3D": 3,
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "1Y": 365,
    "5Y": 365 * 5,
}

def generate_synthetic_data(horizon: str = "1M"):
    """
    Generates synthetic stock market data based on the files in the datasets/ folder.
    """
    logging.info(f"Starting synthetic data generation for horizon: {horizon}")
    datasets_path = os.path.join(os.path.dirname(__file__), '..', 'ml', 'datasets')
    all_files = [os.path.join(datasets_path, f) for f in os.listdir(datasets_path) if f.endswith('.csv')]
    logging.info(f"Found {len(all_files)} CSV files: {all_files}")

    # Exclude sector and other non-stock data
    all_files = [f for f in all_files if 'sectors' not in f and 'daily_sales_french_bakery' not in f]

    if not all_files:
        logging.info("No files to process.")
        return None

    df = pd.concat((pd.read_csv(f) for f in all_files))
    df['DATE'] = pd.to_datetime(df['DATE'])
    df['Day Price'] = pd.to_numeric(df['Day Price'], errors='coerce')
    df.dropna(subset=['Day Price'], inplace=True)

    symbols = df['CODE'].unique()
    logging.info(f"Found {len(symbols)} unique symbols.")

    synthetic_data = {
        "time_series": [],
        "summary": []
    }

    num_days = HORIZON_MAP.get(horizon, 30)

    for symbol in symbols:
        stock_df = df[df['CODE'] == symbol].sort_values('DATE')
        if stock_df.empty:
            continue

        returns = stock_df['Day Price'].pct_change().dropna()
        mean_return = returns.mean()
        std_return = returns.std()
        last_price = stock_df['Day Price'].iloc[-1]

        price_data = []
        previous_close = last_price

        start_date = pd.to_datetime('2025-10-26')
        if horizon == "1H":
            new_dates = pd.to_datetime([start_date + pd.DateOffset(minutes=i) for i in range(num_days + 1)])
        else:
            new_dates = pd.to_datetime([start_date + pd.DateOffset(days=i) for i in range(num_days + 1)])

        for i in range(num_days + 1):
            if i == 0:
                open_price = previous_close
            else:
                open_price = price_data[i-1]['close']

            random_return = np.random.normal(mean_return, std_return)
            close_price = open_price * (1 + random_return)
            high_price = max(open_price, close_price) * (1 + np.random.uniform(0, 0.05))
            low_price = min(open_price, close_price) * (1 - np.random.uniform(0, 0.05))
            volume = np.random.randint(10000, 1000000)

            price_data.append({
                "date": new_dates[i].strftime('%Y-%m-%d'),
                "open": open_price,
                "high": high_price,
                "low": low_price,
                "close": close_price,
                "volume": volume,
                "change": close_price - previous_close,
                "pct_change": (close_price / previous_close - 1)
            })
            previous_close = close_price

        stock_synthetic_data = {
            "symbol": symbol,
            "data": price_data
        }
        synthetic_data["time_series"].append(stock_synthetic_data)

        last_day_data = price_data[-1]
        synthetic_data["summary"].append({
            "symbol": symbol,
            "price": last_day_data['close'],
            "change": last_day_data['change'],
            "pct_change": last_day_data['pct_change'],
            "open": last_day_data['open'],
            "high": last_day_data['high'],
            "low": last_day_data['low'],
            "volume": last_day_data['volume']
        })

    logging.info("Finished synthetic data generation.")
    return synthetic_data

async def persist_synthetic_data(data, horizon):
    if not data:
        logging.info("No data to persist.")
        return

    prisma = Prisma()
    await prisma.connect()

    for stock_data in data['time_series']:
        symbol = stock_data['symbol']
        for daily_data in stock_data['data']:
            date = datetime.strptime(daily_data['date'], '%Y-%m-%d')
            await prisma.scrapedmarketdata.upsert(
                where={
                    'ticker_date_source': {
                        'ticker': symbol,
                        'date': date,
                        'source': f'synthetic_generator_{horizon}'
                    }
                },
                data={
                    'create': {
                        'ticker': symbol,
                        'date': date,
                        'open': daily_data['open'],
                        'high': daily_data['high'],
                        'low': daily_data['low'],
                        'close': daily_data['close'],
                        'volume': daily_data['volume'],
                        'changePercent': daily_data['pct_change'] * 100,
                        'source': f'synthetic_generator_{horizon}'
                    },
                    'update': {
                        'open': daily_data['open'],
                        'high': daily_data['high'],
                        'low': daily_data['low'],
                        'close': daily_data['close'],
                        'volume': daily_data['volume'],
                        'changePercent': daily_data['pct_change'] * 100,
                    }
                }
            )
    await prisma.disconnect()
    logging.info("Finished persisting synthetic data.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--horizon", default="1M", help="Market horizon to generate data for")
    args = parser.parse_args()

    import asyncio
    
    async def main():
        data = generate_synthetic_data(args.horizon)
        if data:
            await persist_synthetic_data(data, args.horizon)
            print(json.dumps(data))

    asyncio.run(main())
