"""
NSE Indices Scraper

Scrapes NASI, N20I, and N25I indices from mystocks.co.ke
"""

import os
from typing import Dict, Any
from .utils import fetch_html, parse_html, save_to_json, load_from_json, clean_number, get_timestamp

MYSTOCKS_URL = "https://live.mystocks.co.ke/"

# Get absolute path to data directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..', '..', 'data', 'nse'))


def parse_index_data(html: str) -> Dict[str, Dict[str, Any]]:
    """
    Parse NSE indices from HTML
    
    Args:
        html: HTML content from mystocks.co.ke
        
    Returns:
        Dictionary of index data with structure:
        {
            'NASI': {'value': 177.72, 'change': 1.33, 'change_percent': 0.75},
            'N20I': {...},
            'N25I': {...}
        }
    """
    soup = parse_html(html)
    indices = {}
    
    indices_div = soup.find('div', id='hpIndices')
    if not indices_div:
        return indices
    
    tables = indices_div.find_all('table')
    for table in tables:
        rows = table.find_all('tr')
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 2:
                # Extract index symbol (e.g., ^NASI)
                symbol_cell = cells[0].text.strip()
                # Clean symbol (remove ^)
                symbol = symbol_cell.replace('^', '')
                
                # Check if data is in separate cells or combined
                if len(cells) >= 4:
                    # Format: Cell 0: Symbol (^NASI), Cell 1: Value (177.72)
                    # Cell 2: Change (1.33), Cell 3: Change % (0.75%)
                    value = clean_number(cells[1].text.strip())
                    change = clean_number(cells[2].text.strip())
                    change_percent_text = cells[3].text.strip().replace('%', '')
                    change_percent = clean_number(change_percent_text)
                else:
                    # Format: Cell 0: Symbol (^NASI), Cell 1: "177.72 1.33 0.75%"
                    data_text = cells[1].text.strip()
                    parts = data_text.split()
                    
                    value = None
                    change = None
                    change_percent = None
                    
                    if len(parts) >= 1:
                        value = clean_number(parts[0])
                    if len(parts) >= 2:
                        change = clean_number(parts[1])
                    if len(parts) >= 3:
                        change_percent_text = parts[2].replace('%', '')
                        change_percent = clean_number(change_percent_text)
                
                if value is not None:
                    indices[symbol] = {
                        'value': value,
                        'change': change if change is not None else 0.0,
                        'change_percent': change_percent if change_percent is not None else 0.0
                    }
    
    return indices


def scrape_indices() -> Dict[str, Any]:
    """
    Scrape NSE indices from mystocks.co.ke
    
    Returns:
        Dictionary containing indices data and metadata:
        {
            'indices': {...},
            'timestamp': '2025-10-22T03:45:00Z',
            'source': 'https://live.mystocks.co.ke/'
        }
    """
    # Try to fetch fresh data
    html = fetch_html(MYSTOCKS_URL)
    
    if not html:
        # On failure, try to load cached data only if not in test environment
        # (test environment doesn't have DATA_DIR setup)
        if os.path.exists(DATA_DIR):
            cached = load_from_json(os.path.join(DATA_DIR, 'indices.json'))
            if cached:
                print("Using cached indices data")
                return cached
        return {
            'indices': {},
            'timestamp': get_timestamp(),
            'error': 'Failed to fetch data and no cache available'
        }
    
    # Parse the data
    indices = parse_index_data(html)
    
    result = {
        'indices': indices,
        'timestamp': get_timestamp(),
        'source': MYSTOCKS_URL
    }
    
    # Save to JSON
    filepath = os.path.join(DATA_DIR, 'indices.json')
    save_to_json(result, filepath)
    
    return result


if __name__ == '__main__':
    print("Scraping NSE indices...")
    data = scrape_indices()
    
    if 'error' in data:
        print(f"Error: {data['error']}")
    else:
        print(f"Scraped {len(data['indices'])} indices")
        for symbol, info in data['indices'].items():
            change_sign = '+' if info['change'] >= 0 else ''
            print(f"  {symbol}: {info['value']:.2f} ({change_sign}{info['change']:.2f}, {change_sign}{info['change_percent']:.2f}%)")
