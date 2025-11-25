"""
NSE (Nairobi Securities Exchange) Data Scraper
Scrapes live market data from NSE sources and prepares it for ML training
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import os
import sys
import logging

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NSEScraper:
    """Scraper for Nairobi Securities Exchange data"""
    
    NSE_TICKERS = [
        'SCOM', 'KEGN', 'EQTY', 'KCB', 'ABSA', 'COOP', 'SBIC', 'DTK',
        'BAT', 'EABL', 'KUKZ', 'SASN', 'ARM', 'BAMB', 'CARBACID',
        'TOTL', 'KENOL', 'UMME', 'NBK', 'NIC', 'CIC'
    ]
    
    def __init__(self):
        self.data_dir = os.path.join(
            os.path.dirname(__file__), '..', '..', 'ml', 'datasets'
        )
        
    def load_latest_local_data(self, tickers: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Load the most recent NSE data from local CSV files
        
        Args:
            tickers: List of ticker symbols to filter. If None, loads all.
            
        Returns:
            DataFrame with columns: Date, Code, Name, Day Low, Day High, 
                                   Day Price, Previous, Change, Change%, Volume
        """
        if tickers is None:
            tickers = self.NSE_TICKERS
            
        # Load the most recent file
        latest_file = 'NSE_data_all_stocks_2024_jan_to_oct.csv'
        filepath = os.path.join(self.data_dir, latest_file)
        
        logger.info(f"Loading NSE data from {filepath}")
        
        try:
            df = pd.read_csv(filepath)
            
            # Rename columns for consistency
            df.columns = df.columns.str.strip()
            df['DATE'] = pd.to_datetime(df['Date'], format='%d-%b-%Y', errors='coerce')
            df['CODE'] = df['Code']
            df['Day Price'] = pd.to_numeric(df['Day Price'], errors='coerce')
            
            # Filter by tickers if specified
            if tickers:
                df = df[df['CODE'].isin(tickers)]
            
            # Sort by date
            df = df.sort_values(['CODE', 'DATE'])
            
            logger.info(f"Loaded {len(df)} records for {df['CODE'].nunique()} tickers")
            
            return df
            
        except Exception as e:
            logger.error(f"Error loading NSE data: {e}")
            raise
    
    def prepare_for_ml(self, df: pd.DataFrame, sequence_length: int = 60) -> Dict[str, np.ndarray]:
        """
        Prepare NSE data for ML model training/prediction
        
        Args:
            df: DataFrame with NSE stock data
            sequence_length: Number of days to use for sequence
            
        Returns:
            Dictionary with ticker as key and prepared sequences as values
        """
        prepared_data = {}
        
        for ticker in df['CODE'].unique():
            ticker_df = df[df['CODE'] == ticker].copy()
            
            # Calculate returns
            ticker_df['returns'] = ticker_df['Day Price'].pct_change()
            
            # Calculate technical indicators
            ticker_df['SMA_20'] = ticker_df['Day Price'].rolling(window=20).mean()
            ticker_df['SMA_50'] = ticker_df['Day Price'].rolling(window=50).mean()
            ticker_df['volatility'] = ticker_df['returns'].rolling(window=20).std()
            
            # Drop NaN values
            ticker_df = ticker_df.dropna()
            
            if len(ticker_df) >= sequence_length:
                prepared_data[ticker] = {
                    'prices': ticker_df['Day Price'].values,
                    'returns': ticker_df['returns'].values,
                    'dates': ticker_df['DATE'].values,
                    'features': ticker_df[['Day Price', 'SMA_20', 'SMA_50', 'volatility']].values
                }
                logger.info(f"Prepared {len(ticker_df)} samples for {ticker}")
            else:
                logger.warning(f"Insufficient data for {ticker}: {len(ticker_df)} < {sequence_length}")
        
        return prepared_data
    
    def get_latest_prices(self, tickers: Optional[List[str]] = None) -> Dict[str, Dict]:
        """
        Get the most recent price data for specified tickers
        
        Args:
            tickers: List of ticker symbols
            
        Returns:
            Dictionary with ticker info and latest prices
        """
        df = self.load_latest_local_data(tickers)
        
        # Get the most recent date for each ticker
        latest_data = df.sort_values('DATE').groupby('CODE').tail(1)
        
        result = {}
        for _, row in latest_data.iterrows():
            result[row['CODE']] = {
                'ticker': row['CODE'],
                'name': row['Name'],
                'date': row['DATE'].strftime('%Y-%m-%d'),
                'close': float(row['Day Price']),
                'high': float(row.get('Day High', row['Day Price'])),
                'low': float(row.get('Day Low', row['Day Price'])),
                'volume': float(str(row.get('Volume', 0)).replace(',', '')),
                'change_percent': float(str(row.get('Change%', 0)).replace('%', ''))
            }
        
        return result
    
    def export_for_ml_training(self, output_path: str, tickers: Optional[List[str]] = None):
        """
        Export NSE data in format ready for ML training
        
        Args:
            output_path: Path to save the processed data
            tickers: List of ticker symbols to include
        """
        df = self.load_latest_local_data(tickers)
        prepared = self.prepare_for_ml(df)
        
        # Save as JSON for easy loading
        import json
        
        export_data = {
            'tickers': list(prepared.keys()),
            'data': {}
        }
        
        for ticker, data in prepared.items():
            export_data['data'][ticker] = {
                'prices': data['prices'].tolist(),
                'returns': data['returns'].tolist(),
                'dates': [str(d) for d in data['dates']],
            }
        
        with open(output_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        logger.info(f"Exported ML-ready data to {output_path}")


def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Scrape NSE market data')
    parser.add_argument('--tickers', nargs='+', help='Ticker symbols to scrape')
    parser.add_argument('--export', type=str, help='Export path for ML data')
    parser.add_argument('--latest', action='store_true', help='Get latest prices only')
    
    args = parser.parse_args()
    
    scraper = NSEScraper()
    
    if args.latest:
        # Get latest prices
        prices = scraper.get_latest_prices(args.tickers)
        import json
        print(json.dumps(prices, indent=2))
    elif args.export:
        # Export for ML training
        scraper.export_for_ml_training(args.export, args.tickers)
    else:
        # Default: load and display data
        df = scraper.load_latest_local_data(args.tickers)
        print(df.tail(20))


if __name__ == '__main__':
    main()
