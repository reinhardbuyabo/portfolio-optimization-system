
import pandas as pd
import numpy as np
import os

import json

import logging
import argparse

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
    datasets_path = os.path.join(os.path.dirname(__file__), '..', 'datasets')
    all_files = [os.path.join(datasets_path, f) for f in os.listdir(datasets_path) if f.endswith('.csv')]
    logging.info(f"Found {len(all_files)} CSV files: {all_files}")

    # Exclude sector and other non-stock data
    all_files = [f for f in all_files if 'sectors' not in f and 'daily_sales_french_bakery' not in f]

    if not all_files:
        logging.info("No files to process.")
        return []

    df = pd.concat((pd.read_csv(f) for f in all_files))
    df['DATE'] = pd.to_datetime(df['DATE'])
    df['Day Price'] = pd.to_numeric(df['Day Price'], errors='coerce')
    df.dropna(subset=['Day Price'], inplace=True)

    # Get the list of all unique stock symbols
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

        # Calculate daily returns
        returns = stock_df['Day Price'].pct_change().dropna()

        # Calculate mean and standard deviation of daily returns
        mean_return = returns.mean()
        std_return = returns.std()

        # Get the last closing price
        last_price = stock_df['Day Price'].iloc[-1]

        # Generate a new price series
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

        # Add summary data
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

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--horizon", default="1M", help="Market horizon to generate data for")
    args = parser.parse_args()

    try:
        data = generate_synthetic_data(args.horizon)
        print(json.dumps(data))
    except Exception as e:
        import sys
        logging.error(f"Error generating synthetic data: {e}")
        print(f"Error generating synthetic data: {e}", file=sys.stderr)
