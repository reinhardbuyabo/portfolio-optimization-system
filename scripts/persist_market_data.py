
import pandas as pd
import numpy as np
import os
import json
import logging
import argparse
from prisma import Prisma
from datetime import datetime, timedelta

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

def parse_float(val, default=0.0):
    if pd.isna(val) or val == '-' or val == '':
        return default
    if isinstance(val, (int, float)):
        return float(val)
    return float(str(val).replace(',', ''))

async def generate_and_persist_data(horizon: str = "1M"):
    """
    Generates synthetic stock market data and persists it to the database.
    """
    logging.info(f"Starting synthetic data generation and persistence for horizon: {horizon}")
    datasets_path = os.path.join(os.path.dirname(__file__), '..', 'ml', 'datasets')
    all_files = [os.path.join(datasets_path, f) for f in os.listdir(datasets_path) if f.endswith('.csv')]
    logging.info(f"Found {len(all_files)} CSV files: {all_files}")

    all_files = [f for f in all_files if 'sectors' not in f and 'daily_sales_french_bakery' not in f]

    if not all_files:
        logging.info("No files to process.")
        return

    dfs = []
    for file in all_files:
        try:
            temp_df = pd.read_csv(file)
            if 'Date' in temp_df.columns:
                temp_df['DATE'] = pd.to_datetime(temp_df['Date'], format='%d-%b-%Y', errors='coerce')
            elif 'DATE' in temp_df.columns:
                temp_df['DATE'] = pd.to_datetime(temp_df['DATE'], format='%d-%b-%Y', errors='coerce')
            
            if 'Code' in temp_df.columns:
                temp_df['CODE'] = temp_df['Code']
            if 'Name' in temp_df.columns:
                temp_df['NAME'] = temp_df['Name']
                
            dfs.append(temp_df)
        except Exception as e:
            logging.warning(f"Error reading {file}: {e}")
            continue
    
    df = pd.concat(dfs, ignore_index=True)

    for col in ['Day Price', 'Day High', 'Day Low', 'Volume', 'Previous']:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: parse_float(x, 0.0))

    df['Day Price'] = pd.to_numeric(df['Day Price'], errors='coerce')
    df.dropna(subset=['Day Price', 'DATE'], inplace=True)
    
    df = df.sort_values(['CODE', 'DATE'])
    df = df.groupby('CODE').tail(1000)

    symbols = df['CODE'].unique()
    logging.info(f"Found {len(symbols)} unique symbols.")

    prisma = Prisma()
    await prisma.connect()

    num_days = HORIZON_MAP.get(horizon, 30)
    current_date = pd.to_datetime(pd.Timestamp.now().strftime('%Y-%m-%d'))

    for symbol in symbols:
        stock_df = df[df['CODE'] == symbol].sort_values('DATE')
        if stock_df.empty:
            continue

        latest_date_in_csv = stock_df['DATE'].max()
        
        if latest_date_in_csv < current_date:
            date_range_to_add = pd.date_range(start=latest_date_in_csv + pd.DateOffset(days=1), end=current_date, freq='D')
            
            if not date_range_to_add.empty:
                last_row = stock_df.iloc[-1]
                for single_date in date_range_to_add:
                    last_close = last_row['Day Price']
                    if not isinstance(last_close, (int, float)):
                        last_close = 1.0

                    open_price = last_close * (1 + np.random.uniform(-0.005, 0.005))
                    close_price = open_price * (1 + np.random.uniform(-0.01, 0.01))
                    high_price = max(open_price, close_price) * (1 + np.random.uniform(0, 0.005))
                    low_price = min(open_price, close_price) * (1 - np.random.uniform(0, 0.005))
                    volume = float(last_row.get('Volume', 10000)) * (1 + np.random.uniform(-0.1, 0.1))
                    volume = max(100, int(volume))

                    change = close_price - last_close
                    pct_change = (change / last_close) if last_close != 0 else 0
                    
                    # Persist to database
                    await prisma.scrapedmarketdata.upsert(
                        where={
                            'ticker_date_source': {
                                'ticker': symbol,
                                'date': single_date.to_pydatetime(),
                                'source': 'synthetic_generator'
                            }
                        },
                        data={
                            'create': {
                                'ticker': symbol,
                                'date': single_date.to_pydatetime(),
                                'open': open_price,
                                'high': high_price,
                                'low': low_price,
                                'close': close_price,
                                'volume': int(volume),
                                'changePercent': pct_change * 100,
                                'source': 'synthetic_generator'
                            },
                            'update': {
                                'open': open_price,
                                'high': high_price,
                                'low': low_price,
                                'close': close_price,
                                'volume': int(volume),
                                'changePercent': pct_change * 100,
                            }
                        }
                    )

    await prisma.disconnect()
    logging.info("Finished synthetic data generation and persistence.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--horizon", default="1M", help="Market horizon to generate data for")
    args = parser.parse_args()

    import asyncio
    asyncio.run(generate_and_persist_data(args.horizon))
