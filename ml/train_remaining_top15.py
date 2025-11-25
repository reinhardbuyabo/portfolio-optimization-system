#!/usr/bin/env python3
"""
Train Stock-Specific V4 Models for Remaining Top 15 Stocks

Currently trained (5): SCOM, EQTY, KCB, BAMB, EABL
Need to train (10): ABSA, BRIT, CIC, COOP, DTK, KEGN, KPLC, NBK, NCBA, SCBK, TOTL

This script trains stock-specific LSTM models with log transformations
for the remaining stocks from the top 15 list.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from train_stock_specific_v4_log import train_stock_specific_model
from loguru import logger

# Stocks already trained
TRAINED_STOCKS = ['SCOM', 'EQTY', 'KCB', 'BAMB', 'EABL']

# Top 15 stocks from walk-forward validation
TOP_15_STOCKS = [
    'ABSA', 'KPLC', 'TOTL', 'KCB', 'COOP', 'BRIT', 'KEGN', 'SCOM',
    'CIC', 'NCBA', 'BAMB', 'EABL', 'DTK', 'SCBK', 'NBK'
]

# Stocks that need training
STOCKS_TO_TRAIN = [s for s in TOP_15_STOCKS if s not in TRAINED_STOCKS]

# Sort alphabetically for consistent order
STOCKS_TO_TRAIN.sort()

logger.info(f"Top 15 stocks: {TOP_15_STOCKS}")
logger.info(f"Already trained ({len(TRAINED_STOCKS)}): {TRAINED_STOCKS}")
logger.info(f"Need to train ({len(STOCKS_TO_TRAIN)}): {STOCKS_TO_TRAIN}")


def train_remaining_stocks(stocks=None, dry_run=False):
    """
    Train stock-specific V4 models for remaining top 15 stocks.
    
    Args:
        stocks: List of stock symbols to train (default: all remaining)
        dry_run: If True, only show what would be trained
    """
    if stocks is None:
        stocks = STOCKS_TO_TRAIN
    
    logger.info(f"\n{'='*60}")
    logger.info(f"Training Stock-Specific V4 Models")
    logger.info(f"{'='*60}")
    logger.info(f"Total stocks to train: {len(stocks)}")
    logger.info(f"Stocks: {', '.join(stocks)}")
    
    if dry_run:
        logger.info("\nDRY RUN MODE - No actual training will occur")
        for i, stock in enumerate(stocks, 1):
            logger.info(f"{i}. {stock}")
        return
    
    results = {}
    successful = []
    failed = []
    
    for i, stock in enumerate(stocks, 1):
        logger.info(f"\n{'-'*60}")
        logger.info(f"Training {i}/{len(stocks)}: {stock}")
        logger.info(f"{'-'*60}")
        
        try:
            # Use the train_stock_specific_model function from train_stock_specific_v4_log.py
            result = train_stock_specific_model(
                stock_code=stock,
                prediction_days=60,
                epochs=50,
                batch_size=32,
                early_stopping_patience=10,
                save_model=True
            )
            
            results[stock] = result
            successful.append(stock)
            
            logger.success(f"✓ {stock} training complete!")
            logger.info(f"  Test MAPE: {result.get('test_mape', 'N/A')}")
            logger.info(f"  Sharpe Ratio: {result.get('sharpe_ratio', 'N/A')}")
            
        except Exception as e:
            logger.error(f"✗ {stock} training failed: {e}")
            failed.append(stock)
            results[stock] = {'error': str(e)}
    
    # Summary
    logger.info(f"\n{'='*60}")
    logger.info(f"Training Summary")
    logger.info(f"{'='*60}")
    logger.info(f"Successful: {len(successful)}/{len(stocks)}")
    logger.info(f"Failed: {len(failed)}/{len(stocks)}")
    
    if successful:
        logger.success(f"\nSuccessfully trained: {', '.join(successful)}")
    
    if failed:
        logger.error(f"\nFailed to train: {', '.join(failed)}")
    
    return results


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Train remaining stock-specific V4 models')
    parser.add_argument(
        '--stocks',
        nargs='+',
        help='Specific stocks to train (default: all remaining)',
        default=None
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be trained without actually training'
    )
    parser.add_argument(
        '--list',
        action='store_true',
        help='List stocks that need training and exit'
    )
    
    args = parser.parse_args()
    
    if args.list:
        logger.info("Stocks needing training:")
        for i, stock in enumerate(STOCKS_TO_TRAIN, 1):
            logger.info(f"  {i:2d}. {stock}")
        sys.exit(0)
    
    # Train stocks
    train_remaining_stocks(stocks=args.stocks, dry_run=args.dry_run)
